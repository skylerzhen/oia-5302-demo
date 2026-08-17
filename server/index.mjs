import { createServer } from 'node:http'
import { loadEnv } from './load-env.mjs'
import { getLlmConfig } from './llm-client.mjs'
import {
  handleFollowUp,
  handleGenerateAssessment,
  handleGenerateQuestion,
  handleMatchCandidates,
  handleParseCv,
  handleStatus,
  handleSynthesize,
  handleTranscribe,
} from './llm-handlers.mjs'
import { handleHeyGenSpeak, handleHeyGenStatus } from './heygen-handlers.mjs'
import {
  handleLiveAvatarSessionStart,
  handleLiveAvatarSessionStop,
  handleLiveAvatarSpeak,
  handleLiveAvatarStatus,
} from './liveavatar-handlers.mjs'
import { enforceRateLimit, BILLABLE_POST_ROUTES, GLOBAL_BILLABLE_LIMIT, LLM_RATE_LIMITS } from './rate-limit.mjs'

loadEnv()

const PORT = Number(process.env.PORT ?? process.env.LLM_API_PORT ?? 8787)

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(payload))
}

const routes = {
  'GET /api/local-ai/status': async (_req, res) => sendJson(res, 200, await handleStatus()),
  'POST /api/local-ai/ocr/parse-cv': async (req, res) => sendJson(res, 200, await handleParseCv(await readJson(req))),
  'POST /api/local-ai/llm/generate-question': async (req, res) => sendJson(res, 200, await handleGenerateQuestion(await readJson(req))),
  'POST /api/local-ai/llm/follow-up': async (req, res) => sendJson(res, 200, await handleFollowUp(await readJson(req))),
  'POST /api/local-ai/llm/generate-assessment': async (req, res) => sendJson(res, 200, await handleGenerateAssessment(await readJson(req))),
  'POST /api/local-ai/llm/match-candidates': async (req, res) => sendJson(res, 200, await handleMatchCandidates(await readJson(req))),
  'POST /api/local-ai/tts/synthesize': async (req, res) => sendJson(res, 200, await handleSynthesize(await readJson(req))),
  'POST /api/local-ai/asr/transcribe': async (req, res) => sendJson(res, 200, await handleTranscribe(await readJson(req))),
  'GET /api/heygen/status': async (_req, res) => sendJson(res, 200, await handleHeyGenStatus()),
  'POST /api/heygen/speak': async (req, res) => sendJson(res, 200, await handleHeyGenSpeak(await readJson(req), handleSynthesize)),
  'GET /api/liveavatar/status': async (_req, res) => sendJson(res, 200, await handleLiveAvatarStatus()),
  'POST /api/liveavatar/session/start': async (_req, res) => sendJson(res, 200, await handleLiveAvatarSessionStart()),
  'POST /api/liveavatar/session/stop': async (req, res) => sendJson(res, 200, await handleLiveAvatarSessionStop(await readJson(req))),
  'POST /api/liveavatar/speak': async (req, res) => sendJson(res, 200, await handleLiveAvatarSpeak(await readJson(req))),
}

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  const routeKey = `${req.method} ${req.url?.split('?')[0]}`
  const handler = routes[routeKey]

  if (!handler) {
    sendJson(res, 404, { error: 'Not found' })
    return
  }

  try {
    if (BILLABLE_POST_ROUTES.has(routeKey)) {
      enforceRateLimit(req, '__global_billable__', GLOBAL_BILLABLE_LIMIT)
    }
    const limit = LLM_RATE_LIMITS[routeKey]
    if (limit) enforceRateLimit(req, routeKey, limit)
    await handler(req, res)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    const statusCode = message.startsWith('Rate limit exceeded') ? 429 : 500
    sendJson(res, statusCode, { error: message })
  }
}).listen(PORT, () => {
  const azure = Boolean(process.env.AZURE_SPEECH_KEY?.trim() && process.env.AZURE_SPEECH_REGION?.trim())
  const openaiTts = Boolean(process.env.OPENAI_API_KEY?.trim())
  const heygen = Boolean(process.env.HEYGEN_API_KEY?.trim() && process.env.HEYGEN_AVATAR_ID?.trim())
  const liveavatar = Boolean(process.env.LIVEAVATAR_API_KEY?.trim() && process.env.LIVEAVATAR_AVATAR_ID?.trim())
  const tts = azure ? 'azure' : openaiTts ? 'openai' : 'edge-neural'
  const avatar = liveavatar ? 'liveavatar-lite' : heygen ? 'heygen' : '2d-fallback'
  const { provider, label } = getLlmConfig()
  console.log(`LLM API listening on http://127.0.0.1:${PORT}`)
  console.log(`LLM: ${label} (${provider})`)
  console.log(`Speech: TTS=${tts} ASR=${azure ? 'azure' : 'browser'} avatar=${avatar}`)
})
