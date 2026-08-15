export type LocalAiMode = 'model' | 'adapter-fallback'

export interface CvParseResult {
  mode: LocalAiMode
  fields: Array<{
    key: string
    value?: string
    status: 'parsed' | 'review' | 'missing'
    confidence?: number
    source: string
  }>
}

export interface FollowUpResult {
  mode: LocalAiMode
  text: string
  evidencePhrase: string
}

export interface LocalAiStatus {
  mode: LocalAiMode
  services: {
    ocr: boolean
    llm: boolean
    asr: boolean
    tts: boolean
  }
}

async function post<T>(path: string, payload: object): Promise<T> {
  const response = await window.fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(`Local AI request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export const localAi = {
  status: () => window.fetch('/api/local-ai/status').then((response) => response.json() as Promise<LocalAiStatus>),
  parseCv: (payload: {
    fileName: string
    isArabicScan: boolean
    sampleId?: string
    fileSize?: number
    fileType?: string
  }) => post<CvParseResult>('/api/local-ai/ocr/parse-cv', payload),
  followUp: (answer: string, language: 'en' | 'ar') =>
    post<FollowUpResult>('/api/local-ai/llm/follow-up', { answer, language }),
  transcribe: (audioReference: string) =>
    post<{ mode: LocalAiMode; transcript: string }>('/api/local-ai/asr/transcribe', { audioReference }),
  synthesize: (text: string, language: 'en' | 'ar') =>
    post<{ mode: LocalAiMode; text: string; audioAvailable: boolean }>('/api/local-ai/tts/synthesize', { text, language }),
}
