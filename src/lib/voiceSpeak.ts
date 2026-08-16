import { localAi, type TtsResult } from './localAi'
import type { Viseme } from '../types'
import { avatarLipSyncBus } from './avatarLipSyncBus'
import { buildVisemeTimeline } from './visemeTimeline'
import { pickSpeechVoice, preloadSpeechVoices as loadSpeechVoices } from './pickSpeechVoice'
import { isOpeningPresetText, OPENING_AUDIO_URL } from './demoAudio'
import { synthesizeEdgeTtsBrowser } from './edgeTtsClient'
import { unlockAudioPlayback } from './audioUnlock'
import {
  marksFromTts,
  runAudioSyncedLipSync,
  runClockSyncedLipSync,
  type LipSyncTick,
} from './audioSyncedLipSync'

export type SpeechLanguage = 'en'

const SERVER_TTS_TIMEOUT_MS = 14_000
const CLIENT_EDGE_TTS_TIMEOUT_MS = 12_000

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Speech interrupted', 'AbortError'))
      return
    }
    const timer = window.setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(new DOMException('Speech interrupted', 'AbortError'))
    }, { once: true })
  })
}

function estimateDurationMs(text: string) {
  return Math.max(1400, text.length * 78)
}

function publishTick(tick: LipSyncTick) {
  avatarLipSyncBus.set({
    viseme: tick.viseme,
    jawOpen: tick.jawOpen,
    speaking: true,
  })
}

async function speakWithBrowser(text: string, signal?: AbortSignal) {
  if (!('speechSynthesis' in window)) {
    throw new Error('Browser speech synthesis is not supported in this browser.')
  }

  await loadSpeechVoices()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.98
  utterance.pitch = 1.02
  const voice = pickSpeechVoice()
  if (voice) utterance.voice = voice

  const estimatedMs = estimateDurationMs(text)
  const marks = buildVisemeTimeline(text, 'en', estimatedMs)

  await new Promise<void>((resolve, reject) => {
    let lipSyncAbort: AbortController | null = null
    let lipSyncPromise: Promise<void> | null = null

    const cleanup = () => {
      window.speechSynthesis.cancel()
      lipSyncAbort?.abort()
      avatarLipSyncBus.set({ viseme: 'rest', jawOpen: 0, speaking: false })
    }

    const startLipSync = () => {
      lipSyncAbort?.abort()
      lipSyncAbort = new AbortController()
      lipSyncPromise = runClockSyncedLipSync({
        marks,
        durationMs: estimatedMs * 1.08,
        onTick: publishTick,
        signal: lipSyncAbort.signal,
      }).catch(() => undefined)
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

    avatarLipSyncBus.set({ speaking: true, viseme: 'A', jawOpen: 0.55 })
    startLipSync()

    utterance.onstart = () => {
      avatarLipSyncBus.set({ speaking: true, viseme: 'A', jawOpen: 0.55 })
      startLipSync()
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

async function speakWithAudioElement(
  audio: HTMLAudioElement,
  marks: ReturnType<typeof buildVisemeTimeline>,
  signal?: AbortSignal,
) {
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

async function speakWithAudio(
  audioBase64: string,
  mimeType: string,
  marks: ReturnType<typeof buildVisemeTimeline>,
  signal?: AbortSignal,
) {
  const audio = new Audio(`data:${mimeType};base64,${audioBase64}`)
  await speakWithAudioElement(audio, marks, signal)
}

async function speakFromBlob(blob: Blob, text: string, signal?: AbortSignal) {
  const url = URL.createObjectURL(blob)
  try {
    const audio = new Audio(url)
    const marks = buildVisemeTimeline(text, 'en', estimateDurationMs(text))
    await speakWithAudioElement(audio, marks, signal)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function speakWithClientEdgeTts(text: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const blob = await Promise.race([
      synthesizeEdgeTtsBrowser(text),
      wait(CLIENT_EDGE_TTS_TIMEOUT_MS, signal).then(() => null),
    ])
    if (!blob) return false
    await speakFromBlob(blob, text, signal)
    return true
  } catch {
    return false
  }
}

async function speakFromCachedUrl(url: string, text: string, signal?: AbortSignal) {
  const audio = new Audio(url)
  const marks = buildVisemeTimeline(text, 'en', estimateDurationMs(text))
  await speakWithAudioElement(audio, marks, signal)
}

async function fetchServerTts(text: string, signal?: AbortSignal): Promise<TtsResult | null> {
  try {
    return await Promise.race([
      localAi.synthesize({ text }),
      wait(SERVER_TTS_TIMEOUT_MS, signal).then(() => null),
    ])
  } catch {
    return null
  }
}

export function isBrowserTtsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export async function speakInterviewLine(options: {
  text: string
  language?: SpeechLanguage
  onViseme?: (viseme: Viseme) => void
  signal?: AbortSignal
}) {
  const { text, onViseme, signal } = options
  const unsubscribe = avatarLipSyncBus.subscribe((snapshot) => {
    onViseme?.(snapshot.viseme)
  })

  try {
    unlockAudioPlayback()

    if (isOpeningPresetText(text)) {
      try {
        await speakFromCachedUrl(OPENING_AUDIO_URL, text, signal)
        return 'cached'
      } catch {
        // Cached MP3 blocked — fall through to live TTS.
      }
    }

    // Always try server first — OpenAI / Edge TTS live on the API host when configured.
    const serverResult = await fetchServerTts(text, signal)

    if (serverResult?.audioBase64) {
      try {
        const marks = serverResult.visemeMarks?.length
          ? serverResult.visemeMarks
          : marksFromTts(text, 'en', estimateDurationMs(text))
        await speakWithAudio(
          serverResult.audioBase64,
          serverResult.mimeType ?? 'audio/mpeg',
          marks,
          signal,
        )
        if (serverResult.ttsProvider === 'openai') return 'openai'
        if (serverResult.ttsProvider === 'edge') return 'edge'
        return serverResult.visemeSource === 'azure' ? 'azure' : serverResult.mode
      } catch {
        // MP3 playback blocked — fall through.
      }
    }

    if (await speakWithClientEdgeTts(text, signal)) {
      return 'edge'
    }

    await speakWithBrowser(text, signal)
    return 'browser'
  } finally {
    unsubscribe()
    avatarLipSyncBus.reset()
  }
}

export function preloadSpeechVoices() {
  void loadSpeechVoices()
}

export function warmInterviewSpeech() {
  unlockAudioPlayback()
  void loadSpeechVoices()
  try {
    const audio = new Audio(OPENING_AUDIO_URL)
    audio.preload = 'auto'
    audio.load()
  } catch {
    // Optional prefetch — ignore failures.
  }
  void localAi.status().catch(() => undefined)
}
