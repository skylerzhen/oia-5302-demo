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
}

export interface FollowUpResult {
  mode: LocalAiMode
  text: string
  evidencePhrase: string
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
    language: 'en' | 'ar'
    text: string
  }
}

export interface AssessmentResult {
  mode: LocalAiMode
  recommendation: string
  dimensions: AssessmentDimension[]
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
  }
  speech?: {
    tts: boolean
    asr: boolean
    ttsProvider?: string
    asrProvider?: string
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

async function post<T>(path: string, payload: object): Promise<T> {
  const response = await window.fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(detail.error ?? `Local AI request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export const localAi = {
  status: () => window.fetch(apiUrl('/api/local-ai/status')).then((response) => {
    if (!response.ok) throw new Error(`Local AI status failed: ${response.status}`)
    return response.json() as Promise<LocalAiStatus>
  }),
  parseCv: (payload: {
    fileName: string
    isArabicScan: boolean
    sampleId?: string
    fileSize?: number
    fileType?: string
    documentText?: string
  }) => post<CvParseResult>('/api/local-ai/ocr/parse-cv', payload),
  generateQuestion: (payload: {
    language: 'en' | 'ar'
    purpose?: 'opening' | 'arabic-segment'
    candidateProfile?: CandidateProfileInput
  }) => post<QuestionResult>('/api/local-ai/llm/generate-question', payload),
  followUp: (payload: {
    answer: string
    language: 'en' | 'ar'
    priorTurns?: Array<{ speaker: string; language: string; text: string }>
  }) => post<FollowUpResult>('/api/local-ai/llm/follow-up', payload),
  generateAssessment: (payload: {
    turns: Array<{ id: string; speaker: string; language: string; text: string }>
    assessmentScore: number
    matchScore: number
    jobTitle?: string
  }) => post<AssessmentResult>('/api/local-ai/llm/generate-assessment', payload),
  transcribe: (payload: { transcript?: string; text?: string; language?: 'en' | 'ar' }) =>
    post<{ mode: LocalAiMode; transcript: string }>('/api/local-ai/asr/transcribe', payload),
  synthesize: (payload: { text: string; language: 'en' | 'ar' }) =>
    post<TtsResult>('/api/local-ai/tts/synthesize', payload),
}
