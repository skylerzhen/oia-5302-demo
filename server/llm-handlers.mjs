import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveCvSourceText } from './cv-sources.mjs'
import { chatJson, chatText, getLlmConfig } from './llm-client.mjs'
import { handleSynthesize, handleTranscribe, speechAvailability } from './speech-handlers.mjs'

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
  const speech = speechAvailability()
  return {
    mode: available ? 'model' : 'adapter-fallback',
    provider,
    label,
    services: {
      ocr: available,
      llm: available,
      asr: speech.asr,
      tts: speech.tts,
    },
    speech,
  }
}

export { handleSynthesize, handleTranscribe }

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
- if scanned OCR is uncertain, mark education as "review" with confidence below 0.9
- evidence must quote or paraphrase the source text briefly`,
    user: JSON.stringify({
      fileName: body.fileName,
      isScannedPdf: Boolean(body.isScannedPdf ?? body.isArabicScan),
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
  const jobDescription = body.jobDescription ?? loadJobDescription()
  const candidateProfile = body.candidateProfile ?? {}

  const text = await chatText({
    model: fastModel,
    system: `You are an OIA AI interviewer for a senior financial analyst role.
Generate one concise interview question in English.
The question must reference the job and candidate profile when available.
Return only the question text, no quotes or preamble.`,
    user: JSON.stringify({
      jobDescription,
      candidateProfile,
      purpose: body.purpose ?? 'opening',
    }),
  })

  return { mode: 'model', text }
}

export async function handleFollowUp(body) {
  const { fastModel } = getLlmConfig()
  const answer = String(body.answer ?? '').trim()
  if (!answer) throw new Error('Candidate answer is required')

  const text = await chatText({
    model: fastModel,
    maxTokens: 120,
    system: `You are an OIA AI interviewer conducting a live interview.
Write one short follow-up question in English (max 2 sentences).
Reference something specific from the candidate answer.
Return only the question.`,
    user: JSON.stringify({
      answer,
      priorTurns: body.priorTurns ?? [],
      jobDescription: body.jobDescription ?? loadJobDescription(),
    }),
  })

  const evidencePhrase = answer.split(/\s+/).slice(0, 8).join(' ')
  return { mode: 'model', text, evidencePhrase }
}

function normalizeMatchDimensions(rawDimensions) {
  const rubric = [
    { key: 'portfolio', label: 'Portfolio analysis', weight: 20 },
    { key: 'risk', label: 'Risk reporting', weight: 15 },
    { key: 'excel', label: 'Financial modeling (Excel)', weight: 15 },
    { key: 'experience', label: 'Years in finance', weight: 15 },
    { key: 'education', label: 'Relevant degree', weight: 15 },
    { key: 'communication', label: 'Stakeholder communication', weight: 20 },
  ]

  const incoming = Array.isArray(rawDimensions) ? rawDimensions : []
  return rubric.map((rule) => {
    const entry = incoming.find((d) => d.key === rule.key)
      ?? incoming.find((d) => typeof d.label === 'string' && d.label.toLowerCase().includes(rule.key))
    const maxScore = rule.weight
    const rawScore = Number(entry?.score ?? 0)
    const score = Math.max(0, Math.min(maxScore, Math.round(rawScore)))
    const matched = entry?.matched === true || score >= maxScore * 0.6
    return {
      key: rule.key,
      label: rule.label,
      weight: rule.weight,
      score,
      maxScore,
      evidence: typeof entry?.evidence === 'string' ? entry.evidence : 'No direct evidence cited',
      matched,
    }
  })
}

function normalizeMatchEntry(raw, candidateId) {
  const dimensions = normalizeMatchDimensions(raw?.dimensions)
  const weightSum = dimensions.reduce((sum, d) => sum + d.maxScore, 0)
  const scoreSum = dimensions.reduce((sum, d) => sum + d.score, 0)
  const totalScore = Math.round(
    typeof raw?.totalScore === 'number'
      ? Math.max(0, Math.min(100, raw.totalScore))
      : weightSum ? (scoreSum / weightSum) * 100 : 0,
  )
  const matchedCount = dimensions.filter((d) => d.matched).length
  const qualified = raw?.qualified === true || (totalScore >= 60 && matchedCount >= 4)
  const improvementTips = Array.isArray(raw?.improvementTips)
    ? raw.improvementTips.filter((t) => typeof t === 'string' && t.trim())
    : dimensions
      .filter((d) => !d.matched)
      .map((d) => `Strengthen evidence for ${d.label.toLowerCase()} — ${d.evidence}`)

  return {
    candidateId,
    totalScore,
    qualified,
    matchedCount,
    totalDimensions: dimensions.length,
    dimensions,
    improvementTips,
  }
}

export async function handleMatchCandidates(body) {
  const candidates = Array.isArray(body.candidates) ? body.candidates : []
  if (candidates.length === 0) throw new Error('At least one candidate profile is required')

  const jobDescription = body.jobDescription ?? loadJobDescription()
  const { model } = getLlmConfig()

  const parsed = await chatJson({
    model,
    system: `You are an OIA recruitment matching engine for a Senior Financial Analyst role.
Score each candidate CV against the job description rubric.
Return JSON:
{
  "matches": [
    {
      "candidateId": "string",
      "totalScore": 0-100,
      "qualified": boolean,
      "matchedCount": number,
      "improvementTips": ["actionable tip"],
      "dimensions": [
        {
          "key": "portfolio|risk|excel|experience|education|communication",
          "label": "dimension label",
          "score": 0-maxScore,
          "maxScore": weight,
          "evidence": "short quote or paraphrase from the CV",
          "matched": boolean
        }
      ]
    }
  ]
}
Rules:
- use exactly the six rubric keys from the JD
- weights: portfolio 20, risk 15, excel 15, experience 15, education 15, communication 20
- evidence must come from the supplied CV text, not invented credentials
- qualified means >=60% total AND at least 4 matched dimensions
- improvementTips: 1-3 concrete gaps for the primary candidate only; empty array for others unless clearly weak
- be strict on weak candidates (marketing background, missing finance evidence)`,
    user: JSON.stringify({
      jobDescription,
      candidates: candidates.map((c) => ({
        candidateId: c.candidateId,
        name: c.name,
        cvText: c.cvText,
      })),
    }),
  })

  const byId = new Map(
    (Array.isArray(parsed.matches) ? parsed.matches : []).map((entry) => [
      entry.candidateId,
      normalizeMatchEntry(entry, entry.candidateId),
    ]),
  )

  return {
    mode: 'model',
    matches: candidates.map((c) => byId.get(c.candidateId) ?? normalizeMatchEntry(null, c.candidateId)),
  }
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
      "evidence": { "id": "string", "speaker": "candidate", "language": "en", "text": "exact transcript quote" }
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
