#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { loadEnv } from '../server/load-env.mjs'
import { createLiveAvatarSessionToken, startLiveAvatarSession } from '../server/liveavatar-handlers.mjs'
import { synthesizeOpenAiTtsPcm } from '../server/openai-tts.mjs'

loadEnv()

const key = process.env.LIVEAVATAR_API_KEY?.trim()
const token = await createLiveAvatarSessionToken()
const start = await startLiveAvatarSession(token)
const ws = new WebSocket(start.wsUrl)

await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve)
  ws.addEventListener('error', reject)
})

await new Promise((resolve) => {
  ws.addEventListener('message', (event) => {
    const payload = JSON.parse(String(event.data))
    if (payload.type === 'session.state_updated' && payload.state === 'connected') resolve()
  })
})

const { audioBuffer } = await synthesizeOpenAiTtsPcm('Hello from OIA demo.')
const eventId = randomUUID()
const chunkBytes = 48_000

console.log('pcm bytes', audioBuffer.length)

ws.addEventListener('message', (event) => {
  console.log('RX', String(event.data))
})

for (let offset = 0; offset < audioBuffer.length; offset += chunkBytes) {
  const chunk = audioBuffer.subarray(offset, offset + chunkBytes)
  ws.send(JSON.stringify({ type: 'agent.speak', audio: chunk.toString('base64') }))
  await new Promise((resolve) => setTimeout(resolve, 40))
}

ws.send(JSON.stringify({ type: 'agent.speak_end', event_id: eventId }))
console.log('sent speak_end', eventId)
await new Promise((resolve) => setTimeout(resolve, 20_000))

await fetch('https://api.liveavatar.com/v1/sessions/stop', {
  method: 'POST',
  headers: { accept: 'application/json', 'X-API-KEY': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ session_id: start.sessionId, reason: 'USER_CLOSED' }),
})
ws.close()
