import { CANDIDATES, PRIMARY_CANDIDATE_ID } from '../data/candidates'
import type {
  AuditEntry,
  CandidateStepId,
  HrStepId,
  InterviewTurn,
  PipelineStatus,
  ProfileField,
  UserRole,
  UiLocale,
} from '../types'

const STORAGE_KEY = 'oia-5302-demo-session'

export interface DemoSession {
  role: UserRole | null
  offline: boolean
  candidateStep: CandidateStepId
  hrStep: HrStepId
  pipeline: PipelineStatus
  auditLog: AuditEntry[]
  fields: ProfileField[]
  interviewTurns: InterviewTurn[]
  assessmentScore: number
  shortlistedReason: string
  disqualifiedReason: string
  finalReason: string
  uiLocale: UiLocale
}

export const defaultPipeline: PipelineStatus = {
  profileSubmitted: false,
  diffAccepted: false,
  assessmentSubmitted: false,
  interviewCompleted: false,
  shortlisted: false,
  disqualified: false,
  finalDecisionMade: false,
  finalDecisionType: null,
}

export function defaultSession(): DemoSession {
  return {
    role: null,
    offline: false,
    candidateStep: 'C1',
    hrStep: 'H1',
    pipeline: { ...defaultPipeline },
    auditLog: [],
    fields: CANDIDATES.find((c) => c.id === PRIMARY_CANDIDATE_ID)!.fields.map((f) => ({ ...f })),
    interviewTurns: [],
    assessmentScore: 0,
    shortlistedReason: '',
    disqualifiedReason: '',
    finalReason: '',
    uiLocale: 'en' as UiLocale,
  }
}

export function loadSession(): DemoSession {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSession()
    const parsed = JSON.parse(raw) as Partial<DemoSession>
    return {
      ...defaultSession(),
      ...parsed,
      // Always show the public landing page on reload / new visit.
      role: null,
      offline: false,
      pipeline: { ...defaultPipeline, ...(parsed.pipeline ?? {}) },
    }
  } catch {
    return defaultSession()
  }
}

export function saveSession(session: DemoSession) {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...session,
      role: null,
      offline: false,
    }),
  )
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY)
}
