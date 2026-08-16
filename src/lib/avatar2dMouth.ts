import type { AvatarLipSyncSnapshot } from './avatarLipSyncBus'

export const AVATAR2D_BASE_SRC = '/avatar/oia-interviewer-base.png'
export const AVATAR2D_TALK_SRC = '/avatar/oia-interviewer-talk.png'

/** Crossfade talk PNG over base — mouth stays on the painted pixels (no SVG overlay). */
export function resolveTalkOpacity(snap: AvatarLipSyncSnapshot): number {
  if (!snap.speaking) return 0

  const jaw = Math.min(1, Math.max(0, snap.jawOpen))
  if (snap.viseme === 'M') return jaw * 0.22
  if (snap.viseme === 'F') return jaw * 0.38
  if (snap.viseme === 'rest') return jaw * 0.52
  if (snap.viseme === 'E') return Math.min(1, jaw * 0.82 + 0.32)
  if (snap.viseme === 'O') return Math.min(1, jaw * 0.88 + 0.38)
  if (snap.viseme === 'A') return Math.min(1, jaw * 0.95 + 0.42)
  return Math.min(1, jaw * 0.75 + 0.28)
}
