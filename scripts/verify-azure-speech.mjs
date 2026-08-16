#!/usr/bin/env node
/**
 * Verify Azure Speech TTS + viseme marks (local server or Render URL).
 *
 * Usage:
 *   node scripts/verify-azure-speech.mjs
 *   node scripts/verify-azure-speech.mjs --url https://oia-5302-demo.onrender.com
 *   npm run verify:azure
 */
import { loadEnv } from '../server/load-env.mjs'

loadEnv()

const args = process.argv.slice(2)
const urlFlag = args.find((a) => a.startsWith('--url='))?.slice('--url='.length)
  ?? (args.includes('--url') ? args[args.indexOf('--url') + 1] : null)

const baseUrl = urlFlag
  ?? process.env.LLM_API_URL
  ?? `http://127.0.0.1:${process.env.LLM_API_PORT ?? process.env.PORT ?? 8787}`

async function fetchJson(path, init) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, init)
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = { raw: text }
  }
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${body.error ?? text}`)
  }
  return body
}

function maskKeyPresent() {
  const key = process.env.AZURE_SPEECH_KEY?.trim()
  const region = process.env.AZURE_SPEECH_REGION?.trim()
  return Boolean(key && region && !key.includes('your-'))
}

async function main() {
  console.log(`\n🔊 Azure Speech verify — ${baseUrl}\n`)

  if (!urlFlag) {
    console.log(`Local llm.env: AZURE_SPEECH_KEY ${maskKeyPresent() ? 'SET' : 'MISSING'}`)
  }

  const status = await fetchJson('/api/local-ai/status')
  const speech = status.speech ?? {}
  console.log('Status:', JSON.stringify({ mode: status.mode, speech }, null, 2))

  const tts = await fetchJson('/api/local-ai/tts/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Welcome to the OIA AI interview. Please introduce yourself briefly.',
      language: 'en',
    }),
  })

  console.log('\nTTS result:')
  console.log(`  mode: ${tts.mode}`)
  console.log(`  audioAvailable: ${tts.audioAvailable}`)
  console.log(`  visemeSource: ${tts.visemeSource}`)
  console.log(`  visemeMarks: ${tts.visemeMarks?.length ?? 0}`)
  if (tts.visemeMarks?.length) {
    console.log(`  first marks: ${JSON.stringify(tts.visemeMarks.slice(0, 4))}`)
  }
  if (tts.audioBase64) {
    console.log(`  audioBase64: ${tts.audioBase64.length} chars (~${Math.round(tts.audioBase64.length * 0.75 / 1024)} KB)`)
  }

  const ok =
    speech.ttsProvider === 'azure'
    && tts.audioAvailable
    && tts.visemeSource === 'azure-sdk'
    && (tts.visemeMarks?.length ?? 0) > 0

  if (ok) {
    console.log('\n✅ Azure Speech TTS + viseme SDK looks good.\n')
    process.exit(0)
  }

  if (speech.ttsProvider === 'browser' || tts.useBrowserTts) {
    console.log('\n⚠️  Server is on browser TTS fallback — set AZURE_SPEECH_KEY + AZURE_SPEECH_REGION on this host.\n')
    process.exit(1)
  }

  if (tts.visemeSource !== 'azure-sdk') {
    console.log('\n⚠️  TTS audio may work but visemes are estimated (SDK viseme events missing).\n')
    process.exit(1)
  }

  console.log('\n⚠️  Partial success — review output above.\n')
  process.exit(1)
}

main().catch((err) => {
  console.error('\n❌', err.message)
  process.exit(1)
})
