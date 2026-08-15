#!/usr/bin/env node
/**
 * One-command demo video pipeline:
 * 1. Playwright screen recording
 * 2. macOS TTS narration
 * 3. ffmpeg merge → OIA-Demo-Final.mp4
 */
import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(fileURLToPath(import.meta.url))

function step(name, script) {
  console.log(`\n━━━ ${name} ━━━`)
  execSync(`node ${path.join(root, script)}`, { stdio: 'inherit', cwd: path.join(root, '..') })
}

console.log('OIA Demo Video Pipeline')
step('Record screen', 'record-demo.mjs')
step('Generate narration', 'generate-audio.mjs')
step('Assemble final MP4', 'assemble-video.mjs')
console.log('\nDone! Open video-output/OIA-Demo-Final.mp4')
