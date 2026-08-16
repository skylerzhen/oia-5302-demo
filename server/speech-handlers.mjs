import { synthesizeEdgeTts } from './edge-tts.mjs'
import { openAiTtsConfigured, synthesizeOpenAiTts } from './openai-tts.mjs'

async function loadAzureTts() {
  return import('./azure-tts.mjs')
}

async function loadAzureAsr() {
  return import('./azure-asr.mjs')
}

function azureConfigured() {
  return Boolean(process.env.AZURE_SPEECH_KEY?.trim() && process.env.AZURE_SPEECH_REGION?.trim())
}

function voiceForAzure() {
  return process.env.AZURE_SPEECH_VOICE_EN?.trim() || 'en-US-JennyNeural'
}

function estimateDurationMs(text) {
  return Math.max(1400, text.length * 78)
}

function buildEstimatedVisemeMarks(text) {
  const charToViseme = {
    a: 'A', e: 'E', i: 'E', o: 'O', u: 'O', m: 'M', b: 'M', p: 'M', f: 'F', v: 'F',
  }
  const visemes = ['rest']
  for (const ch of text.toLowerCase()) {
    if (/\s|[.,!?]/.test(ch)) visemes.push('rest')
    else visemes.push(charToViseme[ch] ?? 'E')
  }
  visemes.push('rest')
  const durationMs = estimateDurationMs(text)
  const slice = Math.max(durationMs / visemes.length, 60)
  return visemes.map((viseme, index) => ({
    timeMs: Math.round(index * slice),
    viseme,
  }))
}

export async function handleSynthesize(body) {
  const text = String(body.text ?? '').trim()
  if (!text) throw new Error('Text is required for TTS')

  const estimatedMarks = buildEstimatedVisemeMarks(text)

  if (azureConfigured()) {
    const { buildSsml, synthesizeAzureWithVisemes } = await loadAzureTts()
    const region = process.env.AZURE_SPEECH_REGION.trim()
    const key = process.env.AZURE_SPEECH_KEY.trim()
    const voice = voiceForAzure()
    const ssml = buildSsml(text, 'en', voice)

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

  try {
    if (openAiTtsConfigured()) {
      const openai = await synthesizeOpenAiTts(text)
      return {
        mode: 'model',
        text,
        audioAvailable: true,
        audioBase64: openai.audioBuffer.toString('base64'),
        mimeType: openai.mimeType,
        visemeMarks: estimatedMarks,
        visemeSource: 'estimated',
        ttsProvider: 'openai',
      }
    }

    const edge = await synthesizeEdgeTts(text)
    return {
      mode: 'model',
      text,
      audioAvailable: true,
      audioBase64: edge.audioBuffer.toString('base64'),
      mimeType: edge.mimeType,
      visemeMarks: estimatedMarks,
      visemeSource: 'estimated',
      ttsProvider: 'edge',
    }
  } catch (error) {
    console.warn('[speech] Edge TTS failed, falling back to browser:', error)
    return {
      mode: 'browser',
      text,
      audioAvailable: false,
      useBrowserTts: true,
      visemeMarks: estimatedMarks,
      visemeSource: 'estimated',
    }
  }
}

export async function handleTranscribe(body) {
  const transcript = String(body.transcript ?? body.text ?? '').trim()
  const pcmBase64 = String(body.pcmBase64 ?? body.audioPcmBase64 ?? '').trim()
  const sampleRate = Number(body.sampleRate ?? 16000) || 16000

  if (pcmBase64 && azureConfigured()) {
    const { transcribeAzurePcm16 } = await loadAzureAsr()
    const pcmBuffer = Buffer.from(pcmBase64, 'base64')
    const text = await transcribeAzurePcm16({
      key: process.env.AZURE_SPEECH_KEY.trim(),
      region: process.env.AZURE_SPEECH_REGION.trim(),
      language: 'en',
      pcmBuffer,
      sampleRate,
    })
    return { mode: 'model', transcript: text, asrProvider: 'azure' }
  }

  if (transcript) {
    return { mode: 'browser', transcript, asrProvider: 'browser' }
  }

  throw new Error('Send pcmBase64 for Azure ASR or transcript for browser ASR fallback.')
}

export function speechAvailability() {
  const azure = azureConfigured()
  const openai = openAiTtsConfigured()
  return {
    tts: true,
    asr: true,
    ttsProvider: azure ? 'azure' : openai ? 'openai' : 'edge',
    asrProvider: azure ? 'azure' : 'browser',
    visemeSource: azure ? 'azure-sdk' : 'estimated',
  }
}
