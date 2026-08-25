import type { FollowUpResult } from './localAi'

/** Full-duplex interview (自由麦 · 边听边回) — mic stays open while avatar speaks. */
let duplexEnabled = false

export function setInterviewDuplexMode(enabled: boolean) {
  duplexEnabled = enabled
}

export function isInterviewDuplexMode() {
  return duplexEnabled
}

const BACKCHANNEL_LINES = [
  'I see.',
  'Go on.',
  'Mm-hmm.',
  'Thank you — please continue.',
]

let lastBackchannelAt = 0
let backchannelIndex = 0

export function nextBackchannelLine() {
  const line = BACKCHANNEL_LINES[backchannelIndex % BACKCHANNEL_LINES.length]
  backchannelIndex += 1
  return line
}

export function canPlayBackchannel(cooldownMs = 9000) {
  return Date.now() - lastBackchannelAt >= cooldownMs
}

export function markBackchannelPlayed() {
  lastBackchannelAt = Date.now()
}

export function resetFollowUpPrefetchState() {
  lastPrefetchKey = ''
  lastPrefetchAt = 0
}

export function resetDuplexSession() {
  lastBackchannelAt = 0
  backchannelIndex = 0
  resetFollowUpPrefetchState()
}

export type FollowUpPrefetch = {
  partialKey: string
  promise: Promise<FollowUpResult>
}

/** Limits follow-up LLM prefetch storms while the candidate is still talking. */
const PREFETCH_MIN_GROWTH_CHARS = 28
const PREFETCH_COOLDOWN_MS = 4_000

let lastPrefetchKey = ''
let lastPrefetchAt = 0

export function startFollowUpPrefetch(
  partial: string,
  generate: (answer: string) => Promise<FollowUpResult>,
): FollowUpPrefetch | null {
  const key = partial.trim().slice(0, 120)
  if (key.length < 20) return null

  const now = Date.now()
  if (lastPrefetchKey) {
    const growth = key.length - lastPrefetchKey.length
    const extendsPrior =
      key.startsWith(lastPrefetchKey.slice(0, Math.min(32, lastPrefetchKey.length)))
      || lastPrefetchKey.startsWith(key.slice(0, Math.min(32, key.length)))
    if (extendsPrior && growth < PREFETCH_MIN_GROWTH_CHARS && now - lastPrefetchAt < PREFETCH_COOLDOWN_MS) {
      return null
    }
  }

  lastPrefetchKey = key
  lastPrefetchAt = now
  return {
    partialKey: key,
    promise: generate(key),
  }
}

/** Use prefetch when the final utterance extends the partial we prefetched on. */
export function prefetchMatchesUtterance(prefetch: FollowUpPrefetch | null, utterance: string) {
  if (!prefetch) return false
  const final = utterance.trim().toLowerCase()
  const key = prefetch.partialKey.trim().toLowerCase()
  return final.startsWith(key.slice(0, Math.min(24, key.length))) || key.startsWith(final.slice(0, 24))
}
