#!/usr/bin/env node
/**
 * Segment-based A/V sync: video plays at 1×, pads with frozen frame when
 * narration runs longer. Preserves full audio (no trim).
 *
 * Usage: node scripts/sync-segmented.mjs
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const VIDEO = path.join(ROOT, 'video-output/OIA-Demo-Screen.mp4')
const AUDIO = path.join(ROOT, 'video-output/voiceover-clean.m4a')
const AUDIO_RAW = path.join(ROOT, 'video-output/voiceover.m4a')
const OUT = path.join(ROOT, 'video-output/OIA-Demo-Final.mp4')
const WORK = path.join(ROOT, 'video-output/seg-work')

/** 12 scene-aligned video cuts (from recording + scene detect) */
const VIDEO_SEGS = [
  [0, 8.2],
  [8.2, 10.8],
  [10.8, 22.92],
  [22.92, 24.48],
  [24.48, 53.52],
  [53.52, 55.08],
  [55.08, 61.16],
  [61.16, 64.2],
  [64.2, 66.72],
  [66.72, 71.8],
  [71.8, 75.84],
  [75.84, 87.68],
]

function run(cmd, quiet = false) {
  const out = execSync(cmd, {
    encoding: 'utf8',
    stdio: quiet ? ['pipe', 'pipe', 'pipe'] : 'inherit',
  })
  return quiet ? out : ''
}

function probeDur(file) {
  const out = run(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
    true,
  )
  const n = Number(String(out).trim())
  if (!n) throw new Error(`Could not probe duration: ${file}`)
  return n
}

function parseAudioSegments(audioPath) {
  const log = run(
    `ffmpeg -hide_banner -i "${audioPath}" -af silencedetect=noise=-38dB:d=0.55 -f null - 2>&1`,
    true,
  )
  const total = probeDur(audioPath)
  const gaps = []
  for (const line of log.split('\n')) {
    const m = line.match(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/)
    if (m && Number(m[2]) >= 1.5) {
      gaps.push({ start: Number(m[1]) - Number(m[2]), end: Number(m[1]) })
    }
  }
  gaps.sort((a, b) => a.start - b.start)

  const speech = []
  let cur = 0
  for (const g of gaps) {
    if (g.start - cur > 0.3) speech.push({ start: cur, end: g.start })
    cur = g.end
  }
  if (total - cur > 0.3) speech.push({ start: cur, end: total })

  // Merge speech chunks → 12 groups, then build contiguous timeline (no gaps)
  const n = VIDEO_SEGS.length
  const merged = []
  let idx = 0
  for (let g = 0; g < n; g++) {
    const remainingGroups = n - g
    const remainingSegs = speech.length - idx
    const take = Math.max(1, Math.round(remainingSegs / remainingGroups))
    const chunk = speech.slice(idx, idx + take)
    idx += take
    if (!chunk.length) break
    merged.push({ firstStart: chunk[0].start, lastEnd: chunk[chunk.length - 1].end })
  }
  while (merged.length < n) {
    merged.push({ firstStart: merged.at(-1).lastEnd, lastEnd: total })
  }
  if (merged.length > n) merged.length = n

  const groups = merged.map((m, i) => {
    const start = i === 0 ? 0 : merged[i].firstStart
    const end = i === n - 1 ? total : merged[i + 1].firstStart
    return { start, end, dur: end - start }
  })
  return groups
}

function main() {
  const audioIn = fs.existsSync(AUDIO) ? AUDIO : AUDIO_RAW
  if (!fs.existsSync(VIDEO)) throw new Error(`Missing ${VIDEO}`)
  if (!fs.existsSync(audioIn)) throw new Error(`Missing ${audioIn}`)

  fs.rmSync(WORK, { recursive: true, force: true })
  fs.mkdirSync(WORK, { recursive: true })

  const audioSegs = parseAudioSegments(audioIn)
  console.log('\n--- Segment sync (1× video + freeze pad) ---')
  console.log(`Video segments: ${VIDEO_SEGS.length} | Audio groups: ${audioSegs.length}`)

  const parts = []
  for (let i = 0; i < VIDEO_SEGS.length; i++) {
    const [vStart, vEnd] = VIDEO_SEGS[i]
    const aSeg = audioSegs[i]
    const vDur = vEnd - vStart
    const aDur = aSeg.dur ?? (aSeg.end - aSeg.start)
    const part = path.join(WORK, `part-${String(i + 1).padStart(2, '0')}.mp4`)

    console.log(
      `#${i + 1}  video ${vStart.toFixed(1)}–${vEnd.toFixed(1)}s (${vDur.toFixed(1)}s)  ` +
        `audio ${aSeg.start.toFixed(1)}–${aSeg.end.toFixed(1)}s (${aDur.toFixed(1)}s)`,
    )

    const trimmed = path.join(WORK, `trim-${i}.mp4`)
    run(
      `ffmpeg -hide_banner -y -ss ${vStart} -to ${vEnd} -i "${VIDEO}" -an ` +
        `-c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${trimmed}"`,
      true,
    )

    if (aDur > vDur + 0.05) {
      const pad = aDur - vDur
      run(
        `ffmpeg -hide_banner -y -i "${trimmed}" -vf "tpad=stop_mode=clone:stop_duration=${pad.toFixed(3)}" ` +
          `-c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${part}"`,
        true,
      )
    } else if (aDur < vDur - 0.05) {
      const ratio = aDur / vDur
      run(
        `ffmpeg -hide_banner -y -i "${trimmed}" -vf "setpts=${ratio.toFixed(6)}*PTS" ` +
          `-c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p "${part}"`,
        true,
      )
    } else {
      fs.copyFileSync(trimmed, part)
    }
    parts.push(part)
  }

  const listFile = path.join(WORK, 'concat.txt')
  fs.writeFileSync(listFile, parts.map((p) => `file '${p}'`).join('\n'))

  const concatOut = path.join(WORK, 'video-stretched.mp4')
  run(`ffmpeg -hide_banner -y -f concat -safe 0 -i "${listFile}" -c copy "${concatOut}"`, true)

  run(
    `ffmpeg -hide_banner -y -i "${concatOut}" -i "${audioIn}" ` +
      `-map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -movflags +faststart "${OUT}"`,
  )

  const finalDur = probeDur(OUT)
  const audioDur = probeDur(audioIn)
  console.log(`\n✅ ${OUT}`)
  console.log(`   Duration: ${finalDur.toFixed(2)}s (audio ${audioDur.toFixed(2)}s)`)
  console.log(`   Size: ${(fs.statSync(OUT).size / 1024 / 1024).toFixed(2)} MB`)
}

main()
