import { spawn } from 'node:child_process'
import { loadEnv } from '../server/load-env.mjs'

loadEnv()

const api = spawn('node', ['server/index.mjs'], { stdio: 'inherit', env: process.env })
const web = spawn('npx', ['vite'], { stdio: 'inherit', env: process.env })

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
