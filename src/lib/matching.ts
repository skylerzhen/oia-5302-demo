import { CANDIDATES } from '../data/candidates'
import { FINANCE_JOB } from '../data/job'
import type { CandidateMatch, CandidateProfile, MatchDimension } from '../types'

export type CandidateMatchWithTips = CandidateMatch & {
  improvementTips?: string[]
}

export function applyLlmMatchToCandidate(
  candidate: CandidateProfile,
  llm: {
    totalScore: number
    qualified: boolean
    matchedCount: number
    totalDimensions: number
    dimensions: MatchDimension[]
    improvementTips?: string[]
  },
): CandidateMatchWithTips {
  return {
    candidateId: candidate.id,
    candidate,
    totalScore: llm.totalScore,
    matchedCount: llm.matchedCount,
    totalDimensions: llm.totalDimensions,
    qualified: llm.qualified,
    dimensions: llm.dimensions,
    improvementTips: llm.improvementTips ?? [],
  }
}

function scoreCandidate(candidate: CandidateProfile): CandidateMatch {
  const text = `${candidate.cvText} ${candidate.skills.join(' ')}`.toLowerCase()

  const rules: Array<{
    key: string
    label: string
    weight: number
    test: () => { matched: boolean; evidence: string; score: number }
  }> = [
    {
      key: 'portfolio',
      label: 'Portfolio analysis',
      weight: 20,
      test: () => ({
        matched: text.includes('portfolio'),
        evidence: candidate.cvText.split('\n').find((l) => l.toLowerCase().includes('portfolio')) ?? 'Portfolio analysis mentioned',
        score: text.includes('portfolio') ? 20 : 4,
      }),
    },
    {
      key: 'risk',
      label: 'Risk reporting',
      weight: 15,
      test: () => ({
        matched: text.includes('risk'),
        evidence: candidate.cvText.split('\n').find((l) => l.toLowerCase().includes('risk')) ?? 'Risk reporting mentioned',
        score: text.includes('risk') ? 15 : 3,
      }),
    },
    {
      key: 'excel',
      label: 'Financial modeling (Excel)',
      weight: 15,
      test: () => ({
        matched: text.includes('excel') || text.includes('model'),
        evidence: 'Excel modeling referenced in skills/experience',
        score: text.includes('excel') || text.includes('model') ? 15 : 5,
      }),
    },
    {
      key: 'experience',
      label: 'Years in finance',
      weight: 15,
      test: () => ({
        matched: candidate.yearsExperience >= 5,
        evidence: `${candidate.yearsExperience} years experience`,
        score: Math.min(15, Math.round((candidate.yearsExperience / 8) * 15)),
      }),
    },
    {
      key: 'education',
      label: 'Relevant degree',
      weight: 15,
      test: () => ({
        matched: /finance|economics|accounting|mba|msc/i.test(candidate.education),
        evidence: candidate.education,
        score: /finance|economics|accounting|mba|msc/i.test(candidate.education) ? 15 : 2,
      }),
    },
    {
      key: 'communication',
      label: 'Arabic & English communication',
      weight: 20,
      test: () => ({
        matched: /communication|reporting|stakeholder|present/i.test(text),
        evidence: candidate.cvText.split('\n').find((l) => /report|stakeholder|communic/i.test(l)) ?? 'Communication evidence in CV',
        score: /communication|reporting|stakeholder|present/i.test(text) ? 20 : 6,
      }),
    },
  ]

  const dimensions: MatchDimension[] = rules.map((rule) => {
    const result = rule.test()
    return {
      key: rule.key,
      label: rule.label,
      weight: rule.weight,
      score: result.score,
      maxScore: rule.weight,
      evidence: result.evidence,
      matched: result.matched,
    }
  })

  const totalScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) /
      FINANCE_JOB.dimensions.reduce((sum, d) => sum + d.weight, 0) *
      100,
  )

  const matchedCount = dimensions.filter((d) => d.matched).length

  return {
    candidateId: candidate.id,
    candidate,
    totalScore,
    matchedCount,
    totalDimensions: dimensions.length,
    qualified: totalScore >= 60,
    dimensions,
  }
}

export function rankCandidates(): CandidateMatch[] {
  return CANDIDATES.map(scoreCandidate).sort((a, b) => b.totalScore - a.totalScore)
}

export function getMatchById(id: string): CandidateMatch | undefined {
  return rankCandidates().find((m) => m.candidateId === id)
}

/** Minimum candidate answers before the submit / closing step unlocks. */
export const INTERVIEW_MIN_CANDIDATE_ANSWERS = 3

export function buildInterviewFollowUp(answer: string, round = 0): string {
  const hook = answer.trim().replace(/\s+/g, ' ')
  const snippet = hook.split(/[.!?]/)[0]?.trim().slice(0, 72) || hook.slice(0, 72) || 'your previous response'
  const templates = [
    `You mentioned "${snippet}" — how did you quantify the risk impact in that situation?`,
    `On "${snippet}", which KPIs or thresholds did you use before recommending action?`,
    `Who were the key stakeholders for "${snippet.slice(0, 48)}", and what was the outcome?`,
    `If conditions worsened after "${snippet.slice(0, 42)}", what would you change in your approach?`,
  ]
  return templates[Math.min(round, templates.length - 1)]
}

export type InterviewUiPhase =
  | 'idle'
  | 'english_answer'
  | 'ready_to_finish'

export function getInterviewUiPhase(
  turns: { speaker: string; language: string }[],
  completed: boolean,
): InterviewUiPhase {
  if (completed) return 'ready_to_finish'
  if (turns.length === 0) return 'idle'

  const candidateTurns = turns.filter((t) => t.speaker === 'candidate')
  const avatarTurns = turns.filter((t) => t.speaker === 'avatar')

  if (candidateTurns.length === 0) return 'english_answer'

  const minAnswers = INTERVIEW_MIN_CANDIDATE_ANSWERS
  if (
    candidateTurns.length >= minAnswers &&
    avatarTurns.length >= candidateTurns.length + 1
  ) {
    return 'ready_to_finish'
  }

  return 'english_answer'
}

export function interviewAnswerProgress(turns: { speaker: string }[]) {
  const answered = turns.filter((t) => t.speaker === 'candidate').length
  return {
    answered,
    required: INTERVIEW_MIN_CANDIDATE_ANSWERS,
    currentRound: Math.min(answered + 1, INTERVIEW_MIN_CANDIDATE_ANSWERS),
  }
}

export function buildImprovementTips(match: CandidateMatch): string[] {
  const tips: string[] = []
  for (const dim of match.dimensions) {
    if (!dim.matched) {
      tips.push(`Strengthen evidence for ${dim.label.toLowerCase()} — add a concrete example in your CV.`)
    }
  }
  if (tips.length === 0) {
    tips.push('Profile aligns well. Consider adding quantified outcomes (%, OMR impact) to stand out.')
  }
  return tips
}
