export type UserRole = 'candidate' | 'hr' | 'journey'

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

export interface ProfileTagGroup {
  items: string[]
  status: FieldStatus
  evidence: string
  source: string
}

export interface WorkExperienceEntry {
  id: string
  company: string
  title: string
  start: string
  end: string
  industry?: string
  location?: string
  responsibilities: string[]
  status: FieldStatus
  evidence: string
  source: string
}

export interface CvParsePayload {
  fields: ProfileField[]
  skills: ProfileTagGroup
  languages: ProfileTagGroup
  workHistory: WorkExperienceEntry[]
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

export type AvatarExpression = 'neutral' | 'supportive' | 'curious' | 'gesture'

export interface InterviewQuestion {
  id: string
  textEn: string
  textAr?: string
  dimension?: string
  source: 'custom' | 'jd'
  /** HR rubric — what a strong answer should contain (governance / LLM grounding). */
  strongAnswerRubric?: string
}

export type InterviewConfigMode = 'fixed_only' | 'fixed_then_adaptive' | 'adaptive'

/** HR-authored interview blueprint — versioned, passed to C4 orchestrator. */
export interface InterviewConfig {
  version: string
  jdQuestionSetId: string
  mode: InterviewConfigMode
  customQuestions: InterviewQuestion[]
  enabledJdQuestionIds: string[]
  followUpDimensions: string[]
  prohibitedTopics: string[]
  minAnswers: number
  maxAnswers: number
  savedAt?: string
  /** Per-question strong-answer rubric keyed by question id (custom + JD). */
  questionRubrics?: Record<string, string>
}

/** One-shot question HR pushes during a live C4 interview (consumed on candidate's next turn). */
export interface HrInjectedQuestion {
  textEn: string
  queuedAt: string
}

export interface InterviewTurn {
  id: string
  speaker: 'avatar' | 'candidate'
  language: 'en'
  text: string
  recordedAt?: string
  /** Milliseconds from session recording start — used to seek HR playback. */
  offsetMs?: number
  expression?: 'neutral' | 'supportive' | 'curious' | 'gesture'
  /** Set on avatar follow-up turns so reviewers can see LLM grounding. */
  followUpMeta?: {
    mode: 'model' | 'adapter-fallback'
    evidencePhrase?: string
    targetDimension?: string
    questionSource?: 'custom' | 'jd' | 'adaptive'
  }
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

export interface InterviewRecordingMeta {
  applicationId: string
  startedAt: string
  endedAt: string
  durationMs: number
  mimeType: string
  turnCount: number
  byteLength?: number
}
