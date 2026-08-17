import type { ProfileField } from '../types'

/** Stable string for React effect deps — avoids refetch when array reference changes but content is same. */
export function profileFieldsKey(fields: ProfileField[]) {
  return fields.map((field) => `${field.key}\t${field.status}\t${field.value ?? ''}`).join('\n')
}
