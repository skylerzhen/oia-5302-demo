const buckets = new Map()

function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress ?? 'unknown'
}

export function enforceRateLimit(req, routeKey, { max, windowMs }) {
  const now = Date.now()
  const key = `${clientKey(req)}:${routeKey}`
  let bucket = buckets.get(key)

  if (!bucket || now - bucket.start >= windowMs) {
    bucket = { start: now, count: 0 }
    buckets.set(key, bucket)
  }

  bucket.count += 1
  if (bucket.count > max) {
    const retrySec = Math.ceil((windowMs - (now - bucket.start)) / 1000)
    throw new Error(`Rate limit exceeded for ${routeKey} (${max}/${Math.round(windowMs / 1000)}s). Retry in ~${retrySec}s.`)
  }
}

/** Hard ceiling per IP for all billable POST routes — stops runaway loops overnight. */
export const GLOBAL_BILLABLE_LIMIT = {
  max: Number(process.env.LLM_GLOBAL_MAX_PER_HOUR ?? 90),
  windowMs: 3_600_000,
}

export const BILLABLE_POST_ROUTES = new Set([
  'POST /api/local-ai/ocr/parse-cv',
  'POST /api/local-ai/llm/generate-question',
  'POST /api/local-ai/llm/follow-up',
  'POST /api/local-ai/llm/generate-assessment',
  'POST /api/local-ai/llm/match-candidates',
  'POST /api/local-ai/tts/synthesize',
  'POST /api/local-ai/asr/transcribe',
  'POST /api/heygen/speak',
  'POST /api/liveavatar/session/start',
  'POST /api/liveavatar/speak',
])

export const LLM_RATE_LIMITS = {
  'POST /api/local-ai/llm/match-candidates': { max: 4, windowMs: 60_000 },
  'POST /api/local-ai/ocr/parse-cv': { max: 8, windowMs: 60_000 },
  'POST /api/local-ai/llm/generate-assessment': { max: 4, windowMs: 60_000 },
  'POST /api/local-ai/llm/follow-up': { max: 24, windowMs: 60_000 },
  'POST /api/local-ai/llm/generate-question': { max: 12, windowMs: 60_000 },
  'POST /api/local-ai/tts/synthesize': { max: 20, windowMs: 60_000 },
  'POST /api/local-ai/asr/transcribe': { max: 24, windowMs: 60_000 },
  'POST /api/heygen/speak': { max: 6, windowMs: 60_000 },
  'POST /api/liveavatar/session/start': { max: 4, windowMs: 60_000 },
  'POST /api/liveavatar/speak': { max: 12, windowMs: 60_000 },
}
