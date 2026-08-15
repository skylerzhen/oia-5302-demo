#!/usr/bin/env node
/**
 * Analyze voiceover → 13 contiguous segments for demo sync.
 * Output: video-output/voiceover-segments.json
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { SECTIONS } from './demo-timing.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const INPUT = process.argv[2] || path.join(ROOT, 'video-output/voiceover.m4a')
const OUT = path.join(ROOT, 'video-output/voiceover-segments.json')

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
}

function probeDur(file) {
  return Number(
    run(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`,
    ).trim(),
  )
}

function parseSpeech(audioPath, total) {
  const log = run(
    `ffmpeg -hide_banner -i "${audioPath}" -af silencedetect=noise=-38dB:d=0.5 -f null - 2>&1`,
  )
  const gaps = []
  for (const line of log.split('\n')) {
    const m = line.match(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/)
    if (m && Number(m[2]) >= 1.2) {
      gaps.push({ start: Number(m[1]) - Number(m[2]), end: Number(m[1]) })
    }
  }
  gaps.sort((a, b) => a.start - b.start)

  const speech = []
  let cur = 0
  for (const g of gaps) {
    if (g.start - cur > 0.2) speech.push({ start: cur, end: g.start })
    cur = g.end
  }
  if (total - cur > 0.2) speech.push({ start: cur, end: total })
  return speech
}

function mergeToSections(speech, n, total) {
  // Longest block ≈ C4 interview — 5 sections before, 7 after
  if (speech.length >= 8 && n === 13) {
    let li = 0
    let ld = 0
    for (let i = 0; i < speech.length; i++) {
      const d = speech[i].end - speech[i].start
      if (d > ld) {
        ld = d
        li = i
      }
    }
    if (ld >= 25) {
      const split = (arr, count) => {
        const out = []
        let idx = 0
        for (let g = 0; g < count; g++) {
          const take = Math.max(1, Math.round((arr.length - idx) / (count - g)))
          out.push(arr.slice(idx, idx + take))
          idx += take
        }
        return out
      }
      const pre = split(speech.slice(0, li), 5)
      const post = split(speech.slice(li + 1), 7)
      const c4 = speech[li]

      const segs = [{ start: 0, end: pre[1][0].start }]
      for (let i = 1; i < 5; i++) {
        segs.push({
          start: pre[i][0].start,
          end: i === 4 ? c4.start : pre[i + 1][0].start,
        })
      }
      segs.push({ start: c4.start, end: c4.end })
      for (let i = 0; i < 7; i++) {
        segs.push({
          start: i === 0 ? c4.end : post[i][0].start,
          end: i === 6 ? total : post[i + 1][0].start,
        })
      }
      return segs.map((s, i) => ({
        id: SECTIONS[i],
        start: s.start,
        end: s.end,
        duration: s.end - s.start,
      }))
    }
  }
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
  while (merged.length < n) merged.push({ firstStart: merged.at(-1).lastEnd, lastEnd: total })

  return merged.map((m, i) => {
    const start = i === 0 ? 0 : merged[i].firstStart
    const end = i === n - 1 ? total : merged[i + 1].firstStart
    return { id: SECTIONS[i], start, end, duration: end - start }
  })
}

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`Missing ${INPUT}`)
  const total = probeDur(INPUT)
  const speech = parseSpeech(INPUT, total)
  const segments = mergeToSections(speech, SECTIONS.length, total)

  const report = {
    source: INPUT,
    totalSec: total,
    speechChunks: speech.length,
    segments,
  }
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2))
  console.log(`Wrote ${OUT} (${total.toFixed(1)}s, ${segments.length} segments)`)
  segments.forEach((s) =>
    console.log(`  ${s.id}: ${s.start.toFixed(1)}–${s.end.toFixed(1)}s (${s.duration.toFixed(1)}s)`),
  )
}

main()
