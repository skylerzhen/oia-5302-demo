/**
 * Merge screen recording + narration into final MP4.
 * Output: video-output/OIA-Demo-Final.mp4
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const VIDEO = path.resolve('video-output/raw/demo-recording.webm')
const AUDIO = path.resolve('video-output/narration-full.wav')
const OUT = path.resolve('video-output/OIA-Demo-Final.mp4')

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' })
}

function main() {
  if (!fs.existsSync(VIDEO)) throw new Error('Missing demo-recording.webm — run record-demo first')
  if (!fs.existsSync(AUDIO)) throw new Error('Missing narration-full.wav — run generate-audio first')

  // Pad to longer stream; normalize video to mp4
  run(
    `ffmpeg -y -i "${VIDEO}" -i "${AUDIO}" ` +
      `-filter_complex "[0:v]setpts=1.0*PTS[v];[v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[vout]" ` +
      `-map "[vout]" -map 1:a:0 -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k ` +
      `-shortest "${OUT}"`,
  )
  console.log('\n✅ Final video:', OUT)
}

main()
