import { CANDIDATES, PRIMARY_CANDIDATE_ID } from '../data/candidates'
import { buildCvTextForMatching } from './cvProfileText'
import { localAi, type LocalAiMode } from './localAi'
import {
  applyLlmMatchToCandidate,
  rankCandidates,
  type CandidateMatchWithTips,
} from './matching'
import type { CandidateProfile, ProfileField } from '../types'

export type LlmMatchLoadState = {
  matches: CandidateMatchWithTips[]
  mode: LocalAiMode | 'unavailable'
  loading: boolean
  error: string
}

export function buildCandidatePoolForMatching(fields: ProfileField[]) {
  return CANDIDATES.map((candidate) => {
    const cvText = candidate.id === PRIMARY_CANDIDATE_ID
      ? buildCvTextForMatching(fields, candidate)
      : candidate.cvText

    return {
      candidateId: candidate.id,
      name: candidate.id === PRIMARY_CANDIDATE_ID
        ? (fields.find((f) => f.key === 'name')?.value || candidate.name)
        : candidate.name,
      cvText,
    }
  })
}

export async function loadLlmMatches(fields: ProfileField[]): Promise<{
  matches: CandidateMatchWithTips[]
  mode: LocalAiMode | 'unavailable'
}> {
  const pool = buildCandidatePoolForMatching(fields)

  try {
    const result = await localAi.matchCandidates({ candidates: pool })
    const byId = new Map(result.matches.map((m) => [m.candidateId, m]))
    const matches = CANDIDATES
      .map((candidate) => {
        const llm = byId.get(candidate.id)
        if (!llm) return null
        return applyLlmMatchToCandidate(candidate, llm)
      })
      .filter((m): m is CandidateMatchWithTips => m !== null)
      .sort((a, b) => b.totalScore - a.totalScore)

    return { matches, mode: result.mode }
  } catch {
    return {
      matches: rankCandidates().map((m) => ({ ...m, improvementTips: [] })),
      mode: 'unavailable',
    }
  }
}

export function getPrimaryMatch(
  matches: CandidateMatchWithTips[],
  candidate?: CandidateProfile,
): CandidateMatchWithTips | undefined {
  return matches.find((m) => m.candidateId === PRIMARY_CANDIDATE_ID)
    ?? (candidate ? matches.find((m) => m.candidateId === candidate.id) : undefined)
    ?? matches[0]
}
