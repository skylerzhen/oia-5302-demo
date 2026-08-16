/** Shared AudioContext — must be resumed during a user gesture so follow-up TTS can play. */
let sharedCtx: AudioContext | null = null

export function unlockAudioPlayback() {
  if (typeof window === 'undefined') return
  if (!sharedCtx) {
    sharedCtx = new AudioContext()
  }
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume()
  }
}

export function getSharedAudioContext(): AudioContext | null {
  return sharedCtx
}
