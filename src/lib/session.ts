import { emptyProfileFields, emptyProfileTagGroup, mergeProfileFields } from '../data/cvProfileSchema'
import { defaultInterviewConfig, loadInterviewConfig, normalizeInterviewConfig } from './interviewConfig'
import type {
  AuditEntry,
  CandidateStepId,
  HrStepId,
  HrInjectedQuestion,
  IntegrationSyncEvent,
  InterviewConfig,
  InterviewTurn,
  PipelineStatus,
  ProfileField,
  ProfileTagGroup,
  UserRole,
  WorkExperienceEntry,
} from '../types'

export const DEMO_SESSION_STORAGE_KEY = 'oia-5302-demo-session'

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
  hrInjectedQuestion: HrInjectedQuestion | null
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
    hrInjectedQuestion: null,
    assessmentScore: 0,
    shortlistedReason: '',
    disqualifiedReason: '',
    finalReason: '',
  }
}

function readStoredSessionRaw(): string | null {
  let raw = localStorage.getItem(DEMO_SESSION_STORAGE_KEY)
  if (raw) return raw
  const legacy = sessionStorage.getItem(DEMO_SESSION_STORAGE_KEY)
  if (!legacy) return null
  localStorage.setItem(DEMO_SESSION_STORAGE_KEY, legacy)
  sessionStorage.removeItem(DEMO_SESSION_STORAGE_KEY)
  return legacy
}

export function parseStoredSession(raw: string): DemoSession {
  const parsed = JSON.parse(raw) as Partial<DemoSession>
  return {
    ...defaultSession(),
    ...parsed,
    role: null,
    offline: false,
    pipeline: { ...defaultPipeline, ...(parsed.pipeline ?? {}) },
    integrationSyncs: parsed.integrationSyncs ?? [],
    fields: mergeProfileFields(Array.isArray(parsed.fields) ? parsed.fields : []),
    profileSkills: parsed.profileSkills ?? emptyProfileTagGroup(),
    profileLanguages: parsed.profileLanguages ?? emptyProfileTagGroup(),
    profileWorkHistory: Array.isArray(parsed.profileWorkHistory) ? parsed.profileWorkHistory : [],
    interviewTurns: Array.isArray(parsed.interviewTurns) ? parsed.interviewTurns : [],
    interviewConfig: normalizeInterviewConfig(parsed.interviewConfig ?? loadInterviewConfig()),
    hrInjectedQuestion: parsed.hrInjectedQuestion?.textEn
      ? { textEn: String(parsed.hrInjectedQuestion.textEn), queuedAt: parsed.hrInjectedQuestion.queuedAt ?? new Date().toISOString() }
      : null,
  }
}

export function loadSession(): DemoSession {
  try {
    const raw = readStoredSessionRaw()
    if (!raw) return defaultSession()
    return parseStoredSession(raw)
  } catch {
    return defaultSession()
  }
}

export function saveSession(session: DemoSession) {
  localStorage.setItem(
    DEMO_SESSION_STORAGE_KEY,
    JSON.stringify({
      ...session,
      role: null,
      offline: false,
    }),
  )
}

export function clearSession() {
  localStorage.removeItem(DEMO_SESSION_STORAGE_KEY)
  sessionStorage.removeItem(DEMO_SESSION_STORAGE_KEY)
}
