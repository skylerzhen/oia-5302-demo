#!/usr/bin/env node
/**
 * Serve the built demo from localhost only. No development server, cloud URL,
 * or external network dependency is required once npm dependencies are present.
 */
import { createReadStream, existsSync } from 'node:fs'
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

const CV_PARSE_PROFILES = {
  'pdf-en': [
    { key: 'name', value: 'Sara Al-Hinai', status: 'parsed', source: 'Electronic PDF, page 1 header' },
    { key: 'email', value: 'sara.alhinai@example.om', status: 'parsed', source: 'Contact block, page 1' },
    { key: 'experience', value: '7', status: 'parsed', source: 'Experience section, page 1' },
    { key: 'education', value: 'MSc Finance, Sultan Qaboos University', status: 'parsed', source: 'Education section, page 1', confidence: 0.98 },
    { key: 'certification', value: '', status: 'missing', source: 'No certification found in source document' },
  ],
  'docx-en': [
    { key: 'name', value: 'Sara Al-Hinai', status: 'parsed', source: 'DOCX body, paragraph 1' },
    { key: 'email', value: 'sara.alhinai@example.om', status: 'parsed', source: 'DOCX contact line' },
    { key: 'experience', value: '7', status: 'parsed', source: 'DOCX experience block' },
    { key: 'education', value: 'MSc Finance, Sultan Qaboos University', status: 'parsed', source: 'DOCX education block', confidence: 0.96 },
    { key: 'certification', value: '', status: 'missing', source: 'No certification found in source document' },
  ],
  'pdf-ar-scan': [
    { key: 'name', value: 'Sara Al-Hinai', status: 'parsed', source: 'Scanned PDF, page 1 (OCR)' },
    { key: 'email', value: 'sara.alhinai@example.om', status: 'parsed', source: 'Scanned PDF, page 1 (OCR)' },
    { key: 'experience', value: '7', status: 'parsed', source: 'Scanned PDF, page 1 (OCR)' },
    { key: 'education', value: 'MSc Finance, Sultan Qaboos University', status: 'review', source: 'Arabic scanned PDF, page 1', confidence: 0.82 },
    { key: 'certification', value: '', status: 'missing', source: 'Not found in scanned document' },
  ],
}

function resolveSampleId(fileName, isArabicScan) {
  if (isArabicScan) return 'pdf-ar-scan'
  const normalized = String(fileName).toLowerCase()
  if (normalized.includes('noor') || normalized.includes('ar-scan') || normalized.includes('scan')) return 'pdf-ar-scan'
  if (normalized.endsWith('.docx')) return 'docx-en'
  return 'pdf-en'
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
    const sampleId = payload.sampleId || resolveSampleId(payload.fileName, isArabicScan)
    await wait(isArabicScan ? 900 : 650)
    return writeJson(response, 200, {
      mode: 'adapter-fallback',
      sampleId,
      fileName: payload.fileName,
      fileSize: payload.fileSize ?? null,
      fields: CV_PARSE_PROFILES[sampleId] ?? CV_PARSE_PROFILES['pdf-en'],
    })
  }

  if (pathname === '/api/local-ai/llm/follow-up') {
    const phrase = quotedPhrase(payload.answer)
    const isArabic = payload.language === 'ar'
    return writeJson(response, 200, {
      mode: 'adapter-fallback',
      evidencePhrase: phrase,
      text: isArabic
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
