import { isBrowserAsrSupported } from './browserAsr'

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

function recognitionCtor() {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

export interface FreeMicSessionOptions {
  lang?: string
  silenceMs?: number
  minChars?: number
  partialStableMs?: number
  partialMinChars?: number
  /** Min caption length before barge-in callback (avoids avatar bleed-through). */
  bargeInMinChars?: number
  onLiveCaption: (text: string) => void
  onSpeechStart?: (caption: string) => void
  onPartialStable?: (text: string) => void
  onUtteranceComplete: (text: string) => void
  onError?: (message: string) => void
}

export interface FreeMicSession {
  stop: () => void
}

/** Always-on browser ASR for full-duplex interview (自由麦 · 边听边回). */
export function startFreeMicSession(options: FreeMicSessionOptions): FreeMicSession {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    throw new Error('Browser speech recognition is not supported in this browser.')
  }

  const silenceMs = options.silenceMs ?? 1000
  const minChars = options.minChars ?? 6
  const partialStableMs = options.partialStableMs ?? 420
  const partialMinChars = options.partialMinChars ?? 14
  const bargeInMinChars = options.bargeInMinChars ?? 6
  let stopped = false
  let speechStarted = false
  let utteranceFinal = ''
  let interim = ''
  let lastActivityAt = 0
  let silenceTimer: number | null = null
  let partialTimer: number | null = null
  let lastPartialEmitted = ''
  let recognition: SpeechRecognitionLike | null = null

  const liveCaption = () => [utteranceFinal, interim].filter(Boolean).join(' ').trim()

  const clearSilenceTimer = () => {
    if (silenceTimer !== null) {
      window.clearTimeout(silenceTimer)
      silenceTimer = null
    }
  }

  const clearPartialTimer = () => {
    if (partialTimer !== null) {
      window.clearTimeout(partialTimer)
      partialTimer = null
    }
  }

  const scheduleUtteranceCheck = () => {
    clearSilenceTimer()
    silenceTimer = window.setTimeout(() => {
      silenceTimer = null
      const text = utteranceFinal.trim()
      if (text.length < minChars) return
      if (Date.now() - lastActivityAt < silenceMs) return
      utteranceFinal = ''
      interim = ''
      speechStarted = false
      lastPartialEmitted = ''
      options.onLiveCaption('')
      options.onUtteranceComplete(text)
    }, silenceMs)
  }

  const schedulePartialStable = (caption: string) => {
    clearPartialTimer()
    if (caption.length < partialMinChars) return
    partialTimer = window.setTimeout(() => {
      partialTimer = null
      const current = liveCaption()
      if (current !== caption || current.length < partialMinChars) return
      if (current === lastPartialEmitted) return
      lastPartialEmitted = current
      options.onPartialStable?.(current)
    }, partialStableMs)
  }

  const handleActivity = (nextInterim: string) => {
    interim = nextInterim
    lastActivityAt = Date.now()
    const caption = liveCaption()
    if (!speechStarted && caption.length >= bargeInMinChars) {
      speechStarted = true
      options.onSpeechStart?.(caption)
    }
    options.onLiveCaption(caption)
    schedulePartialStable(caption)
    scheduleUtteranceCheck()
  }

  const startRecognition = () => {
    if (stopped) return
    const instance = new Ctor()
    recognition = instance
    instance.lang = options.lang ?? 'en-US'
    instance.continuous = true
    instance.interimResults = true

    instance.onresult = (event) => {
      let nextInterim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const piece = result[0]?.transcript ?? ''
        if (result.isFinal) utteranceFinal += piece
        else nextInterim += piece
      }
      handleActivity(nextInterim)
    }

    instance.onerror = (event) => {
      if (stopped || event.error === 'aborted' || event.error === 'no-speech') return
      options.onError?.(event.error || 'Speech recognition failed')
    }

    instance.onend = () => {
      if (stopped) return
      window.setTimeout(() => {
        if (!stopped) startRecognition()
      }, 80)
    }

    try {
      instance.start()
    } catch (error) {
      options.onError?.(error instanceof Error ? error.message : 'Could not start microphone')
    }
  }

  startRecognition()

  return {
    stop() {
      stopped = true
      clearSilenceTimer()
      clearPartialTimer()
      const active = recognition
      recognition = null
      try {
        active?.abort()
      } catch {
        active?.stop()
      }
    },
  }
}

export function isFreeMicSupported() {
  return isBrowserAsrSupported()
}
