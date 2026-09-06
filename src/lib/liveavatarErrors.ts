/** User-facing LiveAvatar connection errors */

export const LIVEAVATAR_CREDITS_MESSAGE =
  'LiveAvatar 账户余额不足，无法建立数字人视频会话。请在 app.liveavatar.com 充值或开启超额计费后重试。'

export const LIVEAVATAR_VIDEO_TIMEOUT_MESSAGE =
  'LiveAvatar 视频加载超时。云端首次连接可能需要 30–60 秒，请点击「Reconnect video」或「Start interview」再试；若仍失败，请检查网络是否允许 WebRTC（LiveKit）。'

export const LIVEAVATAR_LIVEKIT_MESSAGE =
  '浏览器无法连接 LiveAvatar 视频流（LiveKit/WebRTC）。请换 Chrome/Edge、关闭广告拦截、允许麦克风，或尝试更稳定的网络/VPN 后重试。'

export const LIVEAVATAR_CLIENT_DISCONNECT_MESSAGE =
  'LiveAvatar 视频连接被中断。请点击 Reconnect video，或 Restart interview 重新开始。'

export const LIVEAVATAR_GENERIC_MESSAGE =
  'LiveAvatar 视频尚未就绪。请点击 Reconnect video 或重新开始面试；若刚开启超额计费，请先 Ctrl+Shift+R 强制刷新页面。'

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
