import { localAi, type TtsResult } from './localAi'
import type { Viseme } from '../types'
import { buildVisemeTimeline, runVisemeTimeline, type VisemeMark } from './visemeTimeline'
import { textToVisemes } from './visemes'

export type SpeechLanguage = 'en' | 'ar'

function localeFor(language: SpeechLanguage) {
  return language === 'ar' ? 'ar-SA' : 'en-US'
}

function estimateDurationMs(text: string, language: SpeechLanguage) {
  return Math.max(1400, text.length * (language === 'ar' ? 88 : 78))
}

function pickVoice(language: SpeechLanguage) {
  const voices = window.speechSynthesis.getVoices()
  const preferred = language === 'ar'
    ? voices.find((voice) => voice.lang.toLowerCase().startsWith('ar'))
    : voices.find((voice) => voice.lang.toLowerCase().startsWith('en'))
  return preferred ?? voices[0] ?? null
}

async function speakWithBrowser(
  text: string,
  language: SpeechLanguage,
  onViseme: (viseme: Viseme) => void,
  signal?: AbortSignal,
) {
  if (!('speechSynthesis' in window)) {
    throw new Error('Browser speech synthesis is not supported in this browser.')
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = localeFor(language)
  const voice = pickVoice(language)
  if (voice) utterance.voice = voice

  await new Promise<void>((resolve, reject) => {
    let visemeRunner: Promise<void> | null = null

    const cleanup = () => {
      window.speechSynthesis.cancel()
      onViseme('rest')
    }

    const onAbort = () => {
      cleanup()
      reject(new DOMException('Speech interrupted', 'AbortError'))
    }

    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    utterance.onstart = () => {
      const durationMs = estimateDurationMs(text, language)
      const marks = buildVisemeTimeline(text, language, durationMs)
      visemeRunner = runVisemeTimeline(marks, onViseme, signal).catch(() => undefined)
    }

    utterance.onend = async () => {
      signal?.removeEventListener('abort', onAbort)
      if (visemeRunner) await visemeRunner
      onViseme('rest')
      resolve()
    }

    utterance.onerror = () => {
      signal?.removeEventListener('abort', onAbort)
      cleanup()
      reject(new Error('Speech synthesis failed'))
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  })
}

async function speakWithAudio(
  audioBase64: string,
  mimeType: string,
  marks: VisemeMark[],
  onViseme: (viseme: Viseme) => void,
  signal?: AbortSignal,
) {
  const audio = new Audio(`data:${mimeType};base64,${audioBase64}`)
  audio.preload = 'auto'

  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      audio.pause()
      onViseme('rest')
      reject(new DOMException('Speech interrupted', 'AbortError'))
    }

    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    const visemePromise = runVisemeTimeline(marks, onViseme, signal).catch(() => undefined)

    audio.onended = async () => {
      signal?.removeEventListener('abort', onAbort)
      await visemePromise
      onViseme('rest')
      resolve()
    }

    audio.onerror = () => {
      signal?.removeEventListener('abort', onAbort)
      reject(new Error('Could not play synthesized speech audio'))
    }

    void audio.play().catch(reject)
  })
}

export function isBrowserTtsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export async function speakInterviewLine(options: {
  text: string
  language: SpeechLanguage
  onViseme: (viseme: Viseme) => void
  signal?: AbortSignal
}) {
  const { text, language, onViseme, signal } = options
  let serverResult: TtsResult | null = null

  try {
    serverResult = await localAi.synthesize({ text, language })
  } catch {
    serverResult = null
  }

  if (serverResult?.audioBase64) {
    const marks = serverResult.visemeMarks?.length
      ? serverResult.visemeMarks
      : buildVisemeTimeline(text, language, estimateDurationMs(text, language))
    await speakWithAudio(
      serverResult.audioBase64,
      serverResult.mimeType ?? 'audio/mpeg',
      marks,
      onViseme,
      signal,
    )
    return serverResult.mode
  }

  await speakWithBrowser(text, language, onViseme, signal)
  return 'browser'
}

export function preloadSpeechVoices() {
  if (!isBrowserTtsSupported()) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices()
  }
}

export function previewVisemesForCaption(text: string, language: SpeechLanguage) {
  return textToVisemes(text, language)
}
