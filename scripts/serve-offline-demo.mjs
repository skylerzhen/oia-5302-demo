#!/usr/bin/env node
/**
 * Serve the built demo from localhost only. No development server, cloud URL,
 * or external network dependency is required once npm dependencies are present.
 */
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT ?? 4173)
const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

function writeJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  let body = ''
  for await (const chunk of request) body += chunk
  return body ? JSON.parse(body) : {}
}

function quotedPhrase(answer) {
  const normalized = String(answer).trim().replace(/\s+/g, ' ')
  return normalized.split(/[,.؛،]/)[0]?.slice(0, 72) || 'your previous response'
}

function loadCvFallback(sampleId) {
  const filePath = path.join(ROOT, 'data/cv-parse-fallback', `${sampleId}.json`)
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function resolveKnownSampleId(fileName, isArabicScan) {
  if (isArabicScan) return 'pdf-scan'
  const normalized = String(fileName ?? '').toLowerCase()
  if (normalized.includes('noor') || normalized.includes('ar-scan') || normalized.includes('scan')) return 'pdf-scan'
  if (normalized.includes('khalid') || normalized.includes('02-khalid')) return 'docx-en'
  if (normalized.includes('sara') || normalized.includes('01-sara')) return 'pdf-en'
  return null
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function handleLocalAi(request, response, pathname) {
  if (request.method === 'GET' && pathname === '/api/local-ai/status') {
    return writeJson(response, 200, {
      mode: 'adapter-fallback',
      services: { ocr: false, llm: false, asr: false, tts: false },
      note: 'Replace this local fallback with approved on-prem model adapters before acceptance.',
    })
  }

  const payload = await readJson(request)
  if (pathname === '/api/local-ai/ocr/parse-cv') {
    const isArabicScan = Boolean(payload.isArabicScan)
    const knownSampleId = ['pdf-en', 'docx-en', 'pdf-scan'].includes(payload.sampleId)
      ? payload.sampleId
      : resolveKnownSampleId(payload.fileName, isArabicScan)
    if (!knownSampleId) {
      return writeJson(response, 422, {
        error: 'Unknown CV is not a controlled demo sample. Bind parsing to a named sample or fail closed.',
        uploadId: payload.uploadId ?? null,
        fileName: payload.fileName ?? null,
      })
    }
    await wait(isArabicScan || knownSampleId === 'pdf-scan' ? 900 : 650)
    const parsed = loadCvFallback(knownSampleId)
    return writeJson(response, 200, {
      mode: 'adapter-fallback',
      sampleId: knownSampleId,
      fileName: payload.fileName,
      fileSize: payload.fileSize ?? null,
      ...parsed,
    })
  }

  if (pathname === '/api/local-ai/llm/follow-up') {
    const phrase = quotedPhrase(payload.answer)
    const isArabic = payload.language === 'ar'
    const priorTurns = Array.isArray(payload.priorTurns) ? payload.priorTurns : []
    const candidateRound = priorTurns.filter((turn) => turn?.speaker === 'candidate').length
    const shouldClose = candidateRound >= 7
    return writeJson(response, 200, {
      mode: 'adapter-fallback',
      evidencePhrase: phrase,
      action: shouldClose ? 'closing' : 'follow_up',
      text: shouldClose
        ? 'Thank you for your thoughtful responses. That concludes our interview today — HR will review your recording.'
        : isArabic
          ? `ذكرتم "${phrase}". ما المؤشر الذي اعتمدتم عليه قبل تقديم توصيتكم؟`
          : `You mentioned "${phrase}". Which metric or threshold did you use before making your recommendation?`,
    })
  }

  if (pathname === '/api/local-ai/asr/transcribe') {
    return writeJson(response, 200, {
      mode: 'adapter-fallback',
      transcript: 'ASR adapter is ready; connect an approved local ASR model for live audio.',
    })
  }

  if (pathname === '/api/local-ai/tts/synthesize') {
    return writeJson(response, 200, {
      mode: 'adapter-fallback',
      text: payload.text,
      audioAvailable: false,
    })
  }

  return writeJson(response, 404, { error: 'Unknown local AI endpoint' })
}

if (!existsSync(path.join(DIST, 'index.html'))) {
  throw new Error('Missing dist/index.html. Run npm run build before npm run demo:offline.')
}

createServer(async (request, response) => {
  const requested = decodeURIComponent(new URL(request.url ?? '/', `http://${request.headers.host}`).pathname)
  if (requested.startsWith('/api/local-ai/')) {
    try {
      await handleLocalAi(request, response, requested)
    } catch {
      writeJson(response, 400, { error: 'Invalid local AI request body' })
    }
    return
  }
  const safePath = path.normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '')
  const target = path.join(DIST, safePath === '/' ? 'index.html' : safePath)
  const file = existsSync(target) && !target.endsWith(path.sep) ? target : path.join(DIST, 'index.html')
  response.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'self'; connect-src 'self'; img-src 'self' data:; media-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
  })
  createReadStream(file).pipe(response)
}).listen(PORT, '127.0.0.1', () => {
  console.log(`OIA offline demo: http://127.0.0.1:${PORT}`)
  console.log('This server listens on localhost only. Disconnect external network for the physical Gate test.')
})
