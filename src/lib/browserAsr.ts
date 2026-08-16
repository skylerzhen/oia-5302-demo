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

export interface SpeechCaptureSession {
  finish: () => Promise<string>
  cancel: () => void
}

/** Start browser speech recognition; caller must invoke finish() when the user is done speaking. */
export function startSpeechCapture(signal?: AbortSignal): SpeechCaptureSession {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    throw new Error('Browser speech recognition is not supported in this browser.')
  }

  const recognition = new Ctor()
  recognition.lang = 'en-US'
  recognition.continuous = true
  recognition.interimResults = true

  let transcript = ''
  let cancelled = false
  let pendingFinish: {
    resolve: (value: string) => void
    reject: (reason: Error) => void
  } | null = null

  const cleanup = () => {
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
    signal?.removeEventListener('abort', onAbort)
  }

  const onAbort = () => {
    cancelled = true
    try {
      recognition.abort()
    } catch {
      recognition.stop()
    }
  }

  if (signal?.aborted) onAbort()
  else signal?.addEventListener('abort', onAbort, { once: true })

  recognition.onresult = (event) => {
    transcript = Array.from(event.results)
      .map((result) => result[0]?.transcript ?? '')
      .join(' ')
      .trim()
  }

  recognition.onerror = (event) => {
    if (cancelled && event.error === 'aborted') return
    const error = new Error(event.error || 'Speech recognition failed')
    pendingFinish?.reject(error)
    pendingFinish = null
    cleanup()
  }

  recognition.onend = () => {
    if (pendingFinish) {
      if (cancelled) {
        pendingFinish.reject(new DOMException('Speech capture interrupted', 'AbortError'))
      } else if (transcript) {
        pendingFinish.resolve(transcript)
      } else {
        pendingFinish.reject(new Error('No speech detected. Try again or type your answer.'))
      }
      pendingFinish = null
    }
    cleanup()
  }

  try {
    recognition.start()
  } catch (error) {
    cleanup()
    throw error instanceof Error ? error : new Error('Could not start microphone')
  }

  function finish(): Promise<string> {
    if (pendingFinish) return pendingFinish as unknown as Promise<string>
    return new Promise<string>((resolve, reject) => {
      pendingFinish = { resolve, reject }
      try {
        recognition.stop()
      } catch (error) {
        pendingFinish = null
        reject(error instanceof Error ? error : new Error('Could not stop microphone'))
      }
    })
  }

  function cancel() {
    cancelled = true
    try {
      recognition.abort()
    } catch {
      recognition.stop()
    }
  }

  return { finish, cancel }
}
