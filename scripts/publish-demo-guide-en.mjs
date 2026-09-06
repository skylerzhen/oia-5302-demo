import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'scripts/demo-guide-body-en.html')
const OUTS = [
  path.join(ROOT, 'deliverables/demo-5302/test-guide-en.html'),
  path.join(ROOT, 'deliverables/demo-5302/operation-guide-en.html'),
  path.join(ROOT, 'public/demo-operation-guide-en.html'),
]

const html = fs.readFileSync(SRC, 'utf8')
for (const out of OUTS) {
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, html, 'utf8')
  console.log('OK', out)
}