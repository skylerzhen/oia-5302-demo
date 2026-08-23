import { spawnSync } from 'node:child_process'
import { loadEnv } from '../server/load-env.mjs'

loadEnv()

const DEFAULT_API_URL = 'https://oia-5302-demo.onrender.com'
const DEFAULT_DOMAIN = 'oia-rfq-5302.surge.sh'

const apiUrl = (process.argv[2] ?? process.env.VITE_LLM_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '')
const domain = process.argv[3] ?? DEFAULT_DOMAIN
const apiSecret = process.env.VITE_API_SECRET?.trim() ?? process.env.API_SECRET?.trim() ?? ''

console.log(`Building frontend with VITE_LLM_API_URL=${apiUrl}`)
console.log(`Deploying to domain: ${domain}`)
if (apiSecret) {
  console.log('VITE_API_SECRET loaded from llm.env (not printed)')
} else {
  console.warn('Warning: VITE_API_SECRET not set — cloud demo cannot call protected API after deploy')
}

// Surge build needs devDependencies (tsc, vite). Render uses --omit=dev only on the API host.
const spawnShell = process.platform === 'win32'

const install = spawnSync('npm', ['install'], {
  stdio: 'inherit',
  env: process.env,
  shell: spawnShell,
})
if (install.status !== 0) process.exit(install.status ?? 1)

const buildEnv = { ...process.env, VITE_LLM_API_URL: apiUrl }
if (apiSecret) buildEnv.VITE_API_SECRET = apiSecret

const build = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: buildEnv,
  shell: spawnShell,
})

if (build.status !== 0) process.exit(build.status ?? 1)

const deploy = spawnSync('npx', ['--yes', 'surge', 'dist', domain], {
  stdio: 'inherit',
  env: process.env,
  shell: spawnShell,
})

process.exit(deploy.status ?? 0)
