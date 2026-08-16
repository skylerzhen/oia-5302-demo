import type { IntegrationSyncEvent, IntegrationSystem } from '../types'

type IntegrationOp = {
  endpoint: string
  operation: string
}

const JADARAH: Record<string, IntegrationOp> = {
  profileWrite: {
    endpoint: 'POST /sim/jadarah/v1/candidates/profile',
    operation: 'I2 Candidate profile write-back',
  },
  profileUpdate: {
    endpoint: 'PUT /sim/jadarah/v1/candidates/{id}/profile',
    operation: 'I2 Candidate profile update (CV diff)',
  },
  assessmentResult: {
    endpoint: 'POST /sim/jadarah/v1/assessments/results',
    operation: 'I4 Assessment results return',
  },
  interviewRecord: {
    endpoint: 'POST /sim/jadarah/v1/interviews/sessions',
    operation: 'I4 Interview session + recording metadata',
  },
  pipelineStatus: {
    endpoint: 'PATCH /sim/jadarah/v1/applications/{id}/status',
    operation: 'I5 Application pipeline status',
  },
  hireOutcome: {
    endpoint: 'POST /sim/jadarah/v1/recruitment/outcomes',
    operation: 'I5 Recruitment outcome (hire)',
  },
  rejectOutcome: {
    endpoint: 'POST /sim/jadarah/v1/recruitment/outcomes',
    operation: 'I5 Recruitment outcome (reject)',
  },
}

const ORACLE_EBS: Record<string, IntegrationOp> = {
  requisitionSync: {
    endpoint: 'POST /sim/oracle-ebs/v1/hr/requisitions/sync',
    operation: 'Vacancy ↔ requisition sync',
  },
  hirePersonStub: {
    endpoint: 'POST /sim/oracle-ebs/v1/hr/person/onboarding-stub',
    operation: 'Person / headcount onboarding stub (hire)',
  },
}

const SYSTEM_LABEL: Record<IntegrationSystem, string> = {
  jadarah: 'Jadarah',
  'oracle-ebs': 'Oracle EBS',
}

let syncCounter = 0

function nextRefId(system: IntegrationSystem): string {
  syncCounter += 1
  const prefix = system === 'jadarah' ? 'JDR' : 'OEB'
  return `${prefix}-2026-${String(syncCounter).padStart(4, '0')}`
}

export type SimulatedIntegrationKey =
  | 'jadarah.profileWrite'
  | 'jadarah.profileUpdate'
  | 'jadarah.assessmentResult'
  | 'jadarah.interviewRecord'
  | 'jadarah.pipelineStatus'
  | 'jadarah.hireOutcome'
  | 'jadarah.rejectOutcome'
  | 'oracle.requisitionSync'
  | 'oracle.hirePersonStub'

function resolveOp(key: SimulatedIntegrationKey): { system: IntegrationSystem; op: IntegrationOp } {
  if (key.startsWith('oracle.')) {
    const opKey = key.slice('oracle.'.length)
    return { system: 'oracle-ebs', op: ORACLE_EBS[opKey] }
  }
  const opKey = key.slice('jadarah.'.length)
  return { system: 'jadarah', op: JADARAH[opKey] }
}

/** Simulated enterprise write — no network; returns a labelled audit-friendly event. */
export function createSimulatedIntegrationSync(
  key: SimulatedIntegrationKey,
  step: string,
): IntegrationSyncEvent {
  const { system, op } = resolveOp(key)
  const refId = nextRefId(system)
  return {
    id: `sync-${refId}`,
    system,
    systemLabel: SYSTEM_LABEL[system],
    endpoint: op.endpoint,
    operation: op.operation,
    refId,
    timestamp: new Date().toISOString(),
    step,
  }
}

export function formatIntegrationAuditDetail(event: IntegrationSyncEvent, detail?: string): string {
  const base = `[simulated endpoint] ${event.systemLabel} · ${event.endpoint} · ref ${event.refId} · ${event.operation}`
  return detail ? `${base} — ${detail}` : base
}

export function latestIntegrationBySystem(
  events: IntegrationSyncEvent[],
  system: IntegrationSystem,
): IntegrationSyncEvent | undefined {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].system === system) return events[i]
  }
  return undefined
}
