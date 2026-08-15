import type { AuditEntry } from '../types'

let counter = 0

export function createAuditEntry(
  actor: string,
  action: string,
  detail: string,
  step: string,
): AuditEntry {
  counter += 1
  const timestamp = new Date().toISOString()
  return {
    id: `audit-${timestamp}-${counter}`,
    timestamp,
    actor,
    action,
    detail,
    step,
  }
}

export function formatAuditTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: 'short',
  })
}
