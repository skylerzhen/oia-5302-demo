#!/usr/bin/env node
import { loadEnv } from '../server/load-env.mjs'
import { liveAvatarConfigured, handleLiveAvatarSessionStart, handleLiveAvatarSessionStop } from '../server/liveavatar-handlers.mjs'
import { synthesizeOpenAiTtsPcm } from '../server/openai-tts.mjs'
import { speakLiveAvatarSession } from '../server/liveavatar-session.mjs'

const baseUrl = process.argv.includes('--url')
  ? process.argv[process.argv.indexOf('--url') + 1]
  : null

loadEnv()

async function verifyRemote() {
  const statusRes = await fetch(`${baseUrl.replace(/\/$/, '')}/api/liveavatar/status`)
  const status = await statusRes.json()
  console.log('status:', status)
  if (!status.configured) {
    throw new Error('LiveAvatar not configured on remote API')
  }

  const startRes = await fetch(`${baseUrl.replace(/\/$/, '')}/api/liveavatar/session/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  const started = await startRes.json()
  if (!startRes.ok) throw new Error(started.error ?? 'session start failed')
  console.log('session started:', started.sessionId)

  const speakRes = await fetch(`${baseUrl.replace(/\/$/, '')}/api/liveavatar/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: started.sessionId,
      text: 'LiveAvatar verification line for OIA demo.',
    }),
  })
  const spoke = await speakRes.json()
  if (!speakRes.ok) throw new Error(spoke.error ?? 'speak failed')
  console.log('speak ok:', spoke)

  await fetch(`${baseUrl.replace(/\/$/, '')}/api/liveavatar/session/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: started.sessionId }),
  })
}

async function verifyLocal() {
  if (!liveAvatarConfigured()) {
    throw new Error('Set LIVEAVATAR_API_KEY and LIVEAVATAR_AVATAR_ID in llm.env')
  }

  let sessionId = null
  try {
    const started = await handleLiveAvatarSessionStart()
    sessionId = started.sessionId
    console.log('session started:', sessionId, started.livekitUrl)

    console.log('synthesizing OpenAI PCM TTS...')
    const { audioBuffer } = await synthesizeOpenAiTtsPcm('LiveAvatar local verification for OIA demo.')
    console.log('PCM bytes:', audioBuffer.length)

    console.log('speaking via LiveAvatar WebSocket...')
    await speakLiveAvatarSession(sessionId, audioBuffer)
    console.log('PCM speak completed')
  } finally {
    if (sessionId) {
      await handleLiveAvatarSessionStop({ sessionId })
      console.log('session stopped')
    }
  }
}

try {
  if (baseUrl) {
    await verifyRemote()
  } else {
    await verifyLocal()
  }
  console.log('LiveAvatar verification passed')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
