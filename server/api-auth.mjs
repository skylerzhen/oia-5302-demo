import { timingSafeEqual } from 'node:crypto'

export function apiSecretConfigured() {
  return Boolean(process.env.API_SECRET?.trim())
}

export function getApiSecret() {
  return process.env.API_SECRET?.trim() ?? ''
}

function extractBearer(req) {
  const auth = req.headers.authorization
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  const header = req.headers['x-demo-api-key']
  if (typeof header === 'string') return header.trim()
  return ''
}

function extractQueryApiKey(req) {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost')
    return url.searchParams.get('apiKey')?.trim() || ''
  } catch {
    return ''
  }
}

function tokensMatch(provided, expected) {
  if (!provided || !expected) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Require shared secret on billable POST routes when API_SECRET is set. */
export function enforceApiAuth(req, body = null) {
  const secret = getApiSecret()
  if (!secret) return

  const fromBody = body && typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const token = extractBearer(req) || fromBody || extractQueryApiKey(req)
  if (!tokensMatch(token, secret)) {
    throw new Error('Unauthorized — missing or invalid API key')
  }
}

export function authHeaders(extra = {}) {
  const secret = process.env.API_SECRET?.trim() ?? process.env.VITE_API_SECRET?.trim()
  if (!secret) return { ...extra }
  return { ...extra, Authorization: `Bearer ${secret}` }
}

export function warnIfApiUnprotected() {
  if (apiSecretConfigured()) return
  const onRender = Boolean(process.env.RENDER?.trim() || process.env.RENDER_SERVICE_ID?.trim())
  if (onRender || process.env.NODE_ENV === 'production') {
    console.warn('[api-auth] API_SECRET is not set — billable POST routes are open to the public internet')
  }
}
