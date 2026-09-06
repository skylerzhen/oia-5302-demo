#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'scripts/demo-guide-body.html')
const OUT = path.join(ROOT, 'deliverables/demo-5302/demo-operation-guide.html')
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, fs.readFileSync(SRC, 'utf8'), 'utf8')
console.log('OK', OUT)