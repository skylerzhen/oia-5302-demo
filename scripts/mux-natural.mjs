#!/usr/bin/env node
/**
 * Natural-speed mux — NO setpts / slow-mo / speed change.
 *
 * Fixes common Windows screen-recording issues:
 * - Variable or wrong frame-rate metadata → constant 30 fps
 * - Broken PTS timestamps → regenerate with genpts
 * - Duration mismatch → freeze last frame or trim video tail (never trim audio)
 *
 * Usage:
 *   node scripts/mux-natural.mjs [screen.mp4] [audio.m4a]
 *   npm run video:mux
 *
 * Env:
 *   VIDEO_INPUT, AUDIO_INPUT, OUTPUT
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const VIDEO = process.env.VIDEO_INPUT || path.join(ROOT, 'video-output/OIA-Demo-Screen.mp4')
const AUDIO =
  process.env.AUDIO_INPUT ||
  (fs.existsSync(path.join(ROOT, 'video-output/voiceover-clean.m4a'))
    ? path.join(ROOT, 'video-output/voiceover-clean.m4a')
    : path.join(ROOT, 'video-output/voiceover.m4a'))
const OUT = process.env.OUTPUT || path.join(ROOT, 'video-output/OIA-Demo-Final.mp4')
const REPORT = path.join(ROOT, 'video-output/mux-report.json')
const FPS = Number(process.env.OUTPUT_FPS || 30)

function run(cmd, quiet = false) {
  return execSync(cmd, { encoding: 'utf8', stdio: quiet ? 'pipe' : 'inherit' })
}

function probe(file) {
  const raw = run(
    `ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,r_frame_rate,avg_frame_rate,duration -of json "${file}"`,
    true,
  )
  return JSON.parse(raw)
}

function dur(file) {
  return Number(probe(file).format.duration)
}

function main() {
  if (!fs.existsSync(VIDEO)) throw new Error(`Missing video: ${VIDEO}`)
  if (!fs.existsSync(AUDIO)) throw new Error(`Missing audio: ${AUDIO}`)

  const videoDur = dur(VIDEO)
  const audioDur = dur(AUDIO)
  const delta = videoDur - audioDur

  console.log('\n--- Natural mux (no speed change) ---')
  console.log(`Video : ${videoDur.toFixed(3)}s  ${VIDEO}`)
  console.log(`Audio : ${audioDur.toFixed(3)}s  ${AUDIO}`)
  console.log(`Delta : ${delta >= 0 ? '+' : ''}${delta.toFixed(3)}s (video − audio)`)
  console.log(`Output: ${OUT}`)
  console.log(`FPS   : ${FPS} (constant, duration preserved)\n`)

  let vf = `fps=${FPS},format=yuv420p`
  if (delta < -0.05) {
    const pad = (-delta).toFixed(3)
    console.log(`Video shorter than audio → freeze last frame for ${pad}s`)
    vf = `${vf},tpad=stop_mode=clone:stop_duration=${pad}`
  }

  const tmpVideo = path.join(ROOT, 'video-output/.mux-natural-video.mp4')
  run(
    `ffmpeg -hide_banner -y -fflags +genpts -i "${VIDEO}" ` +
      `-vf "${vf}" -an ` +
      `-c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p ` +
      `-fps_mode cfr -movflags +faststart "${tmpVideo}"`,
  )

  let mapVideo = tmpVideo
  if (delta > 0.05) {
    console.log(`Video longer than audio → trim video tail to ${audioDur.toFixed(3)}s (audio untouched)`)
    const trimmed = path.join(ROOT, 'video-output/.mux-natural-trimmed.mp4')
    run(
      `ffmpeg -hide_banner -y -i "${tmpVideo}" -t ${audioDur.toFixed(6)} ` +
        `-c:v copy -movflags +faststart "${trimmed}"`,
    )
    mapVideo = trimmed
  }

  run(
    `ffmpeg -hide_banner -y -i "${mapVideo}" -i "${AUDIO}" ` +
      `-map 0:v:0 -map 1:a:0 ` +
      `-c:v copy -c:a aac -b:a 192k -ar 48000 ` +
      `-shortest -movflags +faststart "${OUT}"`,
  )

  for (const f of [tmpVideo, path.join(ROOT, 'video-output/.mux-natural-trimmed.mp4')]) {
    if (fs.existsSync(f)) fs.unlinkSync(f)
  }

  const outDur = dur(OUT)
  const report = {
    generatedAt: new Date().toISOString(),
    method: 'natural_mux_cfr_no_speed_change',
    inputs: { video: VIDEO, audio: AUDIO, videoDurationSec: videoDur, audioDurationSec: audioDur },
    output: { path: OUT, durationSec: outDur, fps: FPS, sizeBytes: fs.statSync(OUT).size },
    adjustments: {
      durationDeltaSec: delta,
      videoPadSec: delta < -0.05 ? -delta : 0,
      videoTrimSec: delta > 0.05 ? delta : 0,
    },
  }
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2))

  console.log(`\n✅ ${OUT}`)
  console.log(`   ${outDur.toFixed(2)}s · ${(report.output.sizeBytes / 1024 / 1024).toFixed(1)} MB`)
  console.log(`   Report: ${REPORT}`)
}

main()
