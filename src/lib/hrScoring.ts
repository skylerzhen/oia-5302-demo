import type { MatchDimension } from '../types'

export interface PillarWeights {
  cvMatch: number
  assessment: number
  interview: number
}

export const DEFAULT_PILLAR_WEIGHTS: PillarWeights = {
  cvMatch: 40,
  assessment: 30,
  interview: 30,
}

const WEIGHTS_STORAGE_KEY = 'oia5302-hr-pillar-weights'

export function loadPillarWeights(): PillarWeights {
  try {
    const raw = sessionStorage.getItem(WEIGHTS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_PILLAR_WEIGHTS }
    const parsed = JSON.parse(raw) as Partial<PillarWeights>
    return {
      cvMatch: clampWeight(parsed.cvMatch, DEFAULT_PILLAR_WEIGHTS.cvMatch),
      assessment: clampWeight(parsed.assessment, DEFAULT_PILLAR_WEIGHTS.assessment),
      interview: clampWeight(parsed.interview, DEFAULT_PILLAR_WEIGHTS.interview),
    }
  } catch {
    return { ...DEFAULT_PILLAR_WEIGHTS }
  }
}

export function savePillarWeights(weights: PillarWeights) {
  sessionStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights))
}

function clampWeight(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.min(100, Math.round(n))
}

/** Weighted average of dimension scores (score / maxScore × weight). */
export function computeCvScoreFromDimensions(dimensions: MatchDimension[]): number {
  if (dimensions.length === 0) return 0
  const totalWeight = dimensions.reduce((sum, d) => sum + d.weight, 0)
  if (totalWeight === 0) return 0
  const weighted = dimensions.reduce((sum, d) => {
    const pct = d.maxScore > 0 ? d.score / d.maxScore : 0
    return sum + pct * d.weight
  }, 0)
  return Math.round((weighted / totalWeight) * 100)
}

export function computeInterviewScoreFromDimensions(
  dimensions: Array<{ score: number; maxScore?: number; weight?: number }>,
): number {
  if (dimensions.length === 0) return 0
  let totalWeight = 0
  let weightedSum = 0
  for (const dim of dimensions) {
    const w = dim.weight ?? 1
    const max = dim.maxScore ?? 100
    const pct = max > 0 ? dim.score / max : 0
    weightedSum += pct * w
    totalWeight += w
  }
  return Math.round((weightedSum / totalWeight) * 100)
}

export function computeOverallScore(
  cvScore: number,
  assessmentScore: number,
  interviewScore: number | null,
  weights: PillarWeights,
): number {
  const entries: Array<[number, number]> = [
    [cvScore, weights.cvMatch],
    [assessmentScore, weights.assessment],
  ]
  if (interviewScore != null) {
    entries.push([interviewScore, weights.interview])
  }
  const totalW = entries.reduce((sum, [, w]) => sum + w, 0)
  if (totalW === 0) return 0
  return Math.round(entries.reduce((sum, [score, w]) => sum + score * w, 0) / totalW)
}

export function weightShare(weight: number, weights: PillarWeights): number {
  const total = weights.cvMatch + weights.assessment + weights.interview
  if (total === 0) return 0
  return Math.round((weight / total) * 100)
}

export function pillarContribution(score: number, weight: number, weights: PillarWeights): number {
  const total = weights.cvMatch + weights.assessment + weights.interview
  if (total === 0) return 0
  return Math.round((score * weight) / total)
}
