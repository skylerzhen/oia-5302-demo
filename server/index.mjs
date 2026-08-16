import { createServer } from 'node:http'
import { loadEnv } from './load-env.mjs'
import {
  handleFollowUp,
  handleGenerateAssessment,
  handleGenerateQuestion,
  handleParseCv,
  handleStatus,
  handleSynthesize,
  handleTranscribe,
} from './llm-handlers.mjs'

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
  'POST /api/local-ai/tts/synthesize': async (req, res) => sendJson(res, 200, await handleSynthesize(await readJson(req))),
  'POST /api/local-ai/asr/transcribe': async (req, res) => sendJson(res, 200, await handleTranscribe(await readJson(req))),
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
    await handler(req, res)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error'
    sendJson(res, 500, { error: message })
  }
}).listen(PORT, () => {
  const azure = Boolean(process.env.AZURE_SPEECH_KEY?.trim() && process.env.AZURE_SPEECH_REGION?.trim())
  console.log(`LLM API listening on http://127.0.0.1:${PORT}`)
  console.log(`Speech: TTS=${azure ? 'azure' : 'browser'} ASR=${azure ? 'azure' : 'browser'} viseme=${azure ? 'azure-sdk' : 'estimated'}`)
})
