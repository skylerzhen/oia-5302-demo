import type { PipelineStatus } from '../types'

export function applyShortlist(): Partial<PipelineStatus> {
  return { shortlisted: true, disqualified: false }
}

export function applyBelowThreshold(): Partial<PipelineStatus> {
  return { disqualified: true, shortlisted: false }
}

export function canReachFinalDecision(pipeline: PipelineStatus): boolean {
  return pipeline.shortlisted && !pipeline.disqualified
}

export function clampLlmRecommendationToScores(
  narrative: string,
  interviewPillarScore: number | null,
  overallScore: number,
): string {
  const scoreLine = `Deterministic scores are authoritative (overall ${overallScore}%${
    interviewPillarScore != null ? `, interview ${interviewPillarScore}%` : ''
  }).`
  const lowInterview = interviewPillarScore != null && interviewPillarScore < 50
  const lowOverall = overallScore < 60
  const praise = /strong|excellent|outstanding|highly qualified|recommend hire/i.test(narrative)
  const criticise = /weak|poor|insufficient|below|reject|not qualified/i.test(narrative)

  if (lowInterview || lowOverall) {
    return `${scoreLine} Do not treat the model narrative as a hire signal — review transcript evidence before deciding.`
  }
  if (overallScore >= 75 && criticise) {
    return `${scoreLine} Scores meet the role threshold; treat any cautious wording as supplementary only.`
  }
  if (overallScore < 75 && praise) {
    return `${scoreLine} Scores are not a clear hire signal; the model cannot overturn that.`
  }
  const trimmed = narrative.trim()
  if (!trimmed) return scoreLine
  return `${scoreLine} ${trimmed}`
}
