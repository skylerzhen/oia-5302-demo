type FetchInput = Parameters<typeof window.fetch>[0]

function isExternalRequest(input: FetchInput): boolean {
  const url = typeof input === 'string' || input instanceof URL ? input.toString() : input.url
  return new URL(url, window.location.href).origin !== window.location.origin
}

/**
 * Demo-only defence in depth. The production build also applies a CSP of
 * connect-src 'self'. Physical network disconnection remains the Gate test.
 */
export function enableExternalEgressGuard() {
  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init) => {
    if (isExternalRequest(input)) {
      return Promise.reject(new Error('External egress is blocked in offline demo mode.'))
    }
    return originalFetch(input, init)
  }

  return () => {
    window.fetch = originalFetch
  }
}
