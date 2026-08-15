/**
 * Generate narration audio via macOS `say` + ffmpeg concat.
 * Output: video-output/narration-full.wav
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { NARRATION } from './narration-segments.mjs'

const OUT_DIR = path.resolve('video-output/audio')
const VOICE = process.env.TTS_VOICE || 'Ting-Ting' // Chinese female; fallback Mei-Jia

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' })
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const parts = []

  for (const seg of NARRATION) {
    const base = path.join(OUT_DIR, seg.id)
    const aiff = `${base}.aiff`
    const wav = `${base}.wav`
    const safeText = seg.text.replace(/"/g, '\\"')
    console.log('TTS:', seg.title)
    try {
      run(`say -v "${VOICE}" -o "${aiff}" "${safeText}"`)
    } catch {
      console.warn(`Voice ${VOICE} unavailable, using default`)
      run(`say -o "${aiff}" "${safeText}"`)
    }
    run(`ffmpeg -y -i "${aiff}" "${wav}"`)
    parts.push(`file '${wav}'`)
    if (seg.pauseAfter > 0) {
      const silence = `${base}-silence.wav`
      run(
        `ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t ${seg.pauseAfter} -q:a 9 "${silence}"`,
      )
      parts.push(`file '${silence}'`)
    }
  }

  const listFile = path.join(OUT_DIR, 'concat-list.txt')
  fs.writeFileSync(listFile, parts.join('\n'))
  const outWav = path.resolve('video-output/narration-full.wav')
  run(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outWav}"`)
  console.log('Saved', outWav)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
