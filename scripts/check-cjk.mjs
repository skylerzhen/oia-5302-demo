import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

const SRC_ROOT = join(process.cwd(), 'src')
const ENCODING_ROOTS = [
  SRC_ROOT,
  join(process.cwd(), 'scripts'),
  join(process.cwd(), 'server'),
]
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/
const SRC_EXTS = new Set(['.ts', '.tsx', '.css'])
const ENCODING_EXTS = new Set(['.ts', '.tsx', '.css', '.mjs', '.js'])
const SKIP_DIR_NAMES = new Set(['node_modules', 'dist', 'latest', 'uis-p0-review-pack'])

function encodingProblem(buf) {
  if (buf.length >= 2 && buf[0] === 0xFF && buf[1] === 0xFE) return 'UTF-16 LE BOM'
  if (buf.length >= 2 && buf[0] === 0xFE && buf[1] === 0xFF) return 'UTF-16 BE BOM'
  const n = Math.min(buf.length, 200)
  if (n < 8) return null
  let nulls = 0
  for (let i = 0; i < n; i++) if (buf[i] === 0) nulls++
  if (nulls >= n * 0.3) return 'UTF-16 (no BOM / high null density)'
  return null
}

function walk(dir, exts, onFile) {
  const hits = []
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR_NAMES.has(entry)) continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      hits.push(...walk(full, exts, onFile))
      continue
    }
    if (!exts.has(extname(entry))) continue
    hits.push(...onFile(full))
  }
  return hits
}

function encodingHits(full) {
  const buf = readFileSync(full)
  const encoding = encodingProblem(buf)
  return encoding ? [`${full}: encoding ${encoding} — convert to UTF-8 (no BOM)`] : []
}

function cjkHits(full) {
  const buf = readFileSync(full)
  if (encodingProblem(buf)) return []
  const hits = []
  const lines = buf.toString('utf8').split(/\r?\n/)
  lines.forEach((line, index) => {
    if (CJK.test(line)) hits.push(`${full}:${index + 1}: ${line.trim().slice(0, 120)}`)
  })
  return hits
}

const hits = []
for (const root of ENCODING_ROOTS) {
  try {
    hits.push(...walk(root, ENCODING_EXTS, encodingHits))
  } catch (error) {
    if (error && error.code === 'ENOENT') continue
    throw error
  }
}
hits.push(...walk(SRC_ROOT, SRC_EXTS, cjkHits))

if (hits.length > 0) {
  console.error('CJK / encoding check failed:')
  for (const hit of hits) console.error(`  ${hit}`)
  process.exit(1)
}

console.log('CJK check passed (src ts/tsx/css + UTF-8 encoding on src/scripts/server).')