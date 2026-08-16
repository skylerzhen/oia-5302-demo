import { createContext, useContext } from 'react'
import type {
  AuditEntry,
  CandidateStepId,
  HrStepId,
  IntegrationSyncEvent,
  InterviewTurn,
  PipelineStatus,
  ProfileField,
  UserRole,
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
  pipeline: PipelineStatus
  setPipeline: (patch: Partial<PipelineStatus>) => void
  fields: ProfileField[]
  setFields: React.Dispatch<React.SetStateAction<ProfileField[]>>
  interviewTurns: InterviewTurn[]
  setInterviewTurns: React.Dispatch<React.SetStateAction<InterviewTurn[]>>
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
  seedDemoForHr: () => void
  seedDemoForCandidateC4: () => void
}

export const DemoContext = createContext<DemoContextValue | null>(null)

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
