import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readEnvText(filePath) {
  const buf = readFileSync(filePath)
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString('utf16le').replace(/^\uFEFF/, '')
  }
  // UTF-16 LE without BOM (some Windows editors write wide chars this way)
  if (buf.length >= 4 && buf[1] === 0x00 && buf[3] === 0x00 && buf[0] < 0x80) {
    return buf.toString('utf16le')
  }
  return buf.toString('utf8').replace(/^\uFEFF/, '')
}

export function loadEnv(rootDir = process.cwd()) {
  for (const fileName of ['llm.env', '.env.local', '.env']) {
    const filePath = resolve(rootDir, fileName)
    if (!existsSync(filePath)) continue
    for (const line of readEnvText(filePath).split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const separator = trimmed.indexOf('=')
      if (separator <= 0) continue
      const key = trimmed.slice(0, separator).trim()
      const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
      if (!process.env[key]) process.env[key] = value
    }
    break
  }
}
