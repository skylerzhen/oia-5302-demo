import { randomUUID } from 'node:crypto'

const SAMPLE_RATE = 24_000
const BYTES_PER_SAMPLE = 2
/** Stream PCM at realtime — sending 1s chunks every 40ms breaks LiveAvatar lip-sync. */
const CHUNK_DURATION_MS = 100
const CHUNK_BYTES = Math.floor(SAMPLE_RATE * BYTES_PER_SAMPLE * (CHUNK_DURATION_MS / 1000))

const sessions = new Map()

/** LiveAvatar LITE idle-closes the control WebSocket without periodic keep-alive (~1–2 min). */
const KEEP_ALIVE_MS = 30_000

function stopKeepAlive(entry) {
  if (entry?.keepAliveTimer) {
    clearInterval(entry.keepAliveTimer)
    entry.keepAliveTimer = null
  }
}

function startSessionKeepAlive(ws) {
  const timer = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      clearInterval(timer)
      return
    }
    try {
      ws.send(JSON.stringify({
        type: 'session.keep_alive',
        event_id: randomUUID(),
      }))
    } catch {
      clearInterval(timer)
    }
  }, KEEP_ALIVE_MS)
  return timer
}

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

  for (const chunk of chunkPcm(pcmBuffer)) {
    if (signal?.aborted) throw new DOMException('Speech interrupted', 'AbortError')
    ws.send(JSON.stringify({
      type: 'agent.speak',
      audio: chunk.toString('base64'),
    }))
    const chunkDurationMs = Math.max(
      20,
      Math.round((chunk.length / (SAMPLE_RATE * BYTES_PER_SAMPLE)) * 1000),
    )
    await sleep(chunkDurationMs)
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

  const keepAliveTimer = startSessionKeepAlive(ws)
  ws.addEventListener('close', () => {
    const entry = sessions.get(sessionId)
    if (entry) stopKeepAlive(entry)
  })

  sessions.set(sessionId, {
    ws,
    keepAliveTimer,
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
  stopKeepAlive(entry)
  try {
    entry.ws.close()
  } catch {
    // ignore
  }
}

export function listLiveAvatarSessionIds() {
  return [...sessions.keys()]
}
