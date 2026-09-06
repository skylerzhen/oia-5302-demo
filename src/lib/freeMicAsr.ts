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
  minWords?: number
  partialStableMs?: number
  partialMinChars?: number
  /** Min caption length before barge-in callback (avoids avatar bleed-through). */
  bargeInMinChars?: number
  /** Return false to drop an utterance (e.g. avatar still speaking / cooldown). */
  shouldAcceptUtterance?: (text: string) => boolean
  onLiveCaption: (text: string) => void
  onSpeechStart?: (caption: string) => void
  onPartialStable?: (text: string) => void
  onUtteranceComplete: (text: string) => void
  onError?: (message: string) => void
}

export interface FreeMicSession {
  stop: () => void
}

/** Always-on browser ASR for full-duplex interview. */
export function startFreeMicSession(options: FreeMicSessionOptions): FreeMicSession {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    throw new Error('Browser speech recognition is not supported in this browser.')
  }

  const silenceMs = options.silenceMs ?? 2000
  const minChars = options.minChars ?? 18
  const minWords = options.minWords ?? 3
  const partialStableMs = options.partialStableMs ?? 520
  const partialMinChars = options.partialMinChars ?? 22
  const bargeInMinChars = options.bargeInMinChars ?? 10
  let stopped = false
  let speechStarted = false
  let utteranceFinal = ''
  let interim = ''
  let lastActivityAt = 0
  let silenceTimer: number | null = null
  let partialTimer: number | null = null
  let lastPartialEmitted = ''
  let recognition: SpeechRecognitionLike | null = null
  let restartTimer: number | null = null
  let consecutiveErrors = 0
  let restartDelayMs = 80

  const TERMINAL_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture'])
  const MAX_CONSECUTIVE_ERRORS = 3

  const clearRestartTimer = () => {
    if (restartTimer !== null) {
      window.clearTimeout(restartTimer)
      restartTimer = null
    }
  }

  const haltRecognition = (message: string) => {
    stopped = true
    clearRestartTimer()
    options.onError?.(message)
  }

  const scheduleRestart = () => {
    if (stopped) return
    clearRestartTimer()
    restartTimer = window.setTimeout(() => {
      restartTimer = null
      if (!stopped) startRecognition()
    }, restartDelayMs)
    restartDelayMs = Math.min(restartDelayMs * 2, 5_000)
  }

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
      if (text.split(/\s+/).filter(Boolean).length < minWords) return
      if (options.shouldAcceptUtterance && !options.shouldAcceptUtterance(text)) return
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
      consecutiveErrors = 0
      restartDelayMs = 80
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
      if (TERMINAL_ERRORS.has(event.error)) {
        haltRecognition(
          event.error === 'not-allowed'
            ? 'Microphone permission denied — enable mic access or use typing.'
            : 'Microphone unavailable — use typing instead.',
        )
        return
      }
      consecutiveErrors += 1
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        haltRecognition('Speech recognition stopped after repeated errors — use typing instead.')
        return
      }
      options.onError?.(event.error || 'Speech recognition failed')
    }

    instance.onend = () => {
      if (stopped) return
      scheduleRestart()
    }

    try {
      instance.start()
    } catch (error) {
      consecutiveErrors += 1
      const message = error instanceof Error ? error.message : 'Could not start microphone'
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        haltRecognition(message)
      } else {
        options.onError?.(message)
        scheduleRestart()
      }
    }
  }

  startRecognition()

  return {
    stop() {
      stopped = true
      clearSilenceTimer()
      clearPartialTimer()
      clearRestartTimer()
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
