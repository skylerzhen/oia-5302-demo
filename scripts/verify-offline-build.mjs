#!/usr/bin/env node
/** Fail if a production asset references an http(s) URL outside localhost. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const allowlisted = new Set(['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink'])
const externalUrls = new Set()

function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) inspect(target)
    // Compiled React contains namespace and diagnostic URL strings. Those are
    // not loaded resources, so inspect only assets browsers resolve as URLs.
    else if (/\.(html|css|svg|json)$/i.test(entry.name)) {
      const text = fs.readFileSync(target, 'utf8')
      for (const match of text.matchAll(/https?:\/\/[^\s"'<>\\]+/g)) {
        if (!allowlisted.has(match[0])) externalUrls.add(match[0])
      }
    }
  }
}

if (!fs.existsSync(DIST)) throw new Error('Missing dist. Run npm run build first.')
inspect(DIST)

if (externalUrls.size) {
  console.error('Offline build check failed. External references found:')
  for (const url of externalUrls) console.error(`- ${url}`)
  process.exit(1)
}

console.log('✓ Offline build check passed: no external application resources found in dist/.')
