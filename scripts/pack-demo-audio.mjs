import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from '../server/load-env.mjs'
import { synthesizeEdgeTts } from '../server/edge-tts.mjs'
import { openAiTtsConfigured, synthesizeOpenAiTts } from '../server/openai-tts.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public/demo-audio')

const OPENING_TEXT =
  'Welcome to OIA. Please describe a recent portfolio analysis you led and how you communicated risks to senior stakeholders.'

async function main() {
  loadEnv(ROOT)
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const outPath = path.join(OUT_DIR, 'opening-en.mp3')

  if (openAiTtsConfigured()) {
    const voice = process.env.OPENAI_TTS_VOICE?.trim() || 'shimmer'
    const { audioBuffer } = await synthesizeOpenAiTts(OPENING_TEXT)
    fs.writeFileSync(outPath, audioBuffer)
    console.log(`✓ ${outPath} (${Math.round(audioBuffer.length / 1024)} KB, OpenAI ${voice})`)
    return
  }

  const voice = process.env.EDGE_TTS_VOICE_EN?.trim() || 'en-US-AvaMultilingualNeural'
  const { audioBuffer } = await synthesizeEdgeTts(OPENING_TEXT, voice)
  fs.writeFileSync(outPath, audioBuffer)
  console.log(`✓ ${outPath} (${Math.round(audioBuffer.length / 1024)} KB, Edge ${voice})`)
}

main().catch((error) => {
  console.error('Demo audio generation failed:', error)
  process.exit(1)
})
