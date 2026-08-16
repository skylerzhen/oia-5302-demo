import { Database, Link2 } from 'lucide-react'
import type { IntegrationSyncEvent, IntegrationSystem } from '../types'
import { formatAuditTime } from '../lib/audit'
import { latestIntegrationBySystem } from '../lib/simulatedIntegrations'

interface IntegrationStatusPanelProps {
  events: IntegrationSyncEvent[]
}

function systemCard(
  system: IntegrationSystem,
  label: string,
  events: IntegrationSyncEvent[],
) {
  const latest = latestIntegrationBySystem(events, system)
  return (
    <div className={`integration-card integration-${system}`} key={system}>
      <div className="integration-card-head">
        <strong>{label}</strong>
        <span className="integration-sim-badge">simulated endpoint</span>
      </div>
      {latest ? (
        <>
          <p className="integration-op">{latest.operation}</p>
          <code className="integration-endpoint">{latest.endpoint}</code>
          <p className="integration-meta">
            ref <code>{latest.refId}</code> · {formatAuditTime(latest.timestamp)} · {latest.step}
          </p>
        </>
      ) : (
        <p className="muted tiny integration-idle">
          No write-back yet — fires on profile submit, assessment, or final decision.
        </p>
      )}
    </div>
  )
}

export function IntegrationStatusPanel({ events }: IntegrationStatusPanelProps) {
  return (
    <div className="integration-panel">
      <h3>
        <Link2 size={14} aria-hidden />
        Enterprise integrations (simulated)
      </h3>
      <p className="muted tiny integration-note">
        Jadarah + Oracle EBS — mock endpoints for demo only; no production connectivity.
      </p>
      {systemCard('jadarah', 'Jadarah', events)}
      {systemCard('oracle-ebs', 'Oracle EBS', events)}
      {events.length > 0 && (
        <p className="integration-count muted tiny">
          <Database size={12} aria-hidden /> {events.length} simulated sync{events.length === 1 ? '' : 's'} this session
        </p>
      )}
    </div>
  )
}
