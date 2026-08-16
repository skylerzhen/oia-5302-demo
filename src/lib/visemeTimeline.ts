import type { Viseme } from '../types'
import { textToVisemes } from './visemes'

export interface VisemeMark {
  timeMs: number
  viseme: Viseme
}

const VISEME_WEIGHT: Record<Viseme, number> = {
  rest: 0.6,
  M: 0.85,
  F: 0.9,
  E: 1.05,
  O: 1.15,
  A: 1.25,
}

/** Word/syllable-weighted timeline — more marks, longer holds on open vowels. */
export function buildVisemeTimeline(text: string, language: 'en' | 'ar', durationMs: number): VisemeMark[] {
  const visemes = textToVisemes(text, language)
  if (visemes.length === 0) return [{ timeMs: 0, viseme: 'rest' }]

  const totalWeight = visemes.reduce((sum, v) => sum + VISEME_WEIGHT[v], 0)
  const msPerWeight = Math.max(45, durationMs / totalWeight)

  let cursor = 0
  return visemes.map((viseme) => {
    const mark = { timeMs: Math.round(cursor), viseme }
    cursor += msPerWeight * VISEME_WEIGHT[viseme]
    return mark
  })
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
