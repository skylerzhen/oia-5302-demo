import type { Viseme } from '../types'

/** Demo phoneme → mouth shape (production uses TTS viseme events). */
const CHAR_TO_VISEME: Record<string, Viseme> = {
  a: 'A', e: 'E', i: 'E', o: 'O', u: 'O', y: 'E',
  m: 'M', b: 'M', p: 'M',
  f: 'F', v: 'F', w: 'O',
  // Arabic vowels / labials
  ا: 'A', آ: 'A', أ: 'A', إ: 'E', ء: 'rest',
  و: 'O', ي: 'E', ى: 'E',
  م: 'M', ب: 'M', ف: 'F', پ: 'F',
}

const OPEN_VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y', 'ا', 'آ', 'أ', 'و', 'ي'])

function visemeForChar(ch: string, language: 'en' | 'ar'): Viseme {
  if (/\s|[.,!?؛،:;'"()-]/.test(ch)) return 'rest'
  const mapped = CHAR_TO_VISEME[ch] ?? CHAR_TO_VISEME[ch.toLowerCase()]
  if (mapped) return mapped
  if (language === 'ar') return 'A'
  return 'E'
}

/** Collapse identical neighbours but repeat open vowels for visible shape holds. */
export function textToVisemes(text: string, language: 'en' | 'ar'): Viseme[] {
  const out: Viseme[] = ['rest']
  for (const ch of text) {
    const v = visemeForChar(ch, language)
    if (v === 'rest') {
      if (out[out.length - 1] !== 'rest') out.push('rest')
      continue
    }
    const prev = out[out.length - 1]
    if (v !== prev) out.push(v)
    else if (OPEN_VOWELS.has(ch.toLowerCase())) out.push(v)
  }
  if (out[out.length - 1] !== 'rest') out.push('rest')
  return out
}

export async function playVisemeSequence(
  visemes: Viseme[],
  onViseme: (v: Viseme) => void,
  msPerViseme = 95,
): Promise<void> {
  for (const v of visemes) {
    onViseme(v)
    await new Promise((r) => setTimeout(r, msPerViseme))
  }
  onViseme('rest')
}
