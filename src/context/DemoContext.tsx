import { createContext, useContext } from 'react'
import type {
  AuditEntry,
  CandidateStepId,
  HrStepId,
  IntegrationSyncEvent,
  InterviewTurn,
  PipelineStatus,
  ProfileField,
  ProfileTagGroup,
  InterviewConfig,
  HrInjectedQuestion,
  InterviewRecordingMeta,
  UserRole,
  WorkExperienceEntry,
} from '../types'

export interface DemoContextValue {
  role: UserRole | null
  setRole: (role: UserRole) => void
  offline: boolean
  setOffline: (v: boolean) => void
  auditLog: AuditEntry[]
  log: (actor: string, action: string, detail: string, step: string) => void
  integrationSyncs: IntegrationSyncEvent[]
  syncIntegration: (
    key: import('../lib/simulatedIntegrations').SimulatedIntegrationKey,
    step: string,
    detail?: string,
  ) => IntegrationSyncEvent
  applicationId: string
  cvUploadId: string | null
  interviewRecording: InterviewRecordingMeta | null
  setCvUploadId: (uploadId: string | null) => void
  setInterviewRecording: (meta: InterviewRecordingMeta | null) => void
  ensureApplicationId: () => string
  pipeline: PipelineStatus
  setPipeline: (patch: Partial<PipelineStatus>) => void
  fields: ProfileField[]
  setFields: React.Dispatch<React.SetStateAction<ProfileField[]>>
  profileSkills: ProfileTagGroup
  setProfileSkills: React.Dispatch<React.SetStateAction<ProfileTagGroup>>
  profileLanguages: ProfileTagGroup
  setProfileLanguages: React.Dispatch<React.SetStateAction<ProfileTagGroup>>
  profileWorkHistory: WorkExperienceEntry[]
  setProfileWorkHistory: React.Dispatch<React.SetStateAction<WorkExperienceEntry[]>>
  interviewTurns: InterviewTurn[]
  setInterviewTurns: React.Dispatch<React.SetStateAction<InterviewTurn[]>>
  interviewConfig: InterviewConfig
  setInterviewConfig: React.Dispatch<React.SetStateAction<InterviewConfig>>
  hrInjectedQuestion: HrInjectedQuestion | null
  setHrInjectedQuestion: (q: HrInjectedQuestion | null) => void
  assessmentScore: number
  setAssessmentScore: (n: number) => void
  shortlistedReason: string
  setShortlistedReason: (s: string) => void
  disqualifiedReason: string
  setDisqualifiedReason: (s: string) => void
  finalReason: string
  setFinalReason: (s: string) => void
  candidateStep: CandidateStepId
  setCandidateStep: (step: CandidateStepId) => void
  hrStep: HrStepId
  setHrStep: (step: HrStepId) => void
  logout: () => void
  returnToEntry: () => void
  seedDemoForHr: () => void
  seedDemoForCandidateC4: () => void
}

export const DemoContext = createContext<DemoContextValue | null>(null)

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
