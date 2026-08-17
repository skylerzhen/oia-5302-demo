export function openAiTtsConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim())
}

/** OpenAI tts-1 — low latency, very natural (used when OPENAI_API_KEY is set on the API host). */
export async function synthesizeOpenAiTts(text) {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('OPENAI_API_KEY is not configured')

  const voice = process.env.OPENAI_TTS_VOICE?.trim() || 'shimmer'
  const model = process.env.OPENAI_TTS_MODEL?.trim() || 'tts-1'

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      response_format: 'mp3',
      speed: 1.0,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`OpenAI TTS failed (${response.status}): ${detail}`)
  }

  return {
    audioBuffer: Buffer.from(await response.arrayBuffer()),
    mimeType: 'audio/mpeg',
    voice,
    model,
  }
}

/** PCM s16le 24 kHz mono — required by LiveAvatar Lite agent.speak. */
export async function synthesizeOpenAiTtsPcm(text) {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('OPENAI_API_KEY is not configured')

  const voice = process.env.OPENAI_TTS_VOICE?.trim() || 'shimmer'
  const model = process.env.OPENAI_TTS_MODEL?.trim() || 'tts-1'

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      response_format: 'pcm',
      speed: 1.0,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`OpenAI TTS PCM failed (${response.status}): ${detail}`)
  }

  return {
    audioBuffer: Buffer.from(await response.arrayBuffer()),
    mimeType: 'audio/pcm',
    sampleRate: 24_000,
    voice,
    model,
  }
}
