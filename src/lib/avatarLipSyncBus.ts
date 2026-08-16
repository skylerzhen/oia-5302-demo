import type { Viseme } from '../types'

export interface AvatarLipSyncSnapshot {
  viseme: Viseme
  jawOpen: number
  speaking: boolean
}

type Listener = (snapshot: AvatarLipSyncSnapshot) => void

/** High-frequency lip-sync bus — read in Three.js useFrame, avoid React re-renders. */
class AvatarLipSyncBus {
  private snapshot: AvatarLipSyncSnapshot = { viseme: 'rest', jawOpen: 0, speaking: false }
  private listeners = new Set<Listener>()

  get(): AvatarLipSyncSnapshot {
    return this.snapshot
  }

  set(partial: Partial<AvatarLipSyncSnapshot>) {
    this.snapshot = { ...this.snapshot, ...partial }
    for (const listener of this.listeners) listener(this.snapshot)
  }

  reset() {
    this.set({ viseme: 'rest', jawOpen: 0, speaking: false })
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

export const avatarLipSyncBus = new AvatarLipSyncBus()

export function jawHintForViseme(viseme: Viseme): number {
  if (viseme === 'rest') return 0.04
  if (viseme === 'M') return 0.12
  if (viseme === 'F') return 0.22
  if (viseme === 'E') return 0.38
  if (viseme === 'O') return 0.55
  if (viseme === 'A') return 0.72
  return 0.3
}
