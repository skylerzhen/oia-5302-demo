import { EdgeTTS } from 'edge-tts-universal'

/** Microsoft Edge neural voice — no API key; natural prosody (used by many video tools). */
export const DEFAULT_EDGE_VOICE =
  process.env.EDGE_TTS_VOICE_EN?.trim() || 'en-US-AvaMultilingualNeural'

export async function synthesizeEdgeTts(text, voice = DEFAULT_EDGE_VOICE) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) throw new Error('Text is required for Edge TTS')

  const tts = new EdgeTTS(trimmed, voice)
  const result = await tts.synthesize()
  const arrayBuffer = await result.audio.arrayBuffer()

  return {
    audioBuffer: Buffer.from(arrayBuffer),
    mimeType: 'audio/mpeg',
    voice,
  }
}
