import { INTERVIEW_PRESET } from '../data/questions'

export const OPENING_PRESET_TEXT = INTERVIEW_PRESET[0].text
export const OPENING_AUDIO_URL = '/demo-audio/opening-en.mp3'

export function isOpeningPresetText(text: string) {
  return text.trim() === OPENING_PRESET_TEXT
}
