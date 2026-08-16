export type SpeechLanguage = 'en' | 'ar'

interface SpeechRecognitionResultLike {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
}

export function isBrowserAsrSupported() {
  return Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition)
}

function recognitionCtor() {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

function localeFor(language: SpeechLanguage) {
  return language === 'ar' ? 'ar-SA' : 'en-US'
}

export function listenForSpeech(language: SpeechLanguage, signal?: AbortSignal): Promise<string> {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    return Promise.reject(new Error('Browser speech recognition is not supported in this browser.'))
  }

  return new Promise((resolve, reject) => {
    const recognition = new Ctor()
    recognition.lang = localeFor(language)
    recognition.continuous = false
    recognition.interimResults = true

    let transcript = ''

    const finish = (fn: () => void) => {
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      signal?.removeEventListener('abort', onAbort)
      fn()
    }

    const onAbort = () => {
      try {
        recognition.abort()
      } catch {
        recognition.stop()
      }
      finish(() => reject(new DOMException('Speech capture interrupted', 'AbortError')))
    }

    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    recognition.onresult = (event) => {
      transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim()
    }

    recognition.onerror = (event) => {
      finish(() => reject(new Error(event.error || 'Speech recognition failed')))
    }

    recognition.onend = () => {
      finish(() => {
        if (transcript) resolve(transcript)
        else reject(new Error('No speech detected. Try again or type your answer.'))
      })
    }

    try {
      recognition.start()
    } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Error('Could not start microphone')))
    }
  })
}
