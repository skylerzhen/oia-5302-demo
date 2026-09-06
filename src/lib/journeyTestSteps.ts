import type { CandidateStepId, HrStepId, PipelineStatus, ProfileField } from '../types'

export type JourneyStepStatus = 'pending' | 'active' | 'complete'

export interface JourneyTestStep {
  id: string
  order: number
  label: string
  detail: string
  candidateStep?: CandidateStepId
  hrStep?: HrStepId
  surface: 'candidate' | 'hr' | 'both'
}

export const JOURNEY_TEST_STEPS: JourneyTestStep[] = [
  { id: 'J01', order: 1, label: 'Apply and upload CV', detail: 'Candidate submits CV for parsing', candidateStep: 'C1', surface: 'candidate' },
  { id: 'J02', order: 2, label: 'Confirm extracted profile', detail: 'Candidate reviews AI extraction', candidateStep: 'C2', surface: 'candidate' },
  { id: 'J03', order: 3, label: 'Review queues and JD config', detail: 'HR ranks pool and sets interview blueprint', hrStep: 'H1', surface: 'hr' },
  { id: 'J04', order: 4, label: 'Technical assessment', detail: 'Role MCQ auto-scored', candidateStep: 'C3', surface: 'candidate' },
  { id: 'J05', order: 5, label: 'AI avatar interview', detail: 'LiveAvatar segment with transcript', candidateStep: 'C4', surface: 'candidate' },
  { id: 'J06', order: 6, label: 'Interview recording review', detail: 'HR replays turns and LLM evaluation', hrStep: 'H3', surface: 'hr' },
  { id: 'J07', order: 7, label: 'Match score and tips', detail: 'Candidate command centre composite', candidateStep: 'C5', surface: 'candidate' },
  { id: 'J08', order: 8, label: 'Shortlist or decline', detail: 'HR gate with written reason', hrStep: 'H2', surface: 'hr' },
  { id: 'J09', order: 9, label: 'Final human decision', detail: 'Weighted composite and hire/reject', hrStep: 'H4', surface: 'hr' },
  { id: 'J10', order: 10, label: 'Application status', detail: 'Candidate sees HR outcome', candidateStep: 'C6', surface: 'candidate' },
  { id: 'J11', order: 11, label: 'Audit and demo complete', detail: 'Recruiter audit trail export', hrStep: 'H5', surface: 'hr' },
  { id: 'J12', order: 12, label: 'Dual-portal verification', detail: 'Same record across Candidate and HR tabs', surface: 'both' },
]

function hasCvData(fields: ProfileField[]) {
  return fields.some((f) => f.value.trim().length > 0)
}

export function resolveJourneyStepStatus(
  step: JourneyTestStep,
  pipeline: PipelineStatus,
  fields: ProfileField[],
  interviewTurnCount: number,
  candidateStep: CandidateStepId,
  hrStep: HrStepId,
): JourneyStepStatus {
  const p = pipeline
  const hasCv = hasCvData(fields)

  switch (step.id) {
    case 'J01':
      return hasCv || p.profileSubmitted ? 'complete' : candidateStep === 'C1' ? 'active' : 'pending'
    case 'J02':
      if (p.profileSubmitted) return 'complete'
      return candidateStep === 'C2' ? 'active' : hasCv ? 'active' : 'pending'
    case 'J03':
      if (p.profileSubmitted && hasCv) return 'complete'
      return hrStep === 'H1' ? 'active' : hasCv ? 'active' : 'pending'
    case 'J04':
      if (p.assessmentSubmitted) return 'complete'
      return candidateStep === 'C3' ? 'active' : p.profileSubmitted ? 'active' : 'pending'
    case 'J05':
      if (p.interviewCompleted) return 'complete'
      if (interviewTurnCount > 0 || candidateStep === 'C4') return 'active'
      return p.assessmentSubmitted ? 'active' : 'pending'
    case 'J06':
      if (p.interviewCompleted && interviewTurnCount > 0) return 'complete'
      return hrStep === 'H3' && interviewTurnCount > 0 ? 'active' : interviewTurnCount > 0 ? 'active' : 'pending'
    case 'J07':
      if (p.interviewCompleted && candidateStep === 'C6') return 'complete'
      return candidateStep === 'C5' ? 'active' : p.interviewCompleted ? 'active' : 'pending'
    case 'J08':
      if (p.shortlisted || p.disqualified) return 'complete'
      return hrStep === 'H2' ? 'active' : p.interviewCompleted ? 'active' : 'pending'
    case 'J09':
      if (p.finalDecisionMade) return 'complete'
      return hrStep === 'H4' ? 'active' : p.shortlisted ? 'active' : 'pending'
    case 'J10':
      if (p.finalDecisionMade) return 'complete'
      return candidateStep === 'C6' ? 'active' : p.finalDecisionMade ? 'complete' : 'pending'
    case 'J11':
      return p.finalDecisionMade && hrStep === 'H5' ? 'complete' : p.finalDecisionMade ? 'active' : 'pending'
    case 'J12':
      return p.profileSubmitted && (p.shortlisted || p.disqualified || p.finalDecisionMade)
        ? 'complete'
        : hasCv
          ? 'active'
          : 'pending'
    default:
      return 'pending'
  }
}
