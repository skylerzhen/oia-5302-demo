#!/usr/bin/env node
/**
 * Strong mouth-click / lip-smack reduction (口水音).
 * Double-pass adeclick + light denoise. No pitch/speed change.
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const INPUT = process.argv[2] || path.join(ROOT, 'video-output/voiceover.m4a')
const OUTPUT = path.join(ROOT, 'video-output/voiceover-clean.m4a')

// Pass 1: aggressive impulsive click removal
// Pass 2: lighter pass for residual smacks
// afftdn: gentle broadband cleanup; highpass removes rumble
const FILTER = [
  'highpass=f=100',
  'adeclick=t=7:b=4:w=60',
  'adeclick=t=4:b=3:w=55',
  'afftdn=nr=10:nf=-40:nt=w',
  'acompressor=threshold=-20dB:ratio=2:attack=5:release=100:makeup=1',
].join(',')

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`Missing: ${INPUT}`)
  console.log('Cleaning (strong) →', OUTPUT)
  execSync(
    `ffmpeg -hide_banner -y -i "${INPUT}" -af "${FILTER}" -c:a aac -b:a 192k "${OUTPUT}"`,
    { stdio: 'inherit' },
  )
  console.log('Done')
}

main()
