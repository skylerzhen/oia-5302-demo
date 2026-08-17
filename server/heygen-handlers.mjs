const HEYGEN_API = 'https://api.heygen.com'

function heygenApiKey() {
  return process.env.HEYGEN_API_KEY?.trim() ?? ''
}

function heygenAvatarId() {
  return process.env.HEYGEN_AVATAR_ID?.trim() ?? ''
}

export function heygenConfigured() {
  return Boolean(heygenApiKey() && heygenAvatarId())
}

export function heygenAvailability() {
  return {
    configured: heygenConfigured(),
    avatarId: heygenConfigured() ? heygenAvatarId() : undefined,
    mode: heygenConfigured() ? 'avatar-realtime-audio' : '2d-fallback',
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function heygenFetch(path, options = {}) {
  const key = heygenApiKey()
  if (!key) throw new Error('HEYGEN_API_KEY is not configured')

  const response = await fetch(`${HEYGEN_API}${path}`, {
    ...options,
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = payload?.error ?? {}
    const code = err?.code ?? payload?.code
    const detail = err?.message ?? payload?.message ?? payload?.error ?? response.statusText
    throw new Error(`HeyGen request failed (${response.status}${code ? ` · ${code}` : ''}): ${detail}`)
  }
  return payload
}

function unwrapStreamId(payload) {
  return payload?.data?.stream_id
    ?? payload?.data?.id
    ?? payload?.stream_id
    ?? payload?.id
    ?? null
}

function unwrapStreamStatus(payload) {
  const data = payload?.data ?? payload
  return {
    status: data?.status ?? 'pending',
    hlsUrl: data?.hls_url ?? data?.url ?? null,
    errorMessage: data?.error_message ?? data?.error?.message ?? null,
  }
}

async function pollHeyGenHls(streamId) {
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    const payload = await heygenFetch(`/v3/avatar-realtime/${encodeURIComponent(streamId)}`, {
      method: 'GET',
    })
    const { status, hlsUrl, errorMessage } = unwrapStreamStatus(payload)
    if (status === 'error') {
      throw new Error(errorMessage ?? 'HeyGen stream failed')
    }
    if (status === 'streaming' && hlsUrl) {
      return hlsUrl
    }
    if (status === 'completed' && hlsUrl) {
      return hlsUrl
    }
    await sleep(900)
  }
  throw new Error('HeyGen stream timed out waiting for playback URL')
}

export async function renderHeyGenFromAudio({ audioBase64, mimeType = 'audio/mpeg' }) {
  if (!heygenConfigured()) {
    throw new Error('HeyGen is not configured (set HEYGEN_API_KEY and HEYGEN_AVATAR_ID)')
  }
  if (!audioBase64) throw new Error('audioBase64 is required for HeyGen lip-sync')

  const createPayload = await heygenFetch('/v3/avatar-realtime', {
    method: 'POST',
    body: JSON.stringify({
      type: 'audio',
      avatar_id: heygenAvatarId(),
      audio: {
        type: 'base64',
        media_type: mimeType,
        data: audioBase64,
      },
    }),
  })

  const streamId = unwrapStreamId(createPayload)
  if (!streamId) {
    throw new Error('HeyGen did not return a stream_id')
  }

  const hlsUrl = await pollHeyGenHls(streamId)
  return {
    mode: 'heygen',
    streamId,
    hlsUrl,
    avatarId: heygenAvatarId(),
  }
}

export async function handleHeyGenStatus() {
  return heygenAvailability()
}

export async function handleHeyGenSpeak(body, synthesizeFn) {
  const text = String(body.text ?? '').trim()
  const audioBase64 = String(body.audioBase64 ?? '').trim()
  const mimeType = String(body.mimeType ?? 'audio/mpeg').trim() || 'audio/mpeg'

  if (audioBase64) {
    return renderHeyGenFromAudio({ audioBase64, mimeType })
  }

  if (!text) throw new Error('text or audioBase64 is required')
  if (typeof synthesizeFn !== 'function') {
    throw new Error('TTS synthesizer is not available')
  }

  const tts = await synthesizeFn({ text })
  if (!tts?.audioBase64) {
    throw new Error('OpenAI TTS did not return audio for HeyGen')
  }

  const heygen = await renderHeyGenFromAudio({
    audioBase64: tts.audioBase64,
    mimeType: tts.mimeType ?? 'audio/mpeg',
  })

  return {
    ...heygen,
    text,
    ttsProvider: tts.ttsProvider ?? 'openai',
  }
}

export async function getHeyGenWallet() {
  const payload = await heygenFetch('/v3/users/me', { method: 'GET' })
  const data = payload?.data ?? payload
  return data?.wallet ?? data
}

export async function getHeyGenLook(lookId) {
  if (!lookId) throw new Error('lookId is required')
  const payload = await heygenFetch(`/v3/avatars/looks/${encodeURIComponent(lookId)}`, {
    method: 'GET',
  })
  return payload?.data ?? payload
}

export async function listHeyGenStreamingAvatarsV2() {
  const payload = await heygenFetch('/v2/avatars?type=public', { method: 'GET' })
  const items = payload?.data?.avatars ?? payload?.data ?? payload?.avatars ?? []
  return Array.isArray(items) ? items : []
}

export async function listHeyGenPublicLooks(options = {}) {
  const params = new URLSearchParams({
    ownership: 'public',
    limit: String(options.limit ?? 20),
  })
  if (options.avatarType) params.set('avatar_type', options.avatarType)

  const payload = await heygenFetch(`/v3/avatars/looks?${params.toString()}`, {
    method: 'GET',
  })
  const items = payload?.data?.looks ?? payload?.data ?? payload?.looks ?? []
  return Array.isArray(items) ? items : []
}

/** Probe Avatar Realtime with HeyGen TTS (diagnostic — does not use OpenAI). */
export async function probeHeyGenRealtimeTts({ avatarId, voiceId, text }) {
  const createPayload = await heygenFetch('/v3/avatar-realtime', {
    method: 'POST',
    body: JSON.stringify({
      type: 'tts',
      avatar_id: avatarId ?? heygenAvatarId(),
      voice_id: voiceId,
      text: text ?? 'HeyGen realtime probe.',
    }),
  })
  const streamId = unwrapStreamId(createPayload)
  if (!streamId) throw new Error('HeyGen realtime probe did not return stream_id')
  const hlsUrl = await pollHeyGenHls(streamId)
  return { streamId, hlsUrl }
}
