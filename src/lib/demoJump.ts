/** URL shortcut for demo rehearsal, e.g. `/?demo=c4` then Candidate portal. */
export function readDemoJumpTarget(): 'c4' | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('demo')?.toLowerCase()
  return value === 'c4' ? 'c4' : null
}

export const DEMO_C4_ENTRY_URL = '/?demo=c4'
