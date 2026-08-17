import { formatAuditTime } from '../lib/audit'
import type { AuditEntry } from '../types'

interface AuditTrailTableProps {
  entries: AuditEntry[]
}

export function AuditTrailTable({ entries }: AuditTrailTableProps) {
  return (
    <div className="card audit-full-page">
      <h2>Audit trail</h2>
      <p className="muted tiny">
        Timestamp × role × action — parse confirmation, shortlist, interview assessment, and final decision events.
      </p>
      {entries.length === 0 ? (
        <p className="muted">No audit events recorded in this session yet.</p>
      ) : (
        <table className="rank-table audit-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Role</th>
              <th>Action</th>
              <th>Step</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td><code>{formatAuditTime(entry.timestamp)}</code></td>
                <td>{entry.actor}</td>
                <td>{entry.action}</td>
                <td><code>{entry.step}</code></td>
                <td>{entry.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
