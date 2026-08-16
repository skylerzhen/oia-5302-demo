#!/usr/bin/env node
/**
 * Verify OpenAI TTS on local server or Render URL.
 *
 *   node scripts/verify-openai-tts.mjs
 *   node scripts/verify-openai-tts.mjs --url https://oia-5302-demo.onrender.com
 */
import { loadEnv } from '../server/load-env.mjs'
import { handleSynthesize } from '../server/speech-handlers.mjs'
import { speechAvailability } from '../server/speech-handlers.mjs'

const urlArg = process.argv.find((arg) => arg.startsWith('--url='))?.slice(6)
  ?? (process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : null)

async function verifyRemote(baseUrl) {
  const statusRes = await fetch(`${baseUrl.replace(/\/$/, '')}/api/local-ai/status`)
  const status = await statusRes.json()
  const synthRes = await fetch(`${baseUrl.replace(/\/$/, '')}/api/local-ai/tts/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'OpenAI TTS verification line for OIA demo.' }),
  })
  const synth = await synthRes.json()
  return { status, synth }
}

async function verifyLocal() {
  loadEnv()
  const speech = speechAvailability()
  const synth = await handleSynthesize({ text: 'OpenAI TTS verification line for OIA demo.' })
  return { status: { speech }, synth }
}

async function main() {
  const remote = urlArg?.trim()
  console.log(`\n🔊 OpenAI TTS verify — ${remote || 'local server'}\n`)

  const { status, synth } = remote ? await verifyRemote(remote) : await verifyLocal()
  const speech = status.speech ?? status

  console.log('Status:', JSON.stringify(speech, null, 2))
  console.log('Synthesize:', {
    mode: synth.mode,
    audioAvailable: synth.audioAvailable,
    ttsProvider: synth.ttsProvider,
    useBrowserTts: synth.useBrowserTts,
    audioBytes: synth.audioBase64 ? Math.round(synth.audioBase64.length * 0.75) : 0,
  })

  const ok = synth.audioAvailable && synth.ttsProvider === 'openai'
  if (ok) {
    console.log('\n✅ OpenAI TTS is active.\n')
    process.exit(0)
  }

  console.log('\n❌ OpenAI TTS not active.')
  if (speech.ttsProvider !== 'openai') {
    console.log('   → Set OPENAI_API_KEY on the API host (Render Environment).')
  }
  if (!synth.audioAvailable) {
    console.log('   → Deploy latest server/ (edge-tts.mjs, openai-tts.mjs, speech-handlers.mjs).')
  }
  console.log('')
  process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
