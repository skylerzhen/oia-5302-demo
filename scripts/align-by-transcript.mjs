#!/usr/bin/env node
/**
 * Align voiceover to demo screens using Whisper transcript + script anchors.
 * Output: video-output/voiceover-segments.json
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { SECTIONS } from './demo-timing.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const VOICEOVER = path.join(ROOT, 'video-output/voiceover.m4a')
const WHISPER_JSON = path.join(ROOT, 'video-output/voiceover-16k.json')
const OUT = path.join(ROOT, 'video-output/voiceover-segments.json')

/** Order matters — first match after previous boundary wins */
const ANCHORS = [
  { id: '01-open', patterns: [/hiring assistant demo/i] },
  { id: '02-s0', patterns: [/slide shows|online or offline|Green is connected/i] },
  { id: '03-c1', patterns: [/job seekers side|logging in and upload/i] },
  { id: '04-c2', patterns: [/CV update|side by side|press accept/i] },
  { id: '05-c3', patterns: [/online test|pick answers and submit/i] },
  { id: '06-c4', patterns: [/AI interview/i] },
  { id: '07-c56', patterns: [/match score and status|cannot hire or reject/i] },
  { id: '08-h1', patterns: [/HR dashboard|open the HR side/i] },
  { id: '09-h2', patterns: [/short list|move someone forward/i] },
  { id: '10-h3', patterns: [/watch the interview again|Press play/i] },
  { id: '11-h4', patterns: [/last step is hire|hire or reject/i] },
  { id: '12-h5', patterns: [/table lists|export it to a file/i] },
  { id: '13-close', patterns: [/full demo|Thank you/i] },
]

function ensureWhisper() {
  if (fs.existsSync(WHISPER_JSON)) return
  const wav = path.join(ROOT, 'video-output/voiceover-16k.wav')
  if (!fs.existsSync(wav)) {
    execSync(`ffmpeg -y -i "${VOICEOVER}" -ar 16000 -ac 1 "${wav}"`, { stdio: 'inherit' })
  }
  console.log('Running Whisper (first time may take ~2 min)...')
  execSync(
    `python3 -m whisper "${wav}" --model base --language en --output_format json --output_dir "${path.join(ROOT, 'video-output')}"`,
    { stdio: 'inherit' },
  )
}

function findAnchorStart(segments, patterns, after = 0) {
  for (const seg of segments) {
    if (seg.start < after - 0.1) continue
    const text = seg.text
    if (patterns.some((p) => p.test(text))) return seg.start
  }
  return null
}

function main() {
  ensureWhisper()
  const { segments: whisperSegs } = JSON.parse(fs.readFileSync(WHISPER_JSON, 'utf8'))
  const total = whisperSegs.at(-1).end

  const starts = []
  let after = 0
  for (const anchor of ANCHORS) {
    let t = anchor.id === '01-open' ? 0 : findAnchorStart(whisperSegs, anchor.patterns, after)
    if (t == null) t = after + 1
    starts.push({ id: anchor.id, start: t })
    after = t + 0.5
  }

  const aligned = starts.map((s, i) => {
    const end = i === starts.length - 1 ? total : starts[i + 1].start
    return { id: s.id, start: s.start, end, duration: end - s.start }
  })

  const report = {
    method: 'whisper_content_anchors',
    source: VOICEOVER,
    totalSec: total,
    segments: aligned,
    whisperExcerpt: whisperSegs.map((s) => `[${s.start.toFixed(1)}] ${s.text.trim()}`),
  }
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2))

  console.log(`\nContent-aligned segments → ${OUT}\n`)
  aligned.forEach((s) => {
    console.log(`  ${s.id}: ${s.start.toFixed(1)}–${s.end.toFixed(1)}s (${s.duration.toFixed(1)}s)`)
  })
}

main()
