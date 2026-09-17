/** Canonical application identity — one record across Candidate + HR portals. */

export function generateApplicationId(): string {
  const stamp = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `OIA-5302-${stamp}-${rand}`
}

export function ensureApplicationId(existing: string | undefined | null): string {
  const trimmed = existing?.trim()
  if (trimmed) return trimmed
  return generateApplicationId()
}

export function formatApplicationIdLabel(applicationId: string) {
  return `Application ${applicationId}`
}
