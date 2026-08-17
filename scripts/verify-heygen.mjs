#!/usr/bin/env node
/**
 * Verify HeyGen avatar-realtime (audio mode) on local env or Render URL.
 *
 *   node scripts/verify-heygen.mjs
 *   node scripts/verify-heygen.mjs --url https://oia-5302-demo.onrender.com
 *   node scripts/verify-heygen.mjs --speak   # full lip-sync round-trip (slow)
 */
import { loadEnv } from '../server/load-env.mjs'
import { authHeaders } from '../server/api-auth.mjs'
import { getHeyGenLook, getHeyGenWallet, handleHeyGenStatus, handleHeyGenSpeak, probeHeyGenRealtimeTts } from '../server/heygen-handlers.mjs'
import { handleSynthesize } from '../server/speech-handlers.mjs'

const urlArg = process.argv.find((arg) => arg.startsWith('--url='))?.slice(6)
  ?? (process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : null)
const speakTest = process.argv.includes('--speak')
const probeTest = process.argv.includes('--probe')

async function verifyRemote(baseUrl) {
  loadEnv()
  const root = baseUrl.replace(/\/$/, '')
  const statusRes = await fetch(`${root}/api/heygen/status`)
  const status = await statusRes.json()
  let speak = null
  if (speakTest) {
    const speakRes = await fetch(`${root}/api/heygen/speak`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ text: 'HeyGen verification line for OIA demo.' }),
    })
    speak = await speakRes.json()
  }
  return { status, speak }
}

async function verifyLocal() {
  loadEnv()
  const status = await handleHeyGenStatus()
  let speak = null
  let probe = null

  if (status.configured) {
    try {
      const wallet = await getHeyGenWallet()
      console.log('Wallet:', wallet)
    } catch (error) {
      console.log('Wallet fetch:', error instanceof Error ? error.message : error)
    }
    try {
      const look = await getHeyGenLook(process.env.HEYGEN_AVATAR_ID?.trim())
      console.log('Look:', {
        id: look?.id,
        name: look?.name,
        avatar_type: look?.avatar_type,
        default_voice_id: look?.default_voice_id,
      })
    } catch (error) {
      console.log('Look fetch:', error instanceof Error ? error.message : error)
    }
  }

  if (probeTest && status.configured) {
    const look = await getHeyGenLook(process.env.HEYGEN_AVATAR_ID?.trim()).catch(() => null)
    probe = await probeHeyGenRealtimeTts({
      avatarId: process.env.HEYGEN_AVATAR_ID?.trim(),
      voiceId: look?.default_voice_id ?? '1bd001e7e50f421d891986aad5158bc8',
    })
  }

  if (speakTest) {
    speak = await handleHeyGenSpeak(
      { text: 'HeyGen verification line for OIA demo.' },
      handleSynthesize,
    )
  }
  return { status, speak, probe }
}

async function main() {
  const remote = urlArg?.trim()
  console.log(`\n🎬 HeyGen verify — ${remote || 'local llm.env'}\n`)

  const { status, speak, probe } = remote ? await verifyRemote(remote) : await verifyLocal()

  console.log('Status:', JSON.stringify(status, null, 2))

  if (probe) {
    console.log('Probe (HeyGen TTS):', {
      streamId: probe.streamId,
      hlsUrl: probe.hlsUrl ? `${probe.hlsUrl.slice(0, 64)}…` : null,
    })
  }

  if (speakTest) {
    console.log('Speak:', {
      mode: speak?.mode,
      streamId: speak?.streamId,
      hlsUrl: speak?.hlsUrl ? `${speak.hlsUrl.slice(0, 64)}…` : null,
      ttsProvider: speak?.ttsProvider,
      error: speak?.error,
    })
  }

  const configured = Boolean(status?.configured)
  const speakOk = !speakTest || Boolean(speak?.hlsUrl)
  const probeOk = !probeTest || Boolean(probe?.hlsUrl)

  if (configured && speakOk && probeOk) {
    console.log(speakTest
      ? '\n✅ HeyGen configured and lip-sync stream returned HLS URL.\n'
      : probeTest
        ? '\n✅ HeyGen Avatar Realtime probe succeeded.\n'
        : '\n✅ HeyGen configured. Run with --speak to test full round-trip.\n')
    process.exit(0)
  }

  console.log('\n❌ HeyGen not ready.')
  if (!configured) {
    console.log('   → Set HEYGEN_API_KEY and HEYGEN_AVATAR_ID in llm.env (local) or Render env.')
    console.log('   → List public avatar looks: npm run heygen:list-avatars')
  }
  if (probeTest && !probeOk) {
    console.log('   → Realtime probe failed — check HeyGen API wallet credits and avatar ID.')
  }
  if (speakTest && !speakOk) {
    console.log('   → Speak test failed — check API key quota, avatar ID, and OpenAI TTS key.')
    if (speak?.error) console.log(`   → ${speak.error}`)
  }
  console.log('')
  process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
