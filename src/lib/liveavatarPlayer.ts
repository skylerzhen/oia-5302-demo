import { Room, RoomEvent, Track } from 'livekit-client'
import { localAi } from './localAi'
import { withApiAuthBody } from './apiAuth'
import { avatarLipSyncBus } from './avatarLipSyncBus'
import { isInterviewDuplexMode } from './freeMicDuplex'

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
const MAX_RECONNECT_ATTEMPTS = 8
const RECONNECT_BASE_MS = 400
const RECONNECT_MAX_MS = 30_000

let reconnectAttempts = 0
let reconnectTimer: number | null = null
let reconnectPaused = false

export function isLiveAvatarReconnectPaused() {
  return reconnectPaused
}

function clearReconnectTimer() {
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

function resetReconnectState() {
  reconnectAttempts = 0
  reconnectPaused = false
  clearReconnectTimer()
}

function scheduleLiveKitReconnect() {
  if (reconnectPaused || !session || !videoEl) return

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    reconnectPaused = true
    lastError = 'LiveAvatar reconnect limit reached — restart the interview or refresh the page.'
    return
  }

  clearReconnectTimer()
  const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempts, RECONNECT_MAX_MS)
  reconnectAttempts += 1

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    if (!session || reconnectPaused) return
    void connectRoom(session).then((ok) => {
      if (ok) {
        resetReconnectState()
        return
      }
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        reconnectPaused = true
        lastError = 'LiveAvatar reconnect limit reached — restart the interview or refresh the page.'
        return
      }
      scheduleLiveKitReconnect()
    })
  }, delay)
}

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

/** Mute LiveKit output during gaps / candidate TTS so streams do not overlap. */
export function setLiveAvatarOutputMuted(muted: boolean) {
  if (videoEl) videoEl.muted = muted
  if (audioEl) audioEl.muted = muted
}

/** Pause LiveKit output without tearing down the session. */
export function pauseLiveAvatarOutput() {
  setLiveAvatarOutputMuted(true)
}

/** Lower avatar volume while the candidate speaks (duplex ducking). */
export function duckLiveAvatarOutput() {
  if (videoEl) {
    videoEl.muted = false
    videoEl.volume = 0.18
  }
  if (audioEl) {
    audioEl.muted = false
    audioEl.volume = 0.18
  }
}

export function restoreLiveAvatarOutput() {
  if (videoEl) {
    videoEl.muted = false
    videoEl.volume = 1
  }
  if (audioEl) {
    audioEl.muted = false
    audioEl.volume = 1
  }
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
  targetRoom.on(RoomEvent.Reconnected, () => {
    attachAllRemoteTracks(targetRoom)
    primeLiveAvatarAudioPlayback()
  })
  targetRoom.on(RoomEvent.Disconnected, () => {
    if (!session || !videoEl || reconnectPaused) return
    scheduleLiveKitReconnect()
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
    resetReconnectState()
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
  if (session && room?.state === 'connected' && videoEl && videoEl.videoWidth > 0) return true
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
      } else if (room?.state !== 'connected') {
        try {
          room?.disconnect()
        } catch {
          // ignore
        }
        room = null
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
  resetReconnectState()

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

/** Reconnect LiveKit or recycle the server session when video drops mid-interview. */
export async function refreshLiveAvatarSession(): Promise<boolean> {
  if (!videoEl) return false
  if (reconnectPaused) {
    lastError = lastError ?? 'LiveAvatar reconnect paused — restart the interview.'
    return false
  }

  if (room?.state === 'connected') {
    attachAllRemoteTracks(room)
    primeLiveAvatarAudioPlayback()
    if (videoEl.videoWidth > 0) return true
  }

  if (session) {
    try {
      room?.disconnect()
    } catch {
      // ignore
    }
    room = null
    if (await connectRoom(session) && videoEl.videoWidth > 0) return true
  }

  const oldSessionId = session?.sessionId
  session = null
  room = null
  connectPromise = null

  if (oldSessionId) {
    await localAi.liveavatarSessionStop({ sessionId: oldSessionId }).catch(() => undefined)
  }

  return ensureLiveAvatarSession()
}

export function liveAvatarVideoHealthy() {
  return Boolean(videoEl && videoEl.videoWidth > 0 && room?.state === 'connected')
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
    restoreLiveAvatarOutput()
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
    if (result?.ok) return true

    await refreshLiveAvatarSession()
    const sessionId2 = getLiveAvatarSessionId()
    if (!sessionId2) return false

    const retry = await Promise.race([
      localAi.liveavatarSpeak({ sessionId: sessionId2, text }),
      waitForAbort(LIVEAVATAR_SPEAK_TIMEOUT_MS, signal),
    ])
    return Boolean(retry?.ok)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    return false
  } finally {
    avatarLipSyncBus.set({ viseme: 'rest', jawOpen: 0, speaking: false })
    if (isInterviewDuplexMode()) restoreLiveAvatarOutput()
    else pauseLiveAvatarOutput()
    speakInFlight = false
  }
}
