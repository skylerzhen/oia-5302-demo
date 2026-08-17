import { Room, RoomEvent, Track } from 'livekit-client'
import { localAi } from './localAi'

export interface LiveAvatarCredentials {
  sessionId: string
  livekitUrl: string
  livekitClientToken: string
}

let sharedVideo: HTMLVideoElement | null = null
let session: LiveAvatarCredentials | null = null
let room: Room | null = null
let connectPromise: Promise<boolean> | null = null

export function setLiveAvatarVideoElement(element: HTMLVideoElement | null) {
  sharedVideo = element
}

export function getLiveAvatarVideoElement() {
  return sharedVideo
}

export function getLiveAvatarSessionId() {
  return session?.sessionId ?? null
}

export function getLiveAvatarCredentials() {
  return session
}

async function connectLiveKit(credentials: LiveAvatarCredentials) {
  if (!sharedVideo) return false
  if (room?.state === 'connected') return true

  const nextRoom = new Room({ adaptiveStream: true, dynacast: true })
  room = nextRoom

  nextRoom.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === Track.Kind.Video && sharedVideo) {
      track.attach(sharedVideo)
      void sharedVideo.play().catch(() => undefined)
    }
  })

  await nextRoom.connect(credentials.livekitUrl, credentials.livekitClientToken)
  return true
}

export async function ensureLiveAvatarSession(): Promise<boolean> {
  if (session && room?.state === 'connected') return true
  if (connectPromise) return connectPromise

  connectPromise = (async () => {
    try {
      const started = await localAi.liveavatarSessionStart()
      session = {
        sessionId: started.sessionId,
        livekitUrl: started.livekitUrl,
        livekitClientToken: started.livekitClientToken,
      }
      if (!sharedVideo) return true
      await connectLiveKit(session)
      return true
    } catch {
      session = null
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

export async function reconnectLiveAvatarVideo() {
  if (!session || !sharedVideo) return
  await connectLiveKit(session)
}
