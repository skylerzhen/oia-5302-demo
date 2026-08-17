/**
 * Browser auth for billable POST routes.
 * Uses JSON body `apiKey` instead of Authorization header so CORS preflight
 * only requests Content-Type (Render API Allow-Headers must include Authorization
 * before Bearer headers work from Surge).
 */
export function withApiAuthBody<T extends object>(payload: T): T & { apiKey?: string } {
  const secret = import.meta.env.VITE_API_SECRET?.trim()
  if (!secret) return payload as T & { apiKey?: string }
  return { ...payload, apiKey: secret }
}

export function apiAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return extra
}
