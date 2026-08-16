/** Map Azure Speech viseme IDs (0–21) to demo mouth shapes for VRM lip-sync. */
export const AZURE_VISEME_SHAPE = {
  0: 'rest',
  1: 'A',
  2: 'A',
  3: 'O',
  4: 'E',
  5: 'E',
  6: 'E',
  7: 'O',
  8: 'O',
  9: 'O',
  10: 'E',
  11: 'A',
  12: 'rest',
  13: 'E',
  14: 'E',
  15: 'E',
  16: 'F',
  17: 'F',
  18: 'F',
  19: 'M',
  20: 'M',
  21: 'M',
}

export function azureVisemeIdToShape(visemeId) {
  return AZURE_VISEME_SHAPE[visemeId] ?? 'E'
}

export function azureVisemeEventsToMarks(events) {
  if (!events?.length) return []
  return events.map((event) => ({
    timeMs: Math.max(0, Math.round(event.audioOffset / 10000)),
    viseme: azureVisemeIdToShape(event.visemeId),
    visemeId: event.visemeId,
  }))
}
