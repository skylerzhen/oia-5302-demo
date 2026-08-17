import type { AssessmentResult, LocalAiMode } from './localAi'
import type { CandidateMatchWithTips } from './matching'

type MatchResult = {
  matches: CandidateMatchWithTips[]
  mode: LocalAiMode | 'unavailable'
}

let matchCache: ({ key: string } & MatchResult) | null = null
let matchInflight: Promise<MatchResult> | null = null
let matchInflightKey = ''

let assessmentCache: { key: string; result: AssessmentResult } | null = null
let assessmentInflight: Promise<AssessmentResult> | null = null
let assessmentInflightKey = ''

export function buildAssessmentKey(input: {
  assessmentScore: number
  matchScore: number
  turns: Array<{ id: string; text: string }>
}) {
  const turnSig = input.turns.map((turn) => `${turn.id}:${turn.text.length}`).join(';')
  return `${input.assessmentScore}|${input.matchScore}|${turnSig}`
}

export async function cachedLlmMatch(
  key: string,
  loader: () => Promise<MatchResult>,
): Promise<MatchResult> {
  if (matchCache?.key === key) return matchCache
  if (matchInflight && matchInflightKey === key) return matchInflight

  matchInflightKey = key
  matchInflight = loader().then((result) => {
    matchCache = { key, ...result }
    matchInflight = null
    return result
  }).catch((error) => {
    matchInflight = null
    throw error
  })

  return matchInflight
}

export async function cachedLlmAssessment(
  key: string,
  loader: () => Promise<AssessmentResult>,
): Promise<AssessmentResult> {
  if (assessmentCache?.key === key) return assessmentCache.result
  if (assessmentInflight && assessmentInflightKey === key) return assessmentInflight

  assessmentInflightKey = key
  assessmentInflight = loader().then((result) => {
    assessmentCache = { key, result }
    assessmentInflight = null
    return result
  }).catch((error) => {
    assessmentInflight = null
    throw error
  })

  return assessmentInflight
}

export function clearLlmRequestCache() {
  matchCache = null
  matchInflight = null
  matchInflightKey = ''
  assessmentCache = null
  assessmentInflight = null
  assessmentInflightKey = ''
}
