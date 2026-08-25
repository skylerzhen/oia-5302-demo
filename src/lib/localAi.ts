import { withApiAuthBody } from './apiAuth'
import type { ProfileTagGroup, WorkExperienceEntry } from '../types'

export type LocalAiMode = 'model' | 'adapter-fallback' | 'browser'

export interface VisemeMark {
  timeMs: number
  viseme: 'rest' | 'A' | 'E' | 'O' | 'M' | 'F'
}

export interface TtsResult {
  mode: LocalAiMode
  text: string
  audioAvailable: boolean
  useBrowserTts?: boolean
  audioBase64?: string
  mimeType?: string
  visemeMarks?: VisemeMark[]
  visemeSource?: 'azure' | 'estimated'
  ttsProvider?: 'azure' | 'openai' | 'edge' | 'browser'
}

export interface CvParseResult {
  mode: LocalAiMode
  fields: Array<{
    key: string
    value?: string
    status: 'parsed' | 'review' | 'missing'
    confidence?: number
    source: string
    evidence?: string
  }>
  skills?: ProfileTagGroup
  languages?: ProfileTagGroup
  workHistory?: Array<Omit<WorkExperienceEntry, 'id'>>
}

export interface FollowUpResult {
  mode: LocalAiMode
  text: string
  evidencePhrase: string
  action: 'follow_up' | 'closing'
}

export interface QuestionResult {
  mode: LocalAiMode
  text: string
}

export interface AssessmentDimension {
  label: string
  score: number
  maxScore: number
  rationale: string
  evidence: {
    id: string
    speaker: 'candidate' | 'avatar'
    language: 'en'
    text: string
  }
}

export interface AssessmentResult {
  mode: LocalAiMode
  recommendation: string
  dimensions: AssessmentDimension[]
}

export interface LlmMatchDimension {
  key: string
  label: string
  weight: number
  score: number
  maxScore: number
  evidence: string
  matched: boolean
}

export interface LlmMatchEntry {
  candidateId: string
  totalScore: number
  qualified: boolean
  matchedCount: number
  totalDimensions: number
  dimensions: LlmMatchDimension[]
  improvementTips: string[]
}

export interface MatchCandidatesResult {
  mode: LocalAiMode
  matches: LlmMatchEntry[]
}

export interface LiveAvatarSessionResult {
  sessionId: string
  livekitUrl: string
  livekitClientToken: string
  mode: 'liveavatar-lite'
}

export interface LiveAvatarSpeakResult {
  ok: boolean
  sessionId: string
  mode: 'liveavatar-lite'
  text?: string
  audioBase64?: string
  mimeType?: string
  sampleRate?: number
}

export interface HeyGenSpeakResult {
  mode: 'heygen'
  streamId: string
  hlsUrl: string
  avatarId?: string
  text?: string
  ttsProvider?: string
}

export interface LocalAiStatus {
  mode: LocalAiMode
  provider?: string
  label?: string
  services: {
    ocr: boolean
    llm: boolean
    asr: boolean
    tts: boolean
    avatar?: boolean
  }
  speech?: {
    tts: boolean
    asr: boolean
    ttsProvider?: string
    asrProvider?: string
    visemeSource?: string
    avatarProvider?: 'liveavatar' | 'heygen' | '2d'
  }
  avatar?: {
    configured: boolean
    avatarId?: string
    mode?: string
  }
}

export interface CandidateProfileInput {
  name?: string
  email?: string
  experience?: string
  education?: string
  certification?: string
}

const API_BASE = import.meta.env.VITE_LLM_API_URL?.replace(/\/$/, '') ?? ''

function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

async function post<T>(path: string, payload: object, timeoutMs = 30_000): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await window.fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withApiAuthBody(payload)),
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = await response.json().catch(() => ({})) as { error?: string }
      throw new Error(detail.error ?? `Local AI request failed: ${response.status}`)
    }
    return response.json() as Promise<T>
  } finally {
    window.clearTimeout(timer)
  }
}

export const localAi = {
  status: () => window.fetch(apiUrl('/api/local-ai/status')).then((response) => {
    if (!response.ok) throw new Error(`Local AI status failed: ${response.status}`)
    return response.json() as Promise<LocalAiStatus>
  }),
  parseCv: (payload: {
    sampleId?: string
    fileName: string
    isScannedPdf?: boolean
    fileSize?: number
    fileType?: string
    documentText?: string
  }) => post<CvParseResult>('/api/local-ai/ocr/parse-cv', payload),
  generateQuestion: (payload: {
    purpose?: 'opening'
    candidateProfile?: CandidateProfileInput
  }) => post<QuestionResult>('/api/local-ai/llm/generate-question', payload),
  followUp: (payload: {
    answer: string
    priorTurns?: Array<{ speaker: string; language: string; text: string }>
    candidateProfile?: CandidateProfileInput & { companyName?: string }
  }) => post<FollowUpResult>('/api/local-ai/llm/follow-up', payload, 45_000),
  generateAssessment: (payload: {
    turns: Array<{ id: string; speaker: string; language: string; text: string }>
    assessmentScore: number
    matchScore: number
    jobTitle?: string
  }) => post<AssessmentResult>('/api/local-ai/llm/generate-assessment', payload),
  matchCandidates: (payload: {
    candidates: Array<{ candidateId: string; name: string; cvText: string }>
    jobDescription?: string
  }) => post<MatchCandidatesResult>('/api/local-ai/llm/match-candidates', payload),
  transcribe: (payload: {
    transcript?: string
    text?: string
    pcmBase64?: string
    sampleRate?: number
  }) => post<{ mode: LocalAiMode; transcript: string; asrProvider?: string }>('/api/local-ai/asr/transcribe', payload),
  synthesize: (payload: { text: string }) =>
    post<TtsResult>('/api/local-ai/tts/synthesize', payload),
  heygenSpeak: (payload: { text?: string; audioBase64?: string; mimeType?: string }) =>
    post<HeyGenSpeakResult>('/api/heygen/speak', payload, 55_000),
  liveavatarSessionStart: () =>
    post<LiveAvatarSessionResult>('/api/liveavatar/session/start', {}, 45_000),
  liveavatarSessionStop: (payload: { sessionId: string }) =>
    post<{ ok: boolean }>('/api/liveavatar/session/stop', payload, 10_000),
  liveavatarSpeak: (payload: { sessionId: string; text: string }) =>
    post<LiveAvatarSpeakResult>('/api/liveavatar/speak', payload, 90_000),
}
