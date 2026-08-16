import { spawnSync } from 'node:child_process'

const DEFAULT_API_URL = 'https://oia-5302-demo.onrender.com'
const apiUrl = (process.argv[2] ?? process.env.VITE_LLM_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '')

console.log(`Building frontend with VITE_LLM_API_URL=${apiUrl}`)

const build = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_LLM_API_URL: apiUrl },
})

if (build.status !== 0) process.exit(build.status ?? 1)

const deploy = spawnSync('npx', ['--yes', 'surge', 'dist', 'oia-rfq-5302.surge.sh'], {
  stdio: 'inherit',
  env: process.env,
})

process.exit(deploy.status ?? 0)
