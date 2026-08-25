import { emptyProfileFields, emptyProfileTagGroup, mergeProfileFields } from '../data/cvProfileSchema'
import { defaultInterviewConfig, loadInterviewConfig, normalizeInterviewConfig } from './interviewConfig'
import type {
  AuditEntry,
  CandidateStepId,
  HrStepId,
  IntegrationSyncEvent,
  InterviewConfig,
  InterviewTurn,
  PipelineStatus,
  ProfileField,
  ProfileTagGroup,
  UserRole,
  WorkExperienceEntry,
} from '../types'

const STORAGE_KEY = 'oia-5302-demo-session'

export interface DemoSession {
  role: UserRole | null
  offline: boolean
  candidateStep: CandidateStepId
  hrStep: HrStepId
  pipeline: PipelineStatus
  auditLog: AuditEntry[]
  integrationSyncs: IntegrationSyncEvent[]
  fields: ProfileField[]
  profileSkills: ProfileTagGroup
  profileLanguages: ProfileTagGroup
  profileWorkHistory: WorkExperienceEntry[]
  interviewTurns: InterviewTurn[]
  interviewConfig: InterviewConfig
  assessmentScore: number
  shortlistedReason: string
  disqualifiedReason: string
  finalReason: string
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
    integrationSyncs: [],
    fields: emptyProfileFields(),
    profileSkills: emptyProfileTagGroup(),
    profileLanguages: emptyProfileTagGroup(),
    profileWorkHistory: [],
    interviewTurns: [],
    interviewConfig: defaultInterviewConfig(),
    assessmentScore: 0,
    shortlistedReason: '',
    disqualifiedReason: '',
    finalReason: '',
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
      integrationSyncs: parsed.integrationSyncs ?? [],
      fields: mergeProfileFields(Array.isArray(parsed.fields) ? parsed.fields : []),
      profileSkills: parsed.profileSkills ?? emptyProfileTagGroup(),
      profileLanguages: parsed.profileLanguages ?? emptyProfileTagGroup(),
      profileWorkHistory: Array.isArray(parsed.profileWorkHistory) ? parsed.profileWorkHistory : [],
      interviewConfig: normalizeInterviewConfig(parsed.interviewConfig ?? loadInterviewConfig()),
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
