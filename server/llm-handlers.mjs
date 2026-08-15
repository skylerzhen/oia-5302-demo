import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveCvSourceText } from './cv-sources.mjs'
import { chatJson, chatText, getLlmConfig } from './llm-client.mjs'

function loadJobDescription() {
  const jdPath = resolve(process.cwd(), 'data/issue-5302-inputs/Senior-Financial-Analyst-JD.md')
  return readFileSync(jdPath, 'utf8')
}

function normalizeCvFields(rawFields) {
  const allowedKeys = ['name', 'email', 'experience', 'education', 'certification']
  const fields = Array.isArray(rawFields) ? rawFields : []
  return allowedKeys.map((key) => {
    const entry = fields.find((field) => field.key === key) ?? {}
    const value = typeof entry.value === 'string' ? entry.value.trim() : ''
    const status = entry.status === 'parsed' || entry.status === 'review' || entry.status === 'missing'
      ? entry.status
      : value ? 'parsed' : 'missing'
    return {
      key,
      value: value || undefined,
      status,
      confidence: typeof entry.confidence === 'number' ? entry.confidence : undefined,
      evidence: typeof entry.evidence === 'string' ? entry.evidence : value,
      source: typeof entry.source === 'string' ? entry.source : 'LLM extraction',
    }
  })
}

export async function handleStatus() {
  const { available, provider, label } = getLlmConfig()
  return {
    mode: available ? 'model' : 'adapter-fallback',
    provider,
    label,
    services: {
      ocr: available,
      llm: available,
      asr: false,
      tts: false,
    },
  }
}

export async function handleParseCv(body) {
  const sourceText = resolveCvSourceText(body)
  if (!sourceText) {
    throw new Error('No CV source text available for LLM parsing')
  }

  const { model } = getLlmConfig()
  const parsed = await chatJson({
    model,
    system: `You extract structured candidate profile fields from CV text for an OIA recruitment demo.
Return JSON with shape:
{
  "fields": [
    { "key": "name|email|experience|education|certification", "value": "string", "status": "parsed|review|missing", "confidence": 0-1 optional, "evidence": "short quote", "source": "section label" }
  ]
}
Rules:
- experience must be years as a number string like "7"
- certification may be missing; use status "missing" and empty value
- if Arabic scanned OCR is uncertain, mark education as "review" with confidence below 0.9
- evidence must quote or paraphrase the source text briefly`,
    user: JSON.stringify({
      fileName: body.fileName,
      isArabicScan: Boolean(body.isArabicScan),
      cvText: sourceText,
    }),
  })

  return {
    mode: 'model',
    fields: normalizeCvFields(parsed.fields),
  }
}

export async function handleGenerateQuestion(body) {
  const { fastModel } = getLlmConfig()
  const language = body.language === 'ar' ? 'ar' : 'en'
  const jobDescription = body.jobDescription ?? loadJobDescription()
  const candidateProfile = body.candidateProfile ?? {}

  const text = await chatText({
    model: fastModel,
    system: `You are an OIA AI interviewer for a senior financial analyst role.
Generate one concise interview question in ${language === 'ar' ? 'Modern Standard Arabic' : 'English'}.
The question must reference the job and candidate profile when available.
Return only the question text, no quotes or preamble.`,
    user: JSON.stringify({
      jobDescription,
      candidateProfile,
      language,
      purpose: body.purpose ?? 'opening',
    }),
  })

  return { mode: 'model', text }
}

export async function handleFollowUp(body) {
  const { fastModel } = getLlmConfig()
  const language = body.language === 'ar' ? 'ar' : 'en'
  const answer = String(body.answer ?? '').trim()
  if (!answer) throw new Error('Candidate answer is required')

  const text = await chatText({
    model: fastModel,
    system: `You are an OIA AI interviewer conducting a live bilingual interview.
Write one follow-up question in ${language === 'ar' ? 'Modern Standard Arabic' : 'English'}.
You must quote or clearly reference something specific from the candidate answer.
Return only the follow-up question.`,
    user: JSON.stringify({
      answer,
      language,
      priorTurns: body.priorTurns ?? [],
      jobDescription: body.jobDescription ?? loadJobDescription(),
    }),
  })

  const evidencePhrase = answer.split(/\s+/).slice(0, 8).join(' ')
  return { mode: 'model', text, evidencePhrase }
}

export async function handleGenerateAssessment(body) {
  const { model } = getLlmConfig()
  const turns = Array.isArray(body.turns) ? body.turns : []
  if (turns.length === 0) throw new Error('Interview turns are required')

  const parsed = await chatJson({
    model,
    system: `You evaluate a candidate interview for an OIA HR demo.
Return JSON:
{
  "recommendation": "short HR recommendation sentence",
  "dimensions": [
    {
      "label": "dimension name",
      "score": 0-100,
      "maxScore": 100,
      "rationale": "why this score",
      "evidence": { "id": "string", "speaker": "candidate", "language": "en|ar", "text": "exact transcript quote" }
    }
  ]
}
Rules:
- use 3 dimensions
- every rationale must cite concrete transcript content
- scores must reflect the actual answers in this take, not generic templates
- recommendation should mention whether to proceed to human final decision`,
    user: JSON.stringify({
      turns,
      assessmentScore: body.assessmentScore,
      matchScore: body.matchScore,
      jobTitle: body.jobTitle ?? 'Senior Financial Analyst',
    }),
  })

  return {
    mode: 'model',
    recommendation: parsed.recommendation,
    dimensions: Array.isArray(parsed.dimensions) ? parsed.dimensions : [],
  }
}
