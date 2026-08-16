import sdk from 'microsoft-cognitiveservices-speech-sdk'

function localeFor(language) {
  return language === 'ar' ? 'ar-OM' : 'en-US'
}

/**
 * Recognize one utterance from 16-bit PCM mono (typically 16 kHz from the browser).
 */
export async function transcribeAzurePcm16({ key, region, language, pcmBuffer, sampleRate = 16000 }) {
  const speechConfig = sdk.SpeechConfig.fromSubscription(key, region)
  speechConfig.speechRecognitionLanguage = localeFor(language)

  const format = sdk.AudioStreamFormat.getWaveFormatPCM(sampleRate, 16, 1)
  const pushStream = sdk.AudioInputStream.createPushStream(format)
  pushStream.write(pcmBuffer)
  pushStream.close()

  const audioConfig = sdk.AudioConfig.fromStreamInput(pushStream)
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)

  try {
    const result = await new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (speechResult) => resolve(speechResult),
        (error) => reject(error instanceof Error ? error : new Error(String(error))),
      )
    })

    if (result.reason === sdk.ResultReason.RecognizedSpeech) {
      return result.text.trim()
    }

    if (result.reason === sdk.ResultReason.NoMatch) {
      throw new Error('No speech detected. Try again or type your answer.')
    }

    const detail = sdk.CancellationDetails.fromResult(result)
    throw new Error(detail.errorDetails || 'Azure speech recognition failed')
  } finally {
    recognizer.close()
  }
}
