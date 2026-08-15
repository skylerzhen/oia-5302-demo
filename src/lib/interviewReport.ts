import type { CandidateMatch, InterviewTurn } from '../types'

export interface EvaluationDimension {
  label: string
  score: number
  maxScore: number
  rationale: string
  evidence: InterviewTurn
}

export interface InterviewEvaluationReport {
  recommendation: string
  dimensions: EvaluationDimension[]
}

function candidateEvidence(turns: InterviewTurn[], language: 'en' | 'ar') {
  return turns.find((turn) => turn.speaker === 'candidate' && turn.language === language)
    ?? turns.find((turn) => turn.speaker === 'candidate')
    ?? {
      id: 'no-evidence',
      speaker: 'candidate' as const,
      language,
      text: 'No candidate response was recorded.',
    }
}

export function buildInterviewEvaluationReport(
  turns: InterviewTurn[],
  match: CandidateMatch,
  assessmentScore: number,
): InterviewEvaluationReport {
  const englishEvidence = candidateEvidence(turns, 'en')
  const arabicEvidence = candidateEvidence(turns, 'ar')
  const evidenceAlignedScore = Math.min(100, Math.round((match.totalScore + assessmentScore) / 2))

  return {
    recommendation: evidenceAlignedScore >= 70
      ? 'Proceed to a human final decision — evidence supports the shortlist.'
      : 'Human review recommended — evidence is incomplete or below the role threshold.',
    dimensions: [
      {
        label: 'Portfolio and risk communication',
        score: Math.min(100, match.totalScore),
        maxScore: 100,
        rationale: 'The candidate described a portfolio variance review and how findings were presented to stakeholders.',
        evidence: englishEvidence,
      },
      {
        label: 'Bilingual interview communication',
        score: arabicEvidence.id === 'no-evidence' ? 0 : 85,
        maxScore: 100,
        rationale: 'The Arabic response is retained as a separate, reviewable transcript citation.',
        evidence: arabicEvidence,
      },
      {
        label: 'Assessment and role fit',
        score: evidenceAlignedScore,
        maxScore: 100,
        rationale: `Assessment ${assessmentScore}% combined with an evidence-linked match score of ${match.totalScore}%.`,
        evidence: englishEvidence,
      },
    ],
  }
}
