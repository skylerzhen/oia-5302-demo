import type { Viseme } from '../types'

/** Demo-only: map characters to approximate viseme shapes (production uses TTS phoneme timing). */
const CHAR_TO_VISEME: Record<string, Viseme> = {
  a: 'A', e: 'E', i: 'E', o: 'O', u: 'O',
  m: 'M', b: 'M', p: 'M',
  f: 'F', v: 'F',
  // Arabic open vowels / alif-like
  ا: 'A', و: 'O', ي: 'E',
}

export function textToVisemes(text: string, language: 'en' | 'ar'): Viseme[] {
  const visemes: Viseme[] = ['rest']
  const chars = text.toLowerCase().split('')
  for (const ch of chars) {
    if (/\s|[.,!?؛،]/.test(ch)) {
      visemes.push('rest')
      continue
    }
    visemes.push(CHAR_TO_VISEME[ch] ?? (language === 'ar' ? 'A' : 'E'))
  }
  visemes.push('rest')
  return visemes
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
