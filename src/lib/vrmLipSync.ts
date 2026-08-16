import type { VRM } from '@pixiv/three-vrm'
import type { Viseme } from '../types'

/** VRoid / VRM 1.0 standard mouth expression preset names. */
export const VRM_MOUTH_PRESETS = ['aa', 'ih', 'ou', 'ee', 'oh'] as const
export type VrmMouthPreset = (typeof VRM_MOUTH_PRESETS)[number]

const VISEME_TO_MOUTH: Record<Viseme, VrmMouthPreset | 'neutral'> = {
  A: 'aa',
  E: 'ee',
  O: 'oh',
  M: 'neutral',
  F: 'ih',
  rest: 'neutral',
}

export function visemeToVrmMouth(viseme: Viseme): VrmMouthPreset | 'neutral' {
  return VISEME_TO_MOUTH[viseme] ?? 'neutral'
}

export function listVrmExpressionNames(vrm: VRM): string[] {
  const map = vrm.expressionManager?.expressionMap
  if (!map) return []
  return Object.keys(map)
}

/** Pick the best available mouth preset when exports use alternate naming. */
export function resolveMouthPreset(vrm: VRM, viseme: Viseme): string | null {
  const names = listVrmExpressionNames(vrm)
  if (names.length === 0) return null

  const preferred = visemeToVrmMouth(viseme)
  if (preferred !== 'neutral' && names.includes(preferred)) return preferred

  const fallbacks: Record<Viseme, string[]> = {
    A: ['aa', 'A', 'mouth_a'],
    E: ['ee', 'ih', 'E'],
    O: ['oh', 'ou', 'O'],
    M: ['neutral'],
    F: ['ih', 'f'],
    rest: ['neutral'],
  }

  for (const candidate of fallbacks[viseme]) {
    if (names.includes(candidate)) return candidate
  }

  return names.includes('neutral') ? 'neutral' : null
}

export class VrmLipSyncController {
  private weights = new Map<string, number>()
  private targetViseme: Viseme = 'rest'
  private targetJaw = 0
  private speaking = false
  private readonly lerpSpeed = 18

  setSpeaking(speaking: boolean) {
    this.speaking = speaking
    if (!speaking) {
      this.targetViseme = 'rest'
      this.targetJaw = 0
    }
  }

  setViseme(viseme: Viseme, jawOpen = 0) {
    this.targetViseme = viseme
    this.targetJaw = jawOpen
  }

  apply(vrm: VRM, delta: number) {
    const manager = vrm.expressionManager
    if (!manager) return

    const activeViseme = this.speaking ? this.targetViseme : 'rest'
    const mouthPreset = resolveMouthPreset(vrm, activeViseme)
    const jawBoost = this.speaking ? this.targetJaw : 0
    const mouthStrength = this.speaking && activeViseme !== 'rest' && mouthPreset && mouthPreset !== 'neutral'
      ? Math.min(1, 0.55 + jawBoost * 0.55)
      : this.speaking
        ? Math.min(0.35, jawBoost * 0.5)
        : 0

    const targets = new Map<string, number>()
    for (const name of listVrmExpressionNames(vrm)) {
      if (VRM_MOUTH_PRESETS.includes(name as VrmMouthPreset) || name === 'neutral') {
        targets.set(name, 0)
      }
    }

    if (mouthPreset && mouthStrength > 0) {
      targets.set(mouthPreset, mouthStrength)
    }

    if (jawBoost > 0.15 && namesIncludes(listVrmExpressionNames(vrm), 'aa') && mouthPreset !== 'aa') {
      const currentAa = targets.get('aa') ?? 0
      targets.set('aa', Math.max(currentAa, jawBoost * 0.35))
    }

    for (const [name, target] of targets) {
      const current = this.weights.get(name) ?? 0
      const next = current + (target - current) * Math.min(1, delta * this.lerpSpeed)
      this.weights.set(name, next)
      if (next > 0.008) manager.setValue(name, next)
    }
  }
}

function namesIncludes(names: string[], value: string) {
  return names.includes(value)
}
