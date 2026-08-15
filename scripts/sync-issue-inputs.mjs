#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = path.join(ROOT, 'data/issue-5302-inputs/files')
const TARGET = path.join(ROOT, 'public/issue-5302-inputs')

if (!fs.existsSync(SOURCE)) {
  console.error('Missing generated files. Run: npm run demo:documents')
  process.exit(1)
}

fs.mkdirSync(TARGET, { recursive: true })
for (const file of fs.readdirSync(SOURCE)) {
  fs.copyFileSync(path.join(SOURCE, file), path.join(TARGET, file))
  console.log(`✓ public/issue-5302-inputs/${file}`)
}
