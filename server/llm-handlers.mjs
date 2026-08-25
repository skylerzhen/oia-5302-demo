import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { resolveCvSourceText } from './cv-sources.mjs'
import { normalizeCvParse, loadFallbackCvParse } from './cv-parse-normalize.mjs'
import { existsSync } from 'node:fs'
import { heygenAvailability } from './heygen-handlers.mjs'
import { liveAvatarAvailability } from './liveavatar-handlers.mjs'
import { chatJson, chatText, getLlmConfig } from './llm-client.mjs'
import { handleSynthesize, handleTranscribe, speechAvailability } from './speech-handlers.mjs'

function loadJobDescription() {
  const jdPath = resolve(process.cwd(), 'data/issue-5302-inputs/Senior-Financial-Analyst-JD.md')
  return readFileSync(jdPath, 'utf8')
}

function normalizeCvFields(rawFields) {
  return normalizeCvParse({ fields: rawFields }).fields
}

function tryAdapterFallback(body) {
  const sampleId = String(body.sampleId ?? 'pdf-en')
  const fallbackPath = resolve(process.cwd(), 'data/cv-parse-fallback', `${sampleId}.json`)
  if (!existsSync(fallbackPath)) return null
  try {
    return {
      mode: 'adapter-fallback',
      ...normalizeCvParse(loadFallbackCvParse(sampleId), body),
    }
  } catch {
    return null
  }
}

export async function handleStatus() {
  const { available, provider, label } = getLlmConfig()
  const speech = speechAvailability()
  const heygen = heygenAvailability()
  const liveavatar = liveAvatarAvailability()
  const avatarProvider = liveavatar.configured
    ? 'liveavatar'
    : heygen.configured
      ? 'heygen'
      : '2d'
  return {
    mode: available ? 'model' : 'adapter-fallback',
    provider,
    label,
    services: {
      ocr: available,
      llm: available,
      asr: speech.asr,
      tts: speech.tts,
      avatar: liveavatar.configured || heygen.configured,
    },
    speech: {
      ...speech,
      avatarProvider,
    },
    avatar: liveavatar.configured ? liveavatar : heygen,
    liveavatar,
  }
}

export { handleSynthesize, handleTranscribe }

export async function handleParseCv(body) {
  const sourceText = resolveCvSourceText(body)
  if (!sourceText) {
    throw new Error('No CV source text available for LLM parsing')
  }

  const { fastModel } = getLlmConfig()
  let parsed
  try {
    parsed = await chatJson({
      model: fastModel,
      system: `You extract structured candidate profile data from CV text for an OIA recruitment demo.
Return JSON only:
{
  "fields": [
    { "key": "<scalarKey>", "value": "string", "status": "parsed|review|missing", "confidence": 0-1 optional, "evidence": "short quote from CV", "source": "section label" }
  ],
  "skills": { "items": ["skill1","skill2"], "status": "parsed|review|missing", "evidence": "quote", "source": "section" },
  "languages": { "items": ["Arabic","English"], "status": "parsed|review|missing", "evidence": "quote", "source": "section" },
  "workHistory": [
    {
      "company": "string",
      "title": "string",
      "start": "YYYY or YYYY-MM",
      "end": "YYYY or Present or empty",
      "responsibilities": ["bullet1","bullet2"],
      "status": "parsed|review|missing",
      "evidence": "quote",
      "source": "Experience section"
    }
  ]
}

Scalar field keys (include one entry per key):
name, email, phone, nationality, address, experience,
educationLevel, university, gpa, graduationDate, specialization,
companyName, positionTitle, industry, location, certification

Rules:
- NEVER invent values. If not clearly in the CV text → status "missing" and empty value/items.
- experience = total years as a number string like "7" only when stated.
- skills.items = technical/professional skills only (not languages).
- languages.items = spoken languages only.
- workHistory = one object per role with responsibilities as bullet strings from the CV.
- Use status "review" when OCR/scan uncertainty or partial extraction.
- certification MUST be missing with empty value when no certification appears in the CV (v1 Sara CV has NO CFA).
- evidence must quote or closely paraphrase the source text.`,
      user: JSON.stringify({
        fileName: body.fileName,
        sampleId: body.sampleId,
        isScannedPdf: Boolean(body.isScannedPdf ?? body.isArabicScan),
        cvText: sourceText,
      }),
    })
  } catch (error) {
    const fallback = tryAdapterFallback(body)
    if (fallback) return fallback
    throw error
  }

  const normalized = normalizeCvParse(parsed, body)
  return {
    mode: 'model',
    ...normalized,
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

function trimPriorTurns(priorTurns, limit = 8) {
  const turns = Array.isArray(priorTurns) ? priorTurns : []
  return turns.slice(-limit).map((turn) => ({
    speaker: turn.speaker,
    language: turn.language,
    text: String(turn.text ?? '').slice(0, 400),
  }))
}

function formatInterviewTranscript(priorTurns) {
  return priorTurns
    .map((turn) => {
      const role = turn.speaker === 'avatar' ? 'Interviewer' : 'Candidate'
      return `${role}: ${turn.text}`
    })
    .join('\n')
}

function extractAnswerHook(answer) {
  const trimmed = String(answer ?? '').trim().replace(/\s+/g, ' ')
  if (!trimmed) return 'your previous response'
  const clause = trimmed.split(/[.!?]/)[0]?.trim() || trimmed
  return clause.slice(0, 80)
}

export async function handleFollowUp(body) {
  const { fastModel } = getLlmConfig()
  const answer = String(body.answer ?? '').trim()
  if (!answer) throw new Error('Candidate answer is required')

  const priorTurns = trimPriorTurns(body.priorTurns)
  const candidateRound = priorTurns.filter((turn) => turn.speaker === 'candidate').length
  const answerHook = extractAnswerHook(answer)
  const profile = body.candidateProfile && typeof body.candidateProfile === 'object'
    ? body.candidateProfile
    : {}

  const transcript = formatInterviewTranscript(priorTurns)
  const profileLine = [
    profile.name ? `Name: ${profile.name}` : '',
    profile.experience ? `Experience: ${profile.experience} years` : '',
    profile.companyName ? `Current employer: ${profile.companyName}` : '',
  ].filter(Boolean).join(' · ')

  const MIN = 5
  const MAX = 10

  const user = [
    profileLine ? `Candidate profile: ${profileLine}` : '',
    transcript ? `Transcript so far:\n${transcript}` : '',
    `Latest candidate answer (quote a specific term from this answer in your follow-up):\n"""${answer}"""`,
    `Adaptive interview — candidate answer ${candidateRound} of ${MIN}–${MAX} (minimum ${MIN}, maximum ${MAX}).`,
  ].filter(Boolean).join('\n\n')

  const parsed = await chatJson({
    model: fastModel,
    maxTokens: 160,
    temperature: 0.45,
    system: `You are an OIA senior financial analyst interviewer orchestrating an adaptive English interview.
Reply with JSON only: { "action": "follow_up" | "closing", "text": "..." }

Rules:
- action "follow_up": ONE English question, max 22 words, no greeting or praise. Must include a concrete noun/phrase verbatim from the latest answer (e.g. "${answerHook.slice(0, 40)}"). Probe metrics, stakeholders, trade-offs, or validation.
- action "closing": ONLY if candidateRound >= ${MIN} AND you have sufficient evidence across portfolio analysis, risk, metrics, and stakeholders. text = brief professional closing (1–2 sentences, no question mark).
- NEVER use "closing" before round ${MIN}.
- If unsure, prefer "follow_up" until round ${MIN}.`,
    user,
  })

  let action = parsed?.action === 'closing' ? 'closing' : 'follow_up'
  let text = String(parsed?.text ?? '').trim()
  if (!text) {
    action = 'follow_up'
    text = `You mentioned "${answerHook.slice(0, 48)}" — which metric confirmed your recommendation?`
  }
  if (candidateRound < MIN) action = 'follow_up'
  if (action === 'closing' && text.includes('?')) {
    action = 'follow_up'
  }

  const evidencePhrase = answerHook.split(/\s+/).slice(0, 8).join(' ')
  return { mode: 'model', text, evidencePhrase, action }
}

function normalizeMatchDimensions(rawDimensions) {
  const rubric = [
    { key: 'portfolio', label: 'Portfolio analysis', weight: 20 },
    { key: 'risk', label: 'Risk reporting', weight: 15 },
    { key: 'excel', label: 'Financial modeling (Excel)', weight: 15 },
    { key: 'experience', label: 'Years in finance', weight: 15 },
    { key: 'education', label: 'Relevant degree', weight: 15 },
    { key: 'communication', label: 'Arabic & English communication', weight: 20 },
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
  const { fastModel } = getLlmConfig()

  const parsed = await chatJson({
    model: fastModel,
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
  const { fastModel } = getLlmConfig()
  const turns = Array.isArray(body.turns) ? body.turns : []
  if (turns.length === 0) throw new Error('Interview turns are required')

  const parsed = await chatJson({
    model: fastModel,
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
