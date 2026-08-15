#!/usr/bin/env node
/**
 * Sync OIA-Demo-Screen.mp4 to full narration length → OIA-Demo-Final.mp4
 *
 * Keeps the entire audio track; stretches video uniformly via setpts so all
 * frames are preserved (slow-mo). No audio trim or crop.
 *
 * Usage:
 *   node scripts/sync-audio-video.mjs [path/to/narration.m4a]
 *   npm run video:sync
 *
 * Env:
 *   NARRATION_INPUT — override audio source path
 *   VIDEO_INPUT     — default video-output/OIA-Demo-Screen.mp4
 *
 * ⚠️  WARNING: This script stretches video with setpts (slow-mo) — causes 变速.
 *     Use: npm run video:mux  (scripts/mux-natural.mjs) instead.
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const VIDEO = process.env.VIDEO_INPUT || path.join(ROOT, 'video-output/OIA-Demo-Screen.mp4')
const OUT = path.join(ROOT, 'video-output/OIA-Demo-Final.mp4')
const VOICEOVER_CLEAN = path.join(ROOT, 'video-output/voiceover-clean.m4a')
const VOICEOVER = path.join(ROOT, 'video-output/voiceover.m4a')
const REPORT = path.join(ROOT, 'video-output/sync-report.json')

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: opts.quiet ? 'pipe' : 'inherit', ...opts })
}

function probeDuration(file) {
  const out = run(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
    { quiet: true },
  )
  return Number(out.trim())
}

function copyVoiceover(inputArg) {
  const src = inputArg || process.env.NARRATION_INPUT
  if (!src) {
    if (fs.existsSync(VOICEOVER)) return VOICEOVER
    throw new Error('Provide narration path: node scripts/sync-audio-video.mjs /path/to/voice.m4a')
  }
  if (!fs.existsSync(src)) throw new Error(`Narration not found: ${src}`)
  if (path.resolve(src) !== path.resolve(VOICEOVER)) {
    fs.copyFileSync(src, VOICEOVER)
    console.log('Copied →', VOICEOVER)
  }
  return VOICEOVER
}

function main() {
  const inputArg = process.argv[2]
  if (!fs.existsSync(VIDEO)) throw new Error(`Missing video: ${VIDEO}`)

  const voiceoverRaw = copyVoiceover(inputArg)
  const voiceover = fs.existsSync(VOICEOVER_CLEAN) ? VOICEOVER_CLEAN : voiceoverRaw
  if (voiceover === VOICEOVER_CLEAN) console.log('Using cleaned audio:', VOICEOVER_CLEAN)
  const videoDur = probeDuration(VIDEO)
  const audioDur = probeDuration(voiceover)
  const ratio = audioDur / videoDur

  console.log('\n--- Sync plan ---')
  console.log(`Video duration  : ${videoDur.toFixed(3)}s`)
  console.log(`Audio duration  : ${audioDur.toFixed(3)}s`)
  console.log(`Stretch ratio   : ${ratio.toFixed(4)}× (uniform slow-mo via setpts)`)
  console.log(`Method          : time-stretch video to match full audio (no audio trim)`)

  run(
    `ffmpeg -hide_banner -y -i "${VIDEO}" -i "${voiceover}" ` +
      `-filter:v "setpts=${ratio}*PTS" ` +
      `-map 0:v:0 -map 1:a:0 ` +
      `-c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p ` +
      `-c:a aac -b:a 192k -movflags +faststart "${OUT}"`,
  )

  const finalDur = probeDuration(OUT)
  const finalSize = fs.statSync(OUT).size
  const delta = Math.abs(finalDur - audioDur)

  const report = {
    generatedAt: new Date().toISOString(),
    method: 'setpts_uniform_stretch',
    inputs: { video: VIDEO, voiceover, videoDurationSec: videoDur, audioDurationSec: audioDur },
    output: { path: OUT, durationSec: finalDur, sizeBytes: finalSize },
    adjustments: { stretchRatio: ratio, durationDeltaSec: delta },
  }
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2))

  if (delta > 0.5) {
    console.warn(`\n⚠️  Output duration differs from audio by ${delta.toFixed(3)}s (tolerance ±0.5s)`)
  }

  console.log('\n✅ Final video:', OUT)
  console.log(`   Duration: ${finalDur.toFixed(2)}s | Size: ${(finalSize / 1024 / 1024).toFixed(2)} MB`)
  console.log('   Report  :', REPORT)
}

main()
