export type UserRole = 'candidate' | 'hr'

export type CandidateStepId = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6'
export type HrStepId = 'H1' | 'H2' | 'H3' | 'H4' | 'H5'
export type StepId = CandidateStepId | HrStepId

export type FieldStatus = 'parsed' | 'review' | 'missing'

export type DecisionType = 'shortlist' | 'disqualify' | 'hire_recommendation'

export interface ProfileField {
  key: string
  label: string
  value: string
  status: FieldStatus
  evidence: string
  source: string
}

export interface CandidateProfile {
  id: string
  name: string
  email: string
  nationality: string
  yearsExperience: number
  education: string
  skills: string[]
  cvText: string
  cvFile?: string
  fields: ProfileField[]
}

export interface MatchDimension {
  key: string
  label: string
  weight: number
  score: number
  maxScore: number
  evidence: string
  matched: boolean
}

export interface CandidateMatch {
  candidateId: string
  candidate: CandidateProfile
  totalScore: number
  matchedCount: number
  totalDimensions: number
  qualified: boolean
  dimensions: MatchDimension[]
}

export interface McqQuestion {
  id: string
  prompt: string
  options: string[]
  correctIndex: number
}

export type Viseme = 'rest' | 'A' | 'E' | 'O' | 'M' | 'F'

export interface InterviewTurn {
  id: string
  speaker: 'avatar' | 'candidate'
  language: 'en'
  text: string
  expression?: 'neutral' | 'supportive' | 'curious' | 'gesture'
}

export interface AuditEntry {
  id: string
  timestamp: string
  actor: string
  action: string
  detail: string
  step: string
}

export type IntegrationSystem = 'jadarah' | 'oracle-ebs'

export interface IntegrationSyncEvent {
  id: string
  system: IntegrationSystem
  systemLabel: string
  endpoint: string
  operation: string
  refId: string
  timestamp: string
  step: string
}

export interface PipelineStatus {
  profileSubmitted: boolean
  diffAccepted: boolean
  assessmentSubmitted: boolean
  interviewCompleted: boolean
  shortlisted: boolean
  disqualified: boolean
  finalDecisionMade: boolean
  finalDecisionType: 'hire' | 'reject' | null
}
