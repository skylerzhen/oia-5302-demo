import { Room, RoomEvent, Track } from 'livekit-client'
import { localAi } from './localAi'
import { withApiAuthBody } from './apiAuth'
import { avatarLipSyncBus } from './avatarLipSyncBus'

export interface LiveAvatarCredentials {
  sessionId: string
  livekitUrl: string
  livekitClientToken: string
}

const API_BASE = import.meta.env.VITE_LLM_API_URL?.replace(/\/$/, '') ?? ''

let videoEl: HTMLVideoElement | null = null
let audioEl: HTMLAudioElement | null = null
let session: LiveAvatarCredentials | null = null
let room: Room | null = null
let connectPromise: Promise<boolean> | null = null
let lastError: string | null = null
let lifecycleInstalled = false
/** Prevents overlapping LiveAvatar speak API calls (root cause of double opening). */
let speakInFlight = false

const LIVEAVATAR_SPEAK_TIMEOUT_MS = 92_000

export function getLiveAvatarLastError() {
  return lastError
}

export function setLiveAvatarVideoElement(element: HTMLVideoElement | null) {
  videoEl = element
  if (element && session) {
    void connectRoom(session).catch(() => undefined)
  }
}

export function getLiveAvatarVideoElement() {
  return videoEl
}

export function getLiveAvatarSessionId() {
  return session?.sessionId ?? null
}

function ensureAudioElement() {
  if (typeof document === 'undefined') return null
  if (!audioEl) {
    audioEl = document.createElement('audio')
    audioEl.autoplay = true
    audioEl.style.display = 'none'
    document.body.appendChild(audioEl)
  }
  return audioEl
}

/** Call on user gesture so LiveKit audio can autoplay later. */
export function primeLiveAvatarAudioPlayback() {
  if (videoEl) {
    videoEl.muted = false
    videoEl.volume = 1
    void videoEl.play().catch(() => undefined)
  }
  const audio = ensureAudioElement()
  if (audio) {
    audio.muted = false
    audio.volume = 1
    void audio.play().catch(() => undefined)
  }
}

function attachTrack(track: Track) {
  if (track.kind === Track.Kind.Video && videoEl) {
    track.attach(videoEl)
    primeLiveAvatarAudioPlayback()
    return
  }
  if (track.kind === Track.Kind.Audio) {
    if (videoEl) {
      track.attach(videoEl)
      primeLiveAvatarAudioPlayback()
      return
    }
    const audio = ensureAudioElement()
    if (audio) {
      track.attach(audio)
      primeLiveAvatarAudioPlayback()
    }
  }
}

function attachAllRemoteTracks(targetRoom: Room) {
  for (const participant of targetRoom.remoteParticipants.values()) {
    for (const publication of participant.trackPublications.values()) {
      if (publication.track) attachTrack(publication.track)
    }
  }
}

function wireRoomEvents(targetRoom: Room) {
  targetRoom.on(RoomEvent.TrackSubscribed, (track) => attachTrack(track))
  targetRoom.on(RoomEvent.TrackPublished, (publication) => {
    if (publication.track) attachTrack(publication.track)
  })
}

async function connectRoom(credentials: LiveAvatarCredentials): Promise<boolean> {
  if (!videoEl) return false

  if (room?.state === 'connected') {
    attachAllRemoteTracks(room)
    primeLiveAvatarAudioPlayback()
    return true
  }

  if (room) {
    try {
      room.disconnect()
    } catch {
      // ignore
    }
    room = null
  }

  const nextRoom = new Room({ adaptiveStream: false, dynacast: false })
  room = nextRoom
  wireRoomEvents(nextRoom)

  try {
    await nextRoom.connect(credentials.livekitUrl, credentials.livekitClientToken)
    attachAllRemoteTracks(nextRoom)
    primeLiveAvatarAudioPlayback()
    return true
  } catch (error) {
    lastError = error instanceof Error ? error.message : 'LiveKit connect failed'
    return false
  }
}

function beaconStopSession(sessionId: string) {
  if (!API_BASE || !sessionId) return
  try {
    void fetch(`${API_BASE}/api/liveavatar/session/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withApiAuthBody({ sessionId })),
      keepalive: true,
    })
  } catch {
    // ignore
  }
}

export function installLiveAvatarLifecycleGuards() {
  if (lifecycleInstalled || typeof window === 'undefined') return
  lifecycleInstalled = true

  window.addEventListener('pagehide', () => {
    const sessionId = session?.sessionId
    if (!sessionId) return
    beaconStopSession(sessionId)
    try {
      room?.disconnect()
    } catch {
      // ignore
    }
    session = null
    room = null
    connectPromise = null
  })
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForFirstVideoFrame(timeoutMs: number) {
  if (videoEl?.videoWidth) return true

  return new Promise<boolean>((resolve) => {
    const video = videoEl
    if (!video) {
      resolve(false)
      return
    }

    const done = (ok: boolean) => {
      clearTimeout(timer)
      video.removeEventListener('loadeddata', onFrame)
      video.removeEventListener('playing', onFrame)
      resolve(ok)
    }

    const onFrame = () => {
      if (video.videoWidth > 0) done(true)
    }

    const timer = window.setTimeout(() => done(video.videoWidth > 0), timeoutMs)
    video.addEventListener('loadeddata', onFrame)
    video.addEventListener('playing', onFrame)
    onFrame()
  })
}

/** Session + LiveKit video ready before speak (avoids burning credits on a dead stream). */
export async function prepareLiveAvatarForSpeech(timeoutMs = 20_000): Promise<boolean> {
  lastError = null
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (!videoEl) {
      await sleep(50)
      continue
    }

    const sessionOk = await ensureLiveAvatarSession()
    if (!sessionOk) return false

    if (videoEl.videoWidth > 0) return true

    await waitForFirstVideoFrame(Math.min(2_000, deadline - Date.now()))
    if (videoEl.videoWidth > 0) return true

    await sleep(150)
  }

  lastError = 'LiveAvatar video not ready'
  return false
}

export async function ensureLiveAvatarSession(): Promise<boolean> {
  if (session && room?.state === 'connected') return true
  if (connectPromise) return connectPromise

  connectPromise = (async () => {
    lastError = null
    try {
      if (!session) {
        const started = await localAi.liveavatarSessionStart()
        session = {
          sessionId: started.sessionId,
          livekitUrl: started.livekitUrl,
          livekitClientToken: started.livekitClientToken,
        }
      }
      if (videoEl) {
        const connected = await connectRoom(session)
        if (!connected) return false
      }
      return true
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'LiveAvatar session failed'
      session = null
      try {
        room?.disconnect()
      } catch {
        // ignore
      }
      room = null
      return false
    } finally {
      connectPromise = null
    }
  })()

  return connectPromise
}

export async function stopLiveAvatarSession() {
  const sessionId = session?.sessionId
  session = null
  connectPromise = null
  lastError = null

  try {
    room?.disconnect()
  } catch {
    // ignore
  }
  room = null

  if (sessionId) {
    await localAi.liveavatarSessionStop({ sessionId }).catch(() => undefined)
  }
}

/** Drop cached session so the next speak reconnects (Render load-balancer safe). */
export async function resetLiveAvatarSession() {
  await stopLiveAvatarSession()
}

export async function reconnectLiveAvatarVideo() {
  if (!session || !videoEl) return false
  return connectRoom(session)
}

export function liveAvatarVideoReady() {
  return Boolean(videoEl && videoEl.videoWidth > 0)
}

function liveAvatarMediaPlaying(
  audio: HTMLAudioElement | null,
  video: HTMLVideoElement | null,
) {
  const audioPlaying = Boolean(audio && !audio.paused && !audio.ended && audio.currentTime > 0)
  const videoPlaying = Boolean(video && !video.paused && !video.ended && video.currentTime > 0)
  return audioPlaying || videoPlaying
}

/** Wait until LiveKit-synced LiveAvatar audio finishes (lip-sync stays on video track). */
export async function waitForLiveAvatarPlayback(timeoutMs = 120_000, signal?: AbortSignal) {
  const audio = ensureAudioElement()
  const video = videoEl
  if (!audio && !video) return

  const deadline = Date.now() + timeoutMs
  const startDeadline = Date.now() + 10_000

  while (Date.now() < startDeadline) {
    if (signal?.aborted) {
      throw new DOMException('Speech interrupted', 'AbortError')
    }
    if (liveAvatarMediaPlaying(audio, video)) break
    await sleep(100)
  }

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new DOMException('Speech interrupted', 'AbortError')
    }

    if (!liveAvatarMediaPlaying(audio, video)) {
      await sleep(250)
      if (!liveAvatarMediaPlaying(audio, video)) return
    }

    await sleep(120)
  }
}

function waitForAbort(ms: number, signal?: AbortSignal) {
  return new Promise<null>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Speech interrupted', 'AbortError'))
      return
    }
    const timer = window.setTimeout(() => resolve(null), ms)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(new DOMException('Speech interrupted', 'AbortError'))
    }, { once: true })
  })
}

/**
 * Send one speak command to LiveAvatar and wait for playback — never call twice for the same line.
 */
export async function speakLiveAvatarOnce(text: string, signal?: AbortSignal): Promise<boolean> {
  if (speakInFlight) return false
  speakInFlight = true

  try {
    primeLiveAvatarAudioPlayback()
    const ready = await prepareLiveAvatarForSpeech(20_000)
    if (!ready) return false

    const sessionId = getLiveAvatarSessionId()
    if (!sessionId) return false

    avatarLipSyncBus.set({ speaking: true, viseme: 'rest', jawOpen: 0 })

    const result = await Promise.race([
      localAi.liveavatarSpeak({ sessionId, text }),
      waitForAbort(LIVEAVATAR_SPEAK_TIMEOUT_MS, signal),
    ])
    if (!result?.ok) return false

    // Server already waits for agent.speak_ended over WebSocket — do not poll the
    // LiveKit video element (idle stream always looks "playing").
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    return false
  } finally {
    avatarLipSyncBus.set({ viseme: 'rest', jawOpen: 0, speaking: false })
    speakInFlight = false
  }
}
