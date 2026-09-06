import { randomUUID } from 'node:crypto'

const SAMPLE_RATE = 24_000
const BYTES_PER_SAMPLE = 2
/** LiveAvatar docs: ~1s PCM chunks, paced at realtime (not 40ms burst). */
const CHUNK_DURATION_MS = 1000
const CHUNK_BYTES = Math.floor(SAMPLE_RATE * BYTES_PER_SAMPLE * (CHUNK_DURATION_MS / 1000))

const sessions = new Map()

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForWsOpen(ws) {
  if (ws.readyState === WebSocket.OPEN) return
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('LiveAvatar WebSocket open timeout')), 15_000)
    ws.addEventListener('open', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
    ws.addEventListener('error', (event) => {
      clearTimeout(timer)
      reject(event.error ?? new Error('LiveAvatar WebSocket error'))
    }, { once: true })
  })
}

async function waitForWsConnected(ws) {
  await waitForWsOpen(ws)
  if (ws.__liveAvatarConnected) return

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('LiveAvatar session connect timeout')), 20_000)

    const onMessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data))
        if (payload?.type === 'session.state_updated' && payload?.state === 'connected') {
          ws.__liveAvatarConnected = true
          clearTimeout(timer)
          ws.removeEventListener('message', onMessage)
          resolve()
        }
      } catch {
        // ignore non-json frames
      }
    }

    ws.addEventListener('message', onMessage)
    ws.addEventListener('error', (event) => {
      clearTimeout(timer)
      ws.removeEventListener('message', onMessage)
      reject(event.error ?? new Error('LiveAvatar WebSocket error'))
    }, { once: true })
  })
}

function chunkPcm(pcmBuffer) {
  const chunks = []
  for (let offset = 0; offset < pcmBuffer.length; offset += CHUNK_BYTES) {
    chunks.push(pcmBuffer.subarray(offset, offset + CHUNK_BYTES))
  }
  return chunks.length ? chunks : [pcmBuffer]
}

async function speakPcmOnSocket(ws, pcmBuffer, signal) {
  await waitForWsConnected(ws)

  if (signal?.aborted) {
    throw new DOMException('Speech interrupted', 'AbortError')
  }

  const chunks = chunkPcm(pcmBuffer)
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]
    if (signal?.aborted) throw new DOMException('Speech interrupted', 'AbortError')
    ws.send(JSON.stringify({
      type: 'agent.speak',
      audio: chunk.toString('base64'),
    }))
    const chunkDurationMs = Math.max(
      20,
      Math.round((chunk.length / (SAMPLE_RATE * BYTES_PER_SAMPLE)) * 1000),
    )
    // First chunk goes out immediately; later chunks follow realtime pacing.
    if (index > 0) {
      await sleep(chunkDurationMs)
    }
  }

  const speakEnded = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('LiveAvatar speak timed out')), 90_000)

    const onMessage = (event) => {
      try {
        const payload = JSON.parse(String(event.data))
        if (payload?.type === 'agent.speak_ended') {
          clearTimeout(timer)
          ws.removeEventListener('message', onMessage)
          resolve()
        }
      } catch {
        // ignore
      }
    }

    const onAbort = () => {
      clearTimeout(timer)
      ws.removeEventListener('message', onMessage)
      try {
        ws.send(JSON.stringify({ type: 'agent.interrupt' }))
      } catch {
        // ignore
      }
      reject(new DOMException('Speech interrupted', 'AbortError'))
    }

    ws.addEventListener('message', onMessage)
    signal?.addEventListener('abort', onAbort, { once: true })
  })

  ws.send(JSON.stringify({ type: 'agent.speak_end', event_id: randomUUID() }))
  await speakEnded
}

export async function openLiveAvatarSession(startResult) {
  const { sessionId, wsUrl } = startResult
  if (!wsUrl) {
    throw new Error('LiveAvatar LITE session did not return ws_url — check API credits at app.liveavatar.com')
  }

  const ws = new WebSocket(wsUrl)
  await waitForWsConnected(ws)

  sessions.set(sessionId, {
    ws,
    ...startResult,
    createdAt: Date.now(),
  })

  return sessionId
}

export function getLiveAvatarSession(sessionId) {
  return sessions.get(sessionId) ?? null
}

export async function speakLiveAvatarSession(sessionId, pcmBuffer, signal) {
  const entry = sessions.get(sessionId)
  if (!entry?.ws) throw new Error(`LiveAvatar session not found: ${sessionId}`)
  await speakPcmOnSocket(entry.ws, pcmBuffer, signal)
}

export async function closeLiveAvatarSession(sessionId) {
  const entry = sessions.get(sessionId)
  if (!entry) return
  sessions.delete(sessionId)
  try {
    entry.ws.close()
  } catch {
    // ignore
  }
}

export function listLiveAvatarSessionIds() {
  return [...sessions.keys()]
}
