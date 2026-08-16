import { buildSsml, synthesizeAzureWithVisemes } from './azure-tts.mjs'

function azureConfigured() {
  return Boolean(process.env.AZURE_SPEECH_KEY?.trim() && process.env.AZURE_SPEECH_REGION?.trim())
}

function voiceFor(language) {
  return language === 'ar'
    ? (process.env.AZURE_SPEECH_VOICE_AR ?? 'ar-OM-AyshaNeural')
    : (process.env.AZURE_SPEECH_VOICE_EN ?? 'en-US-JennyNeural')
}

function estimateDurationMs(text, language) {
  return Math.max(1400, text.length * (language === 'ar' ? 88 : 78))
}

function buildEstimatedVisemeMarks(text, language) {
  const charToViseme = {
    a: 'A', e: 'E', i: 'E', o: 'O', u: 'O', m: 'M', b: 'M', p: 'M', f: 'F', v: 'F',
    ا: 'A', و: 'O', ي: 'E',
  }
  const visemes = ['rest']
  for (const ch of text.toLowerCase()) {
    if (/\s|[.,!?؛،]/.test(ch)) visemes.push('rest')
    else visemes.push(charToViseme[ch] ?? (language === 'ar' ? 'A' : 'E'))
  }
  visemes.push('rest')
  const durationMs = estimateDurationMs(text, language)
  const slice = Math.max(durationMs / visemes.length, 60)
  return visemes.map((viseme, index) => ({
    timeMs: Math.round(index * slice),
    viseme,
  }))
}

export async function handleSynthesize(body) {
  const text = String(body.text ?? '').trim()
  const language = body.language === 'ar' ? 'ar' : 'en'
  if (!text) throw new Error('Text is required for TTS')

  const estimatedMarks = buildEstimatedVisemeMarks(text, language)

  if (!azureConfigured()) {
    return {
      mode: 'browser',
      text,
      audioAvailable: false,
      useBrowserTts: true,
      visemeMarks: estimatedMarks,
      visemeSource: 'estimated',
    }
  }

  const region = process.env.AZURE_SPEECH_REGION.trim()
  const key = process.env.AZURE_SPEECH_KEY.trim()
  const voice = voiceFor(language)
  const ssml = buildSsml(text, language, voice)

  try {
    const azure = await synthesizeAzureWithVisemes({ key, region, voice, ssml })
    const marks = azure.visemeMarks.length > 0 ? azure.visemeMarks : estimatedMarks

    return {
      mode: 'model',
      text,
      audioAvailable: true,
      audioBase64: azure.audioBuffer.toString('base64'),
      mimeType: azure.mimeType,
      visemeMarks: marks,
      visemeSource: azure.visemeSource,
    }
  } catch (error) {
    console.warn('[speech] Azure SDK viseme synthesis failed, falling back to REST TTS:', error)

    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
      },
      body: ssml,
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`Azure TTS failed (${response.status}): ${detail}`)
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer())
    return {
      mode: 'model',
      text,
      audioAvailable: true,
      audioBase64: audioBuffer.toString('base64'),
      mimeType: 'audio/mpeg',
      visemeMarks: estimatedMarks,
      visemeSource: 'estimated',
    }
  }
}

export async function handleTranscribe(body) {
  const transcript = String(body.transcript ?? body.text ?? '').trim()
  if (transcript) {
    return { mode: 'browser', transcript }
  }
  throw new Error('Browser speech recognition should send transcript text for demo ASR fallback.')
}

export function speechAvailability() {
  const azure = azureConfigured()
  return {
    tts: true,
    asr: true,
    ttsProvider: azure ? 'azure' : 'browser',
    asrProvider: 'browser',
    visemeSource: azure ? 'azure-sdk' : 'estimated',
  }
}
