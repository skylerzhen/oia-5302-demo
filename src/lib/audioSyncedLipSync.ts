import type { Viseme } from '../types'
import { buildVisemeTimeline, type VisemeMark } from './visemeTimeline'
import { jawHintForViseme } from './avatarLipSyncBus'

export function visemeAtTime(marks: VisemeMark[], timeMs: number): Viseme {
  if (marks.length === 0) return 'rest'
  let current = marks[0].viseme
  for (const mark of marks) {
    if (mark.timeMs > timeMs) break
    current = mark.viseme
  }
  return current
}

export function computeAudioJawLevel(analyser: AnalyserNode): number {
  const buffer = new Uint8Array(analyser.fftSize)
  analyser.getByteTimeDomainData(buffer)
  let sum = 0
  for (let i = 0; i < buffer.length; i += 1) {
    const centered = (buffer[i] - 128) / 128
    sum += centered * centered
  }
  const rms = Math.sqrt(sum / buffer.length)
  return Math.min(1, Math.max(0, (rms - 0.02) * 4.2))
}

export interface LipSyncTick {
  viseme: Viseme
  jawOpen: number
}

export function blendJaw(viseme: Viseme, audioJaw: number): number {
  const shape = jawHintForViseme(viseme)
  return Math.min(1, Math.max(shape * 0.55, audioJaw * 0.95))
}

export async function runAudioSyncedLipSync(options: {
  audio: HTMLAudioElement
  marks: VisemeMark[]
  onTick: (tick: LipSyncTick) => void
  signal?: AbortSignal
}): Promise<void> {
  const { audio, marks, onTick, signal } = options
  let audioCtx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let raf = 0

  const cleanup = () => {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    void audioCtx?.close()
    audioCtx = null
    analyser = null
  }

  const onAbort = () => {
    cleanup()
    audio.pause()
    onTick({ viseme: 'rest', jawOpen: 0 })
  }

  if (signal?.aborted) {
    onAbort()
    return
  }
  signal?.addEventListener('abort', onAbort, { once: true })

  const ensureAnalyser = () => {
    if (analyser || !audioCtx) return
    try {
      const source = audioCtx.createMediaElementSource(audio)
      analyser = audioCtx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.35
      source.connect(analyser)
      analyser.connect(audioCtx.destination)
    } catch {
      analyser = null
    }
  }

  await new Promise<void>((resolve, reject) => {
    const tick = () => {
      if (signal?.aborted) return
      const timeMs = audio.currentTime * 1000
      const viseme = visemeAtTime(marks, timeMs)
      const audioJaw = analyser ? computeAudioJawLevel(analyser) : 0
      onTick({ viseme, jawOpen: blendJaw(viseme, audioJaw) })
      if (!audio.paused && !audio.ended) {
        raf = requestAnimationFrame(tick)
      }
    }

    const startLoop = () => {
      if (!audioCtx) audioCtx = new AudioContext()
      void audioCtx.resume()
      ensureAnalyser()
      tick()
    }

    audio.addEventListener('playing', startLoop, { once: true })
    audio.addEventListener('ended', () => {
      cleanup()
      signal?.removeEventListener('abort', onAbort)
      onTick({ viseme: 'rest', jawOpen: 0 })
      resolve()
    }, { once: true })
    audio.addEventListener('error', () => {
      cleanup()
      signal?.removeEventListener('abort', onAbort)
      reject(new Error('Could not play synthesized speech audio'))
    }, { once: true })

    void audio.play().catch(reject)
  })
}

export async function runClockSyncedLipSync(options: {
  marks: VisemeMark[]
  durationMs: number
  onTick: (tick: LipSyncTick) => void
  signal?: AbortSignal
}): Promise<void> {
  const { marks, durationMs, onTick, signal } = options
  const start = performance.now()
  let raf = 0

  await new Promise<void>((resolve) => {
    const finish = () => {
      if (raf) cancelAnimationFrame(raf)
      onTick({ viseme: 'rest', jawOpen: 0 })
      resolve()
    }

    const onAbort = () => {
      if (raf) cancelAnimationFrame(raf)
      onTick({ viseme: 'rest', jawOpen: 0 })
      resolve()
    }

    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    const tick = () => {
      if (signal?.aborted) return
      const elapsed = performance.now() - start
      const viseme = visemeAtTime(marks, elapsed)
      const pulse = 0.85 + Math.sin(elapsed * divisorForViseme(viseme)) * 0.15
      onTick({
        viseme,
        jawOpen: blendJaw(viseme, jawHintForViseme(viseme) * pulse),
      })
      if (elapsed < durationMs) raf = requestAnimationFrame(tick)
      else {
        signal?.removeEventListener('abort', onAbort)
        finish()
      }
    }

    raf = requestAnimationFrame(tick)
  })
}

function divisorForViseme(viseme: Viseme) {
  if (viseme === 'rest') return 0.004
  if (viseme === 'M') return 0.012
  return 0.022
}

export function marksFromTts(text: string, language: 'en' | 'ar', durationMs: number) {
  return buildVisemeTimeline(text, language, durationMs)
}
