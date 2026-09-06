import { Eye } from 'lucide-react'
import { PRIMARY_CANDIDATE_ID } from '../data/candidates'
import { controlledViewUrl } from '../lib/controlledDocUrl'
import {
  applyJdWeights,
  computeMatchTotalScore,
  dimensionAchievementPct,
  dimensionWeightedContribution,
  type JdDimensionWeight,
} from '../lib/hrScoring'
import type { CandidateMatch, PipelineStatus } from '../types'

interface MatchDashboardProps {
  jobTitle: string
  matches: CandidateMatch[]
  selectedId: string
  onSelect: (id: string) => void
  onEvidence: (title: string, evidence: string, documentText: string) => void
  onOpenSource: (title: string, url: string) => void
  onViewJourney: (candidateId: string) => void
  jdWeights: JdDimensionWeight[]
  pipeline: PipelineStatus
  assessmentScore: number
  interviewTurnCount: number
  interviewCompleted: boolean
}

function queueStageLabel(
  candidateId: string,
  pipeline: PipelineStatus,
  interviewCompleted: boolean,
): { label: string; tone: 'ok' | 'review' | 'no' } {
  if (candidateId !== PRIMARY_CANDIDATE_ID) {
    return { label: 'Pool only', tone: 'review' }
  }
  if (pipeline.finalDecisionMade) {
    return pipeline.finalDecisionType === 'hire'
      ? { label: 'Hire decided', tone: 'ok' }
      : { label: 'Rejected', tone: 'no' }
  }
  if (pipeline.disqualified) return { label: 'Not shortlisted', tone: 'no' }
  if (pipeline.shortlisted && interviewCompleted) return { label: 'Interview reviewed', tone: 'ok' }
  if (interviewCompleted) return { label: 'Interview complete', tone: 'ok' }
  if (pipeline.shortlisted) return { label: 'Shortlisted', tone: 'ok' }
  if (pipeline.profileSubmitted) return { label: 'In review', tone: 'review' }
  return { label: 'New application', tone: 'review' }
}

export function MatchDashboard({
  jobTitle,
  matches,
  selectedId,
  onSelect,
  onEvidence,
  onOpenSource,
  onViewJourney,
  jdWeights,
  pipeline,
  assessmentScore,
  interviewTurnCount,
  interviewCompleted,
}: MatchDashboardProps) {
  const selected = matches.find((m) => m.candidateId === selectedId) ?? matches[0]
  const qualifiedCount = matches.filter((m) => computeMatchTotalScore(m.dimensions, jdWeights) >= 60).length
  const avgScore = matches.length
    ? Math.round(
        matches.reduce((s, m) => s + computeMatchTotalScore(m.dimensions, jdWeights), 0) / matches.length,
      )
    : 0
  const selectedDims = selected ? applyJdWeights(selected.dimensions, jdWeights) : []
  const selectedScore = selected ? computeMatchTotalScore(selected.dimensions, jdWeights) : 0
  const activeInQueue = matches.some((m) => m.candidateId === PRIMARY_CANDIDATE_ID)

  return (
    <div className="review-queues-dashboard">
      <div className="kpi-row review-queues-kpis">
        <div className="kpi-card">
          <span>Queue size</span>
          <strong>{matches.length}</strong>
        </div>
        <div className="kpi-card">
          <span>Qualified (60%+)</span>
          <strong>{qualifiedCount}</strong>
        </div>
        <div className="kpi-card">
          <span>Average CV match</span>
          <strong>{avgScore}%</strong>
        </div>
        <div className="kpi-card">
          <span>Active application</span>
          <strong className="kpi-small">{activeInQueue ? '1 live record' : 'None yet'}</strong>
        </div>
      </div>

      <div className="dashboard-grid review-queues-grid">
        <div className="card review-queues-table-card">
          <header className="review-queues-table-head">
            <div>
              <h3>Review queue</h3>
              <p className="muted tiny">{jobTitle} - ranked by CV-JD match</p>
            </div>
          </header>
          <div className="review-queues-table-wrap">
            <table className="rank-table review-queues-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Applicant</th>
                  <th>App ID</th>
                  <th>Stage</th>
                  <th>CV match</th>
                  <th>Assessment</th>
                  <th>Interview</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, idx) => {
                  const matchScore = computeMatchTotalScore(m.dimensions, jdWeights)
                  const qualified = matchScore >= 60
                  const isLive = m.candidateId === PRIMARY_CANDIDATE_ID
                  const stage = queueStageLabel(m.candidateId, pipeline, interviewCompleted)
                  return (
                    <tr
                      key={m.candidateId}
                      className={`${m.candidateId === selected?.candidateId ? 'selected-row' : ''} ${isLive ? 'live-application-row' : ''}`}
                      onClick={() => onSelect(m.candidateId)}
                    >
                      <td>{idx + 1}</td>
                      <td><strong>{m.candidate.name}</strong></td>
                      <td><code className="queue-app-id">{m.candidateId.replace('cand-', '').toUpperCase()}</code></td>
                      <td><span className={`status-pill ${stage.tone}`}>{stage.label}</span></td>
                      <td>
                        <div className="bar-cell">
                          <div className="bar-track"><div className="bar-fill" style={{ width: `${matchScore}%` }} /></div>
                          <span>{matchScore}%</span>
                        </div>
                      </td>
                      <td>{isLive && pipeline.profileSubmitted ? `${assessmentScore}%` : '-'}</td>
                      <td>{isLive && interviewTurnCount > 0 ? `${interviewTurnCount} turns` : '-'}</td>
                      <td><span className={`status-pill ${qualified ? 'ok' : 'no'}`}>{qualified ? 'Qualified' : 'Below'}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="card detail-panel review-queues-detail">
            <h3>{selected.candidate.name}</h3>
            <p className="muted">{selected.candidate.education}</p>
            <p><strong>{selectedScore}%</strong> CV-JD match - {selected.matchedCount}/{selected.totalDimensions} dimensions matched</p>
            <p className="tiny muted jd-score-formula">
              Sum(dimension % x JD weight) / sum(weights) - same formula as H4 composite CV pillar
            </p>
            <div className="candidate-actions">
              <button
                type="button"
                className="primary-outline"
                onClick={() => onViewJourney(selected.candidateId)}
              >
                <Eye size={16} /> View candidate journey
              </button>
              {selected.candidate.cvFile && (
                <button
                  type="button"
                  className="source-file-link"
                  onClick={() => onOpenSource('Controlled CV source', controlledViewUrl(selected.candidate.cvFile!))}
                >
                  Open CV source
                </button>
              )}
            </div>
            <h4>Dimension breakdown</h4>
            <ul className="dim-bars">
              {selectedDims.map((d) => {
                const pct = dimensionAchievementPct(d)
                const contrib = dimensionWeightedContribution(d)
                return (
                  <li key={d.key}>
                    <button type="button" className="dim-bar-btn" onClick={() => onEvidence(d.label, d.evidence, selected.candidate.cvText)}>
                      <span>
                        {d.label}
                        <em className="score-dim-weight">w={d.weight}</em>
                      </span>
                      <div className="bar-track"><div className={`bar-fill ${d.matched ? 'match' : 'weak'}`} style={{ width: `${pct}%` }} /></div>
                      <span>{pct}% - +{contrib}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="tiny muted">Click any dimension to view CV evidence span.</p>
          </div>
        )}
      </div>
    </div>
  )
}
