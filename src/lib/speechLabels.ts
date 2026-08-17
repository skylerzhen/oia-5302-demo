/** Display labels for C4 status row — no runtime speech logic. */
export function formatTtsStatusLabel(provider: string): string {
  if (provider === 'browser') return 'browser'
  return 'model'
}
