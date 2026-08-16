/** Prefer the most natural built-in voices when server neural TTS is unavailable. */
const PREFERRED_VOICE_NAMES = [
  'Google US English',
  'Google UK English Female',
  'Microsoft Aria Online (Natural)',
  'Microsoft Jenny Online (Natural)',
  'Microsoft Aria',
  'Microsoft Jenny',
  'Samantha',
  'Karen',
  'Moira',
  'Tessa',
]

const FEMALE_VOICE_PATTERN =
  /neural|natural|premium|enhanced|online|female|woman|aria|jenny|ava|emma|sonia|samantha|victoria|zira|susan|karen|moira|tessa|fiona|hazel|linda|heather|laura|sara|natasha|michelle/i

function voiceScore(voice: SpeechSynthesisVoice): number {
  const label = `${voice.name} ${voice.voiceURI}`.toLowerCase()
  let score = 0
  for (let i = 0; i < PREFERRED_VOICE_NAMES.length; i += 1) {
    if (voice.name.includes(PREFERRED_VOICE_NAMES[i])) {
      score += 100 - i
    }
  }
  if (/neural|natural|premium|enhanced|online/i.test(label)) score += 40
  if (FEMALE_VOICE_PATTERN.test(label)) score += 20
  if (/male|daniel|david|james|mark|tom|fred|richard|guy|alex/i.test(label)) score -= 30
  if (voice.lang.toLowerCase().startsWith('en')) score += 10
  if (voice.default) score += 5
  return score
}

export function pickSpeechVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null

  const ranked = [...voices].sort((a, b) => voiceScore(b) - voiceScore(a))
  return ranked[0] ?? null
}

export function preloadSpeechVoices(): Promise<void> {
  if (!('speechSynthesis' in window)) return Promise.resolve()

  const existing = window.speechSynthesis.getVoices()
  if (existing.length > 0) return Promise.resolve()

  return new Promise((resolve) => {
    const done = () => {
      window.speechSynthesis.onvoiceschanged = null
      resolve()
    }
    window.speechSynthesis.onvoiceschanged = done
    window.speechSynthesis.getVoices()
    window.setTimeout(done, 1200)
  })
}
