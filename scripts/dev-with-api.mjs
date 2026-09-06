import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from '../server/load-env.mjs'

loadEnv()

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
const apiEntry = join(ROOT, 'server', 'index.mjs')

if (!existsSync(viteBin)) {
  console.error('Missing dev dependencies. Run: npm install')
  process.exit(1)
}

const spawnOpts = {
  stdio: 'inherit',
  env: process.env,
  cwd: ROOT,
}

const api = spawn(process.execPath, [apiEntry], spawnOpts)
const web = spawn(process.execPath, [viteBin], spawnOpts)
function shutdown(code = 0) {
  api.kill('SIGTERM')
  web.kill('SIGTERM')
  process.exit(code)
}

api.on('exit', (code) => {
  if (code && code !== 0) shutdown(code)
})
web.on('exit', (code) => shutdown(code ?? 0))

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
