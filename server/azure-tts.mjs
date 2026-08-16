import sdk from 'microsoft-cognitiveservices-speech-sdk'
import { azureVisemeEventsToMarks } from './azure-viseme-map.mjs'

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Synthesize SSML with Azure Speech SDK and collect viseme boundary events.
 * Returns MP3 audio + production viseme marks (audioOffset-synchronized).
 */
export async function synthesizeAzureWithVisemes({ key, region, voice, ssml }) {
  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region)
  speechConfig.speechSynthesisVoiceName = voice
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3

  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null)
  const visemeEvents = []

  synthesizer.visemeReceived = (_sender, event) => {
    visemeEvents.push({
      audioOffset: event.audioOffset,
      visemeId: event.visemeId,
    })
  }

  try {
    const result = await new Promise((resolve, reject) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (speechResult) => {
          if (speechResult.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(speechResult)
            return
          }
          const detail = sdk.SpeechSynthesisCancellationDetails.fromResult(speechResult)
          reject(new Error(`Azure synthesis failed: ${detail.errorDetails || speechResult.reason}`))
        },
        (error) => reject(error instanceof Error ? error : new Error(String(error))),
      )
    })

    const audioBuffer = Buffer.from(result.audioData)
    const visemeMarks = azureVisemeEventsToMarks(visemeEvents)

    return {
      audioBuffer,
      visemeMarks,
      visemeSource: visemeMarks.length > 0 ? 'azure' : 'estimated',
      mimeType: 'audio/mpeg',
    }
  } finally {
    synthesizer.close()
  }
}

export function buildSsml(text, language, voice) {
  const lang = language === 'ar' ? 'ar-OM' : 'en-US'
  return `<speak version="1.0" xml:lang="${lang}"><voice name="${voice}">${escapeXml(text)}</voice></speak>`
}
