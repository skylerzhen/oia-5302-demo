/** User-facing LiveAvatar connection errors (English only — UIS demo catalogue). */

export const LIVEAVATAR_CREDITS_MESSAGE =
  'LiveAvatar credits are exhausted — add credits or enable overage billing at app.liveavatar.com, then retry.'

export const LIVEAVATAR_VIDEO_TIMEOUT_MESSAGE =
  'LiveAvatar video timed out. First connect can take 30–60 seconds — click Reconnect video or Start interview again. If it persists, check WebRTC (LiveKit) on your network.'

export const LIVEAVATAR_LIVEKIT_MESSAGE =
  'The browser could not connect to LiveAvatar video (LiveKit/WebRTC). Try Chrome or Edge, disable ad blockers, allow microphone access, or use a stable network/VPN.'

export const LIVEAVATAR_CLIENT_DISCONNECT_MESSAGE =
  'LiveAvatar video disconnected. Click Reconnect video or Restart interview to begin again.'

export const LIVEAVATAR_GENERIC_MESSAGE =
  'LiveAvatar video is not ready. Click Reconnect video or restart the interview. After billing changes, hard-refresh the page (Ctrl+Shift+R).'

export function isLiveAvatarCreditsError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('no credits')
    || (lower.includes('credit') && (lower.includes('403') || lower.includes('available')))
    || (lower.includes('403') && lower.includes('session'))
  )
}

function isLiveAvatarVideoTimeoutError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('video not ready') || lower.includes('video reconnect failed')
}

function isLiveAvatarLiveKitError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes('livekit')
    || lower.includes('webrtc')
    || lower.includes('pc connection')
    || lower.includes('could not establish')
    || lower.includes('signal connection')
  )
}

function isLiveAvatarClientDisconnectError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('client initiated disconnect') || lower.includes('user initiated disconnect')
}

export function formatLiveAvatarError(raw: string | null | undefined): string {
  if (!raw) return LIVEAVATAR_GENERIC_MESSAGE
  if (isLiveAvatarCreditsError(raw)) return LIVEAVATAR_CREDITS_MESSAGE
  if (isLiveAvatarClientDisconnectError(raw)) return LIVEAVATAR_CLIENT_DISCONNECT_MESSAGE
  if (isLiveAvatarVideoTimeoutError(raw)) return LIVEAVATAR_VIDEO_TIMEOUT_MESSAGE
  if (isLiveAvatarLiveKitError(raw)) return LIVEAVATAR_LIVEKIT_MESSAGE
  return raw
}
