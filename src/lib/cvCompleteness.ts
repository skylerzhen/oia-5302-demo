import type { ProfileField } from '../types'

export type CompletenessTier = 'complete' | 'partial' | 'incomplete' | 'unrecognized'

export function cvCompletenessTier(valid: number, total: number): CompletenessTier {
  if (total <= 0) return 'unrecognized'
  const ratio = valid / total
  if (ratio >= 0.9) return 'complete'
  if (ratio >= 0.5) return 'partial'
  return 'incomplete'
}

export function countCvScalarFields(fields: ProfileField[]) {
  const total = fields.length
  const valid = fields.filter((field) => field.status !== 'missing' && field.value.trim()).length
  return { valid, total, tier: cvCompletenessTier(valid, total) }
}
