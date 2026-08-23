import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = path.join(ROOT, 'data/issue-5302-inputs')
const OUT_DIR = path.join(ROOT, 'public/downloads')
const OUT_ZIP = path.join(OUT_DIR, 'oia-5302-cv-data-package.zip')

if (!fs.existsSync(SOURCE)) {
  console.error('Missing data/issue-5302-inputs')
  process.exit(1)
}

fs.mkdirSync(OUT_DIR, { recursive: true })
if (fs.existsSync(OUT_ZIP)) fs.unlinkSync(OUT_ZIP)

function zipWithPowerShell() {
  const sourceGlob = path.join(SOURCE, '*')
  const ps = [
    `$ErrorActionPreference = 'Stop'`,
    `Compress-Archive -Path ${JSON.stringify(sourceGlob)} -DestinationPath ${JSON.stringify(OUT_ZIP)} -Force`,
  ].join('; ')
  execSync(`powershell -NoProfile -Command ${JSON.stringify(ps)}`, { stdio: 'inherit' })
}

function zipWithUnixZip() {
  execSync(
    `zip -r ${JSON.stringify(OUT_ZIP)} . -x "*.DS_Store"`,
    { cwd: SOURCE, stdio: 'inherit' },
  )
}

try {
  if (process.platform === 'win32') {
    zipWithPowerShell()
  } else {
    zipWithUnixZip()
  }
} catch (error) {
  if (process.platform === 'win32') {
    throw error
  }
  zipWithPowerShell()
}

const sizeKb = Math.round(fs.statSync(OUT_ZIP).size / 1024)
console.log(`✓ public/downloads/oia-5302-cv-data-package.zip (${sizeKb} KB)`)
