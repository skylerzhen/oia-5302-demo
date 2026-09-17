import type { AssessmentResult, LocalAiMode } from './localAi'
import type { CandidateMatchWithTips } from './matching'

type MatchResult = {
  matches: CandidateMatchWithTips[]
  mode: LocalAiMode | 'unavailable'
}

const MATCH_STORAGE_KEY = 'oia5302-llm-match-cache'
const ASSESSMENT_STORAGE_KEY = 'oia5302-llm-assessment-cache'

let matchCache: ({ key: string } & MatchResult) | null = null
let matchInflight: Promise<MatchResult> | null = null
let matchInflightKey = ''

let assessmentCache: { key: string; result: AssessmentResult } | null = null
let assessmentInflight: Promise<AssessmentResult> | null = null
let assessmentInflightKey = ''

function readStoredMatch(key: string): MatchResult | null {
  try {
    const raw = localStorage.getItem(MATCH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { key?: string; matches?: MatchResult['matches']; mode?: MatchResult['mode'] }
    if (parsed?.key !== key || !Array.isArray(parsed.matches) || !parsed.mode) return null
    return { matches: parsed.matches, mode: parsed.mode }
  } catch {
    return null
  }
}

function writeStoredMatch(key: string, result: MatchResult) {
  try {
    localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify({ key, ...result }))
  } catch {
    // ignore quota errors
  }
}

function readStoredAssessment(key: string): AssessmentResult | null {
  try {
    const raw = localStorage.getItem(ASSESSMENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { key?: string; result?: AssessmentResult }
    if (parsed?.key !== key || !parsed.result) return null
    return parsed.result
  } catch {
    return null
  }
}

function writeStoredAssessment(key: string, result: AssessmentResult) {
  try {
    localStorage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify({ key, result }))
  } catch {
    // ignore quota errors
  }
}

export function buildAssessmentKey(input: {
  assessmentScore: number
  turns: Array<{ id: string; text: string }>
  questionRubrics?: unknown
}) {
  const turnSig = input.turns.map((turn) => `${turn.id}:${turn.text.length}`).join(';')
  const rubricSig = input.questionRubrics == null ? '' : JSON.stringify(input.questionRubrics)
  return `${input.assessmentScore}|${turnSig}|${rubricSig}`
}

export async function cachedLlmMatch(
  key: string,
  loader: () => Promise<MatchResult>,
): Promise<MatchResult> {
  if (matchCache?.key === key) return matchCache

  const stored = readStoredMatch(key)
  if (stored) {
    matchCache = { key, ...stored }
    return stored
  }

  if (matchInflight && matchInflightKey === key) return matchInflight

  matchInflightKey = key
  matchInflight = loader().then((result) => {
    matchCache = { key, ...result }
    writeStoredMatch(key, result)
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

  const stored = readStoredAssessment(key)
  if (stored) {
    assessmentCache = { key, result: stored }
    return stored
  }

  if (assessmentInflight && assessmentInflightKey === key) return assessmentInflight

  assessmentInflightKey = key
  assessmentInflight = loader().then((result) => {
    assessmentCache = { key, result }
    writeStoredAssessment(key, result)
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
  try {
    localStorage.removeItem(MATCH_STORAGE_KEY)
    localStorage.removeItem(ASSESSMENT_STORAGE_KEY)
  } catch {
    // ignore
  }
}
