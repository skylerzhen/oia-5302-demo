type FetchInput = Parameters<typeof window.fetch>[0]

function requestUrl(input: FetchInput): string {
  return typeof input === 'string' || input instanceof URL ? input.toString() : input.url
}

function isExternalRequest(input: FetchInput): boolean {
  const url = requestUrl(input)
  return new URL(url, window.location.href).origin !== window.location.origin
}

function isAllowedCloudAiRequest(input: FetchInput): boolean {
  const apiBase = import.meta.env.VITE_LLM_API_URL?.trim()
  if (!apiBase) return false
  try {
    const allowedOrigin = new URL(apiBase).origin
    const requestOrigin = new URL(requestUrl(input), window.location.href).origin
    return requestOrigin === allowedOrigin
  } catch {
    return false
  }
}

/**
 * Demo-only defence in depth. Blocks random external calls in offline mode,
 * but always allows the configured cloud LLM API (v3 demo runs on cloud APIs).
 */
export function enableExternalEgressGuard() {
  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    if (isExternalRequest(input) && !isAllowedCloudAiRequest(input)) {
      return Promise.reject(new Error('External egress is blocked in offline demo mode.'))
    }
    return originalFetch(input, init)
  }

  return () => {
    window.fetch = originalFetch
  }
}
