import { EdgeTTS } from 'edge-tts-universal/browser'

export const EDGE_VOICE_EN =
  import.meta.env.VITE_EDGE_TTS_VOICE?.trim() || 'en-US-AndrewMultilingualNeural'

/** Browser-side Edge neural TTS — same voice family as cached opening MP3. */
export async function synthesizeEdgeTtsBrowser(text: string): Promise<Blob | null> {
  const trimmed = text.trim()
  if (!trimmed) return null

  try {
    const tts = new EdgeTTS(trimmed, EDGE_VOICE_EN)
    const result = await tts.synthesize()
    return result.audio?.size ? result.audio : null
  } catch {
    return null
  }
}
