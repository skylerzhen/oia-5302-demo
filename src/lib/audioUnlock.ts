/** Shared AudioContext — must be resumed during a user gesture so follow-up TTS can play. */
let sharedCtx: AudioContext | null = null

function ensureSharedContext() {
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new AudioContext()
  }
  return sharedCtx
}

export function unlockAudioPlayback() {
  if (typeof window === 'undefined') return
  const ctx = ensureSharedContext()
  if (ctx.state === 'suspended') {
    void ctx.resume()
  }
  // Short silent buffer — keeps Safari/Chrome autoplay chain alive across async LLM waits.
  try {
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch {
    // Optional warm-up — ignore failures.
  }
}

export function getSharedAudioContext(): AudioContext | null {
  return sharedCtx
}
