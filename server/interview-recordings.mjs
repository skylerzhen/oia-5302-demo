import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'data', 'interview-recordings')
const MAX_BYTES = 80 * 1024 * 1024

function safeId(applicationId) {
  return String(applicationId ?? '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
}

function pathsFor(applicationId) {
  const id = safeId(applicationId)
  return {
    id,
    video: join(DIR, `${id}.webm`),
    meta: join(DIR, `${id}.json`),
  }
}

export function saveInterviewRecording(applicationId, buffer, meta = {}) {
  const { id, video, meta: metaPath } = pathsFor(applicationId)
  if (!id) throw new Error('applicationId required')
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new Error('Empty recording')
  if (buffer.length > MAX_BYTES) throw new Error(`Recording too large (${buffer.length} bytes)`)
  mkdirSync(DIR, { recursive: true })
  writeFileSync(video, buffer)
  const record = {
    applicationId: id,
    mimeType: meta.mimeType || 'video/webm',
    byteLength: buffer.length,
    storedAt: new Date().toISOString(),
    startedAt: meta.startedAt || null,
    endedAt: meta.endedAt || null,
    durationMs: meta.durationMs || 0,
    turnCount: meta.turnCount || 0,
    storedOn: 'server',
  }
  writeFileSync(metaPath, JSON.stringify(record, null, 2))
  return record
}

export function loadInterviewRecording(applicationId) {
  const { video, meta } = pathsFor(applicationId)
  if (!existsSync(video) || !existsSync(meta)) return null
  const record = JSON.parse(readFileSync(meta, 'utf8'))
  const buffer = readFileSync(video)
  return { meta: { ...record, byteLength: buffer.length }, buffer }
}
