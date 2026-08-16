import { localAi, type TtsResult } from './localAi'
import type { Viseme } from '../types'
import { avatarLipSyncBus } from './avatarLipSyncBus'
import { buildVisemeTimeline } from './visemeTimeline'
import {
  marksFromTts,
  runAudioSyncedLipSync,
  runClockSyncedLipSync,
  type LipSyncTick,
} from './audioSyncedLipSync'

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

function publishTick(tick: LipSyncTick) {
  avatarLipSyncBus.set({
    viseme: tick.viseme,
    jawOpen: tick.jawOpen,
    speaking: true,
  })
}

async function speakWithBrowser(
  text: string,
  language: SpeechLanguage,
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
    let lipSyncAbort: AbortController | null = null
    let lipSyncPromise: Promise<void> | null = null

    const cleanup = () => {
      window.speechSynthesis.cancel()
      lipSyncAbort?.abort()
      avatarLipSyncBus.set({ viseme: 'rest', jawOpen: 0, speaking: false })
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
      avatarLipSyncBus.set({ speaking: true, viseme: 'rest', jawOpen: 0 })
      lipSyncAbort = new AbortController()
      const estimatedMs = estimateDurationMs(text, language)
      const marks = buildVisemeTimeline(text, language, estimatedMs)
      lipSyncPromise = runClockSyncedLipSync({
        marks,
        durationMs: estimatedMs * 1.08,
        onTick: publishTick,
        signal: lipSyncAbort.signal,
      }).catch(() => undefined)
    }

    utterance.onend = async () => {
      signal?.removeEventListener('abort', onAbort)
      lipSyncAbort?.abort()
      if (lipSyncPromise) await lipSyncPromise.catch(() => undefined)
      avatarLipSyncBus.set({ viseme: 'rest', jawOpen: 0, speaking: false })
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
  marks: ReturnType<typeof buildVisemeTimeline>,
  signal?: AbortSignal,
) {
  const audio = new Audio(`data:${mimeType};base64,${audioBase64}`)
  audio.preload = 'auto'
  avatarLipSyncBus.set({ speaking: true, viseme: 'rest', jawOpen: 0 })

  await runAudioSyncedLipSync({
    audio,
    marks,
    onTick: publishTick,
    signal,
  })

  avatarLipSyncBus.set({ viseme: 'rest', jawOpen: 0, speaking: false })
}

export function isBrowserTtsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export async function speakInterviewLine(options: {
  text: string
  language: SpeechLanguage
  onViseme?: (viseme: Viseme) => void
  signal?: AbortSignal
}) {
  const { text, language, onViseme, signal } = options
  const unsubscribe = avatarLipSyncBus.subscribe((snapshot) => {
    onViseme?.(snapshot.viseme)
  })

  let serverResult: TtsResult | null = null

  try {
    serverResult = await localAi.synthesize({ text, language })
  } catch {
    serverResult = null
  }

  try {
    if (serverResult?.audioBase64) {
      const marks = serverResult.visemeMarks?.length
        ? serverResult.visemeMarks
        : marksFromTts(text, language, estimateDurationMs(text, language))
      await speakWithAudio(
        serverResult.audioBase64,
        serverResult.mimeType ?? 'audio/mpeg',
        marks,
        signal,
      )
      return serverResult.mode
    }

    await speakWithBrowser(text, language, signal)
    return 'browser'
  } finally {
    unsubscribe()
    avatarLipSyncBus.reset()
  }
}

export function preloadSpeechVoices() {
  if (!isBrowserTtsSupported()) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices()
  }
}
