import { localAi, type TtsResult } from './localAi'
import type { Viseme } from '../types'
import { avatarLipSyncBus } from './avatarLipSyncBus'
import { buildVisemeTimeline } from './visemeTimeline'
import { pickSpeechVoice, preloadSpeechVoices as loadSpeechVoices } from './pickSpeechVoice'
import { isOpeningPresetText, OPENING_AUDIO_URL } from './demoAudio'
import { synthesizeEdgeTtsBrowser } from './edgeTtsClient'
import { unlockAudioPlayback, getSharedAudioContext } from './audioUnlock'
import { getHeyGenVideoElement, playHeyGenHls } from './heygenPlayer'
import { getLiveAvatarSessionId, prepareLiveAvatarForSpeech, primeLiveAvatarAudioPlayback, waitForLiveAvatarPlayback, liveAvatarVideoReady, getLiveAvatarLastError, resetLiveAvatarSession } from './liveavatarPlayer'
import {
  marksFromTts,
  runAudioSyncedLipSync,
  runBufferSyncedLipSync,
  runClockSyncedLipSync,
  type LipSyncTick,
} from './audioSyncedLipSync'

export type SpeechLanguage = 'en'

const SERVER_TTS_TIMEOUT_MS = 14_000
const CLIENT_EDGE_TTS_TIMEOUT_MS = 12_000
const HEYGEN_SPEAK_TIMEOUT_MS = 52_000
const LIVEAVATAR_SPEAK_TIMEOUT_MS = 92_000

let heygenAvatarEnabled = false
let liveAvatarEnabled = false

export function setHeyGenAvatarEnabled(enabled: boolean) {
  heygenAvatarEnabled = enabled
}

export function setLiveAvatarEnabled(enabled: boolean) {
  liveAvatarEnabled = enabled
}

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
  unlockAudioPlayback()
  const ctx = getSharedAudioContext()
  if (ctx && ctx.state !== 'closed') {
    try {
      const binary = atob(audioBase64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
      }
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0))
      await runBufferSyncedLipSync({ ctx, audioBuffer, marks, onTick: publishTick, signal })
      return
    } catch {
      // Fall back to HTMLAudioElement below.
    }
  }

  const audio = new Audio(`data:${mimeType};base64,${audioBase64}`)
  await speakWithAudioElement(audio, marks, signal)
}

async function speakFromBlob(blob: Blob, text: string, signal?: AbortSignal) {
  unlockAudioPlayback()
  const ctx = getSharedAudioContext()
  const marks = buildVisemeTimeline(text, 'en', estimateDurationMs(text))

  if (ctx && ctx.state !== 'closed') {
    try {
      const arrayBuffer = await blob.arrayBuffer()
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
      await runBufferSyncedLipSync({ ctx, audioBuffer, marks, onTick: publishTick, signal })
      return
    } catch {
      // Fall back to object URL playback.
    }
  }

  const url = URL.createObjectURL(blob)
  try {
    const audio = new Audio(url)
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

async function speakWithLiveAvatar(text: string, signal?: AbortSignal): Promise<boolean> {
  if (!liveAvatarEnabled) return false

  const attemptSpeak = async () => {
    primeLiveAvatarAudioPlayback()
    const ready = await prepareLiveAvatarForSpeech(20_000)
    if (!ready) return false

    const sessionId = getLiveAvatarSessionId()
    if (!sessionId) return false

    avatarLipSyncBus.set({ speaking: true, viseme: 'rest', jawOpen: 0 })
    const result = await Promise.race([
      localAi.liveavatarSpeak({ sessionId, text }),
      wait(LIVEAVATAR_SPEAK_TIMEOUT_MS, signal).then(() => null),
    ])
    if (!result?.ok) return false

    await waitForLiveAvatarPlayback(LIVEAVATAR_SPEAK_TIMEOUT_MS, signal)
    avatarLipSyncBus.set({ viseme: 'rest', jawOpen: 0, speaking: false })
    return true
  }

  try {
    if (await attemptSpeak()) return true
    await resetLiveAvatarSession()
    return await attemptSpeak()
  } catch (error) {
    avatarLipSyncBus.set({ viseme: 'rest', jawOpen: 0, speaking: false })
    if (error instanceof Error && /session not found/i.test(error.message)) {
      await resetLiveAvatarSession()
      try {
        return await attemptSpeak()
      } catch {
        return false
      }
    }
    return false
  }
}

async function speakLiveAvatarFallback(
  text: string,
  prefetchedTts: TtsResult | null | undefined,
  signal?: AbortSignal,
): Promise<string> {
  const fallbackTts = prefetchedTts ?? await fetchServerTts(text, signal)
  const marks = fallbackTts?.visemeMarks?.length
    ? fallbackTts.visemeMarks
    : marksFromTts(text, 'en', estimateDurationMs(text))

  if (fallbackTts?.audioBase64) {
    await speakWithAudio(
      fallbackTts.audioBase64,
      fallbackTts.mimeType ?? 'audio/mpeg',
      marks,
      signal,
    )
    return fallbackTts.ttsProvider === 'openai' ? 'openai-fallback' : 'tts-fallback'
  }
  if (await speakWithClientEdgeTts(text, signal)) return 'edge-fallback'
  await speakWithBrowser(text, signal)
  return 'browser-fallback'
}

async function speakWithHeyGen(
  text: string,
  prefetchedTts: TtsResult | null | undefined,
  signal?: AbortSignal,
): Promise<boolean> {
  const video = getHeyGenVideoElement()
  if (!heygenAvatarEnabled || !video) return false

  try {
    const payload: { text: string; audioBase64?: string; mimeType?: string } = { text }
    if (prefetchedTts?.audioBase64) {
      payload.audioBase64 = prefetchedTts.audioBase64
      payload.mimeType = prefetchedTts.mimeType ?? 'audio/mpeg'
    }

    const result = await Promise.race([
      localAi.heygenSpeak(payload),
      wait(HEYGEN_SPEAK_TIMEOUT_MS, signal).then(() => null),
    ])
    if (!result?.hlsUrl) return false

    avatarLipSyncBus.set({ speaking: true, viseme: 'rest', jawOpen: 0 })
    await playHeyGenHls(video, result.hlsUrl, signal)
    avatarLipSyncBus.set({ viseme: 'rest', jawOpen: 0, speaking: false })
    return true
  } catch {
    avatarLipSyncBus.set({ viseme: 'rest', jawOpen: 0, speaking: false })
    return false
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
  prefetchedTts?: TtsResult | null
}) {
  const { text, onViseme, signal, prefetchedTts } = options
  const unsubscribe = avatarLipSyncBus.subscribe((snapshot) => {
    onViseme?.(snapshot.viseme)
  })

  try {
    unlockAudioPlayback()

    const digitalAvatar = liveAvatarEnabled || heygenAvatarEnabled

    if (!digitalAvatar && isOpeningPresetText(text)) {
      try {
        await speakFromCachedUrl(OPENING_AUDIO_URL, text, signal)
        return 'cached'
      } catch {
        // Cached MP3 blocked — fall through to live TTS.
      }
    }

    if (liveAvatarEnabled) {
      primeLiveAvatarAudioPlayback()
      if (await speakWithLiveAvatar(text, signal)) {
        return 'liveavatar'
      }
      if (liveAvatarVideoReady()) {
        if (await speakWithLiveAvatar(text, signal)) {
          return 'liveavatar'
        }
        throw new Error(getLiveAvatarLastError() ?? 'LiveAvatar speak failed while video was connected')
      }
      return speakLiveAvatarFallback(text, prefetchedTts, signal)
    }

    const resolvedTts = prefetchedTts ?? await fetchServerTts(text, signal)

    if (await speakWithHeyGen(text, resolvedTts, signal)) {
      return 'heygen'
    }

    if (resolvedTts?.audioBase64) {
      try {
        const marks = resolvedTts.visemeMarks?.length
          ? resolvedTts.visemeMarks
          : marksFromTts(text, 'en', estimateDurationMs(text))
        await speakWithAudio(
          resolvedTts.audioBase64,
          resolvedTts.mimeType ?? 'audio/mpeg',
          marks,
          signal,
        )
        if (resolvedTts.ttsProvider === 'openai') return 'openai'
        if (resolvedTts.ttsProvider === 'edge') return 'edge'
        return resolvedTts.visemeSource === 'azure' ? 'azure' : resolvedTts.mode
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

let warmSpeechDone = false

export function warmInterviewSpeech() {
  if (warmSpeechDone) return
  warmSpeechDone = true
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
