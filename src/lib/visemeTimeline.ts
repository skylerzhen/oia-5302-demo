import type { Viseme } from '../types'
import { textToVisemes } from './visemes'

export interface VisemeMark {
  timeMs: number
  viseme: Viseme
}

export function buildVisemeTimeline(text: string, language: 'en' | 'ar', durationMs: number): VisemeMark[] {
  const visemes = textToVisemes(text, language)
  if (visemes.length === 0) return [{ timeMs: 0, viseme: 'rest' }]
  const slice = Math.max(durationMs / visemes.length, 60)
  return visemes.map((viseme, index) => ({
    timeMs: Math.round(index * slice),
    viseme,
  }))
}

export function runVisemeTimeline(
  marks: VisemeMark[],
  onViseme: (viseme: Viseme) => void,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (marks.length === 0) {
      onViseme('rest')
      resolve()
      return
    }

    const timers: number[] = []
    const cleanup = () => {
      timers.forEach((timer) => window.clearTimeout(timer))
    }

    const onAbort = () => {
      cleanup()
      onViseme('rest')
      reject(new DOMException('Speech interrupted', 'AbortError'))
    }

    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    marks.forEach((mark) => {
      const timer = window.setTimeout(() => {
        if (signal?.aborted) return
        onViseme(mark.viseme)
      }, mark.timeMs)
      timers.push(timer)
    })

    const endMs = marks[marks.length - 1].timeMs + 120
    timers.push(window.setTimeout(() => {
      cleanup()
      signal?.removeEventListener('abort', onAbort)
      onViseme('rest')
      resolve()
    }, endMs))
  })
}
