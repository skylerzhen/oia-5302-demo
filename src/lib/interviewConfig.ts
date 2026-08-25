import { INTERVIEW_PRESET } from '../data/questions'
import {
  JD_INTERVIEW_QUESTION_SET_ID,
  JD_INTERVIEW_QUESTIONS,
} from '../data/jdInterviewQuestions'
import { FINANCE_JOB } from '../data/job'
import type { InterviewConfig, InterviewQuestion, InterviewTurn } from '../types'

export const INTERVIEW_CONFIG_VERSION = '1'
const STORAGE_KEY = 'oia5302-interview-config'

export const DEFAULT_PROHIBITED_TOPICS = [
  'salary expectations',
  'politics',
  'religion',
  'family status',
]

export function defaultInterviewConfig(): InterviewConfig {
  return {
    version: INTERVIEW_CONFIG_VERSION,
    jdQuestionSetId: JD_INTERVIEW_QUESTION_SET_ID,
    mode: 'fixed_then_adaptive',
    customQuestions: [
      {
        id: 'custom-opening',
        textEn: INTERVIEW_PRESET[0].text,
        source: 'custom',
        dimension: 'portfolio',
      },
    ],
    enabledJdQuestionIds: ['jd-portfolio-2', 'jd-risk-1', 'jd-excel-1'],
    followUpDimensions: FINANCE_JOB.dimensions.map((d) => d.key),
    prohibitedTopics: [...DEFAULT_PROHIBITED_TOPICS],
    minAnswers: 5,
    maxAnswers: 10,
    savedAt: new Date().toISOString(),
  }
}

export function loadInterviewConfig(): InterviewConfig {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultInterviewConfig()
    return normalizeInterviewConfig(JSON.parse(raw) as Partial<InterviewConfig>)
  } catch {
    return defaultInterviewConfig()
  }
}

export function saveInterviewConfig(config: InterviewConfig) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...config,
    savedAt: new Date().toISOString(),
  }))
}

export function normalizeInterviewConfig(raw: Partial<InterviewConfig>): InterviewConfig {
  const base = defaultInterviewConfig()
  return {
    version: raw.version ?? base.version,
    jdQuestionSetId: raw.jdQuestionSetId ?? base.jdQuestionSetId,
    mode: raw.mode ?? base.mode,
    customQuestions: Array.isArray(raw.customQuestions) && raw.customQuestions.length > 0
      ? raw.customQuestions.map((q, i) => ({
        id: q.id ?? `custom-${i}`,
        textEn: String(q.textEn ?? '').trim(),
        textAr: q.textAr?.trim() || undefined,
        dimension: q.dimension,
        source: q.source === 'jd' ? 'jd' as const : 'custom' as const,
      })).filter((q) => q.textEn.length > 0)
      : base.customQuestions,
    enabledJdQuestionIds: Array.isArray(raw.enabledJdQuestionIds)
      ? raw.enabledJdQuestionIds.filter((id) => JD_INTERVIEW_QUESTIONS.some((q) => q.id === id))
      : base.enabledJdQuestionIds,
    followUpDimensions: Array.isArray(raw.followUpDimensions) && raw.followUpDimensions.length > 0
      ? raw.followUpDimensions
      : base.followUpDimensions,
    prohibitedTopics: Array.isArray(raw.prohibitedTopics) && raw.prohibitedTopics.length > 0
      ? raw.prohibitedTopics.map((t) => String(t).trim()).filter(Boolean)
      : base.prohibitedTopics,
    minAnswers: clampInt(raw.minAnswers, 3, 8, base.minAnswers),
    maxAnswers: clampInt(raw.maxAnswers, 5, 15, base.maxAnswers),
    savedAt: raw.savedAt ?? base.savedAt,
  }
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

export function jdQuestionById(id: string) {
  return JD_INTERVIEW_QUESTIONS.find((q) => q.id === id)
}

/** Ordered fixed questions: HR custom first, then enabled JD set items. */
export function buildFixedQuestionQueue(config: InterviewConfig): InterviewQuestion[] {
  const jdEnabled = config.enabledJdQuestionIds
    .map((id) => jdQuestionById(id))
    .filter((q): q is InterviewQuestion => Boolean(q))

  return [...config.customQuestions, ...jdEnabled]
}

export function countAvatarQuestions(turns: InterviewTurn[]) {
  return turns.filter((t) => t.speaker === 'avatar').length
}

export function countCandidateAnswers(turns: InterviewTurn[]) {
  return turns.filter((t) => t.speaker === 'candidate').length
}

/** Next HR-configured fixed question, or null when adaptive phase begins. */
export function nextFixedQuestion(
  config: InterviewConfig,
  turns: InterviewTurn[],
): InterviewQuestion | null {
  const queue = buildFixedQuestionQueue(config)
  const avatarCount = countAvatarQuestions(turns)
  if (avatarCount >= queue.length) return null
  return queue[avatarCount] ?? null
}

export function openingQuestion(config: InterviewConfig): InterviewQuestion {
  const queue = buildFixedQuestionQueue(config)
  return queue[0] ?? {
    id: 'fallback-opening',
    textEn: INTERVIEW_PRESET[0].text,
    source: 'custom',
  }
}

export function shouldForceInterviewClosing(config: InterviewConfig, candidateAnswers: number) {
  return candidateAnswers >= config.maxAnswers
}

export function canOfferInterviewClosing(config: InterviewConfig, candidateAnswers: number) {
  return candidateAnswers >= config.minAnswers
}

export function interviewAnswerProgress(config: InterviewConfig, turns: { speaker: string }[]) {
  const answered = countCandidateAnswers(turns as InterviewTurn[])
  return {
    answered,
    minRequired: config.minAnswers,
    maxAllowed: config.maxAnswers,
    currentRound: answered + 1,
    fixedRemaining: Math.max(0, buildFixedQuestionQueue(config).length - countAvatarQuestions(turns as InterviewTurn[])),
  }
}

export function interviewConfigSummary(config: InterviewConfig) {
  const fixed = buildFixedQuestionQueue(config).length
  return `${fixed} fixed question${fixed === 1 ? '' : 's'} · adaptive up to ${config.maxAnswers} answers · ${config.followUpDimensions.length} follow-up dimensions`
}

export function toInterviewConfigPayload(config: InterviewConfig) {
  return {
    version: config.version,
    jdQuestionSetId: config.jdQuestionSetId,
    mode: config.mode,
    customQuestions: config.customQuestions.map((q) => ({
      id: q.id,
      textEn: q.textEn,
      textAr: q.textAr,
      dimension: q.dimension,
      source: q.source,
    })),
    enabledJdQuestionIds: config.enabledJdQuestionIds,
    followUpDimensions: config.followUpDimensions,
    prohibitedTopics: config.prohibitedTopics,
    minAnswers: config.minAnswers,
    maxAnswers: config.maxAnswers,
    fixedQuestionQueue: buildFixedQuestionQueue(config).map((q) => q.textEn),
  }
}
