import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function loadEnv(rootDir = process.cwd()) {
  for (const fileName of ['llm.env', '.env.local', '.env']) {
    const filePath = resolve(rootDir, fileName)
    if (!existsSync(filePath)) continue
    for (const line of readFileSync(filePath, 'utf8').split('\n')) {
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
