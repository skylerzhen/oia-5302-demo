const LIVEAVATAR_API = 'https://api.liveavatar.com'

function liveAvatarApiKey() {
  return process.env.LIVEAVATAR_API_KEY?.trim() ?? ''
}

function liveAvatarAvatarId() {
  return process.env.LIVEAVATAR_AVATAR_ID?.trim() ?? ''
}

export function liveAvatarConfigured() {
  return Boolean(liveAvatarApiKey() && liveAvatarAvatarId())
}

export function liveAvatarAvailability() {
  return {
    configured: liveAvatarConfigured(),
    avatarId: liveAvatarConfigured() ? liveAvatarAvatarId() : undefined,
    mode: liveAvatarConfigured() ? 'liveavatar-lite' : '2d-fallback',
  }
}

async function liveAvatarFetch(path, options = {}) {
  const key = liveAvatarApiKey()
  if (!key) throw new Error('LIVEAVATAR_API_KEY is not configured')

  const response = await fetch(`${LIVEAVATAR_API}${path}`, {
    ...options,
    headers: {
      accept: 'application/json',
      'X-API-KEY': key,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = payload?.message ?? payload?.error?.message ?? payload?.error ?? response.statusText
    throw new Error(`LiveAvatar request failed (${response.status}): ${detail}`)
  }
  return payload
}

export async function listLiveAvatarPublicAvatars(pageSize = 20) {
  const payload = await liveAvatarFetch(`/v1/avatars/public?page=1&page_size=${pageSize}`, {
    method: 'GET',
  })
  const items = payload?.data?.results ?? payload?.data?.items ?? []
  return Array.isArray(items) ? items : []
}

export async function createLiveAvatarSessionToken() {
  const payload = await liveAvatarFetch('/v1/sessions/token', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'LITE',
      avatar_id: liveAvatarAvatarId(),
    }),
  })
  const data = payload?.data ?? payload
  const sessionToken = data?.session_token ?? data?.token
  if (!sessionToken) {
    throw new Error('LiveAvatar did not return a session_token')
  }
  return sessionToken
}

export async function startLiveAvatarSession(sessionToken) {
  const response = await fetch(`${LIVEAVATAR_API}/v1/sessions/start`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${sessionToken}`,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = payload?.message ?? payload?.error?.message ?? response.statusText
    throw new Error(`LiveAvatar start failed (${response.status}): ${detail}`)
  }
  const data = payload?.data ?? payload
  if (!data?.livekit_url || !data?.livekit_client_token) {
    throw new Error('LiveAvatar start did not return LiveKit credentials')
  }
  return {
    sessionId: data.session_id,
    livekitUrl: data.livekit_url,
    livekitClientToken: data.livekit_client_token,
    wsUrl: data.ws_url ?? null,
    sessionToken,
  }
}

export async function handleLiveAvatarStatus() {
  return liveAvatarAvailability()
}

export async function handleLiveAvatarSessionStart() {
  const sessionToken = await createLiveAvatarSessionToken()
  const start = await startLiveAvatarSession(sessionToken)
  const { openLiveAvatarSession } = await import('./liveavatar-session.mjs')
  await openLiveAvatarSession(start)
  return {
    sessionId: start.sessionId,
    livekitUrl: start.livekitUrl,
    livekitClientToken: start.livekitClientToken,
    mode: 'liveavatar-lite',
  }
}

export async function handleLiveAvatarSpeak(body) {
  const sessionId = String(body.sessionId ?? '').trim()
  const text = String(body.text ?? '').trim()
  if (!sessionId) throw new Error('sessionId is required')
  if (!text) throw new Error('text is required')

  const { synthesizeOpenAiTtsPcm } = await import('./openai-tts.mjs')
  const { speakLiveAvatarSession } = await import('./liveavatar-session.mjs')
  const { audioBuffer } = await synthesizeOpenAiTtsPcm(text)
  await speakLiveAvatarSession(sessionId, audioBuffer)
  return { ok: true, sessionId, mode: 'liveavatar-lite', text }
}

export async function handleLiveAvatarSessionStop(body = {}) {
  const sessionId = String(body.sessionId ?? '').trim()
  if (sessionId) {
    const { closeLiveAvatarSession } = await import('./liveavatar-session.mjs')
    await closeLiveAvatarSession(sessionId)
    try {
      await liveAvatarFetch('/v1/sessions/stop', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, reason: 'USER_CLOSED' }),
      })
    } catch {
      // Session may already be closed server-side.
    }
  }
  return { ok: true }
}
