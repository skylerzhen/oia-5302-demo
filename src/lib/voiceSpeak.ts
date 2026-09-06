import { localAi, type TtsResult } from './localAi'
import type { Viseme } from '../types'
import { avatarLipSyncBus } from './avatarLipSyncBus'
import { buildVisemeTimeline } from './visemeTimeline'
import { pickSpeechVoice, preloadSpeechVoices as loadSpeechVoices } from './pickSpeechVoice'
import { isOpeningPresetText, OPENING_AUDIO_URL } from './demoAudio'
import { synthesizeEdgeTtsBrowser } from './edgeTtsClient'
import { unlockAudioPlayback, getSharedAudioContext } from './audioUnlock'
import { getHeyGenVideoElement, playHeyGenHls } from './heygenPlayer'
import {
  pauseLiveAvatarOutput,
  speakLiveAvatarOnce,
  primeLiveAvatarAudioPlayback,
  restoreLiveAvatarOutput,
} from './liveavatarPlayer'
import { isInterviewDuplexMode } from './freeMicDuplex'
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

let heygenAvatarEnabled = false
let liveAvatarEnabled = false
let activeHtmlAudio: HTMLAudioElement | null = null
let activeBufferStop: (() => void) | null = null

export function setHeyGenAvatarEnabled(enabled: boolean) {
  heygenAvatarEnabled = enabled
}

export function setLiveAvatarEnabled(enabled: boolean) {
  liveAvatarEnabled = enabled
}

/** Stop TTS / MP3 playback. In duplex mode keep LiveAvatar stream alive (no mute gap). */
export function stopActiveSpeech() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
  if (activeHtmlAudio) {
    try {
      activeHtmlAudio.pause()
      activeHtmlAudio.removeAttribute('src')
      activeHtmlAudio.load()
    } catch {
      // ignore
    }
    activeHtmlAudio = null
  }
  if (activeBufferStop) {
    activeBufferStop()
    activeBufferStop = null
  }
  if (isInterviewDuplexMode()) restoreLiveAvatarOutput()
  else pauseLiveAvatarOutput()
  avatarLipSyncBus.reset()
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

  stopActiveSpeech()
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
  stopActiveSpeech()
  activeHtmlAudio = audio
  audio.preload = 'auto'
  avatarLipSyncBus.set({ speaking: true, viseme: 'rest', jawOpen: 0 })

  try {
    await runAudioSyncedLipSync({
      audio,
      marks,
      onTick: publishTick,
      signal,
    })
  } finally {
    if (activeHtmlAudio === audio) activeHtmlAudio = null
    avatarLipSyncBus.set({ viseme: 'rest', jawOpen: 0, speaking: false })
  }
}

async function speakWithAudio(
  audioBase64: string,
  mimeType: string,
  marks: ReturnType<typeof buildVisemeTimeline>,
  signal?: AbortSignal,
) {
  stopActiveSpeech()
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
      const bufferAbort = new AbortController()
      activeBufferStop = () => bufferAbort.abort()
      const relayAbort = () => bufferAbort.abort()
      signal?.addEventListener('abort', relayAbort, { once: true })
      try {
        await runBufferSyncedLipSync({
          ctx,
          audioBuffer,
          marks,
          onTick: publishTick,
          signal: bufferAbort.signal,
        })
        return
      } finally {
        signal?.removeEventListener('abort', relayAbort)
        activeBufferStop = null
      }
    } catch {
      activeBufferStop = null
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
      if (await speakLiveAvatarOnce(text, signal)) {
        return 'liveavatar'
      }
      // Never mix LiveAvatar with MP3/Edge/browser fallback — different voice + overlapping audio.
      console.warn('[voice] LiveAvatar speak failed; skipping non-LiveAvatar fallback')
      return null
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

/** HR replay — candidate lines only (never routes through LiveAvatar). */
export async function speakCandidateReplay(text: string, signal?: AbortSignal) {
  stopActiveSpeech()
  unlockAudioPlayback()
  const prefetched = await fetchServerTts(text, signal)
  if (prefetched?.audioBase64) {
    try {
      const marks = prefetched.visemeMarks?.length
        ? prefetched.visemeMarks
        : marksFromTts(text, 'en', estimateDurationMs(text))
      await speakWithAudio(
        prefetched.audioBase64,
        prefetched.mimeType ?? 'audio/mpeg',
        marks,
        signal,
      )
      return prefetched.ttsProvider ?? 'tts'
    } catch {
      // Fall through to edge/browser.
    }
  }
  if (await speakWithClientEdgeTts(text, signal)) return 'edge'
  await speakWithBrowser(text, signal)
  return 'browser'
}

/**
 * Short acknowledgement while the candidate is still speaking (duplex backchannel).
 * Does not tear down LiveAvatar or stop the always-on mic session.
 */
export async function speakBackchannelLine(text: string) {
  if (!('speechSynthesis' in window)) return
  unlockAudioPlayback()
  await loadSpeechVoices()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 1.05
  utterance.volume = 0.42
  const voice = pickSpeechVoice()
  if (voice) utterance.voice = voice

  await new Promise<void>((resolve) => {
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
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
  // Prefetch cached opening MP3 only for 2D mode — LiveAvatar uses onyx via server PCM.
  if (!liveAvatarEnabled && !heygenAvatarEnabled) {
    try {
      const audio = new Audio(OPENING_AUDIO_URL)
      audio.preload = 'auto'
      audio.load()
    } catch {
      // Optional prefetch — ignore failures.
    }
  }
  void localAi.status().catch(() => undefined)
  void localAi.liveavatarStatus().catch(() => undefined)
}
