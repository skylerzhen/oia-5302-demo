import { Eye } from 'lucide-react'
import { controlledViewUrl } from '../lib/controlledDocUrl'
import {
  applyJdWeights,
  computeMatchTotalScore,
  dimensionAchievementPct,
  dimensionWeightedContribution,
  type JdDimensionWeight,
} from '../lib/hrScoring'
import { JdRubricWeightsPanel } from './JdRubricWeightsPanel'
import type { CandidateMatch } from '../types'

interface MatchDashboardProps {
  jobTitle: string
  matches: CandidateMatch[]
  selectedId: string
  onSelect: (id: string) => void
  onEvidence: (title: string, evidence: string, documentText: string) => void
  onOpenSource: (title: string, url: string) => void
  onViewJourney: (candidateId: string) => void
  jdWeights: JdDimensionWeight[]
  onJdWeightsChange: (weights: JdDimensionWeight[]) => void
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
  onJdWeightsChange,
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

  return (
    <div className="dashboard">
      <JdRubricWeightsPanel weights={jdWeights} onChange={onJdWeightsChange} compact />

      <div className="kpi-row">
        <div className="kpi-card">
          <span>Candidates in pool</span>
          <strong>{matches.length}</strong>
        </div>
        <div className="kpi-card">
          <span>Qualified (≥60%)</span>
          <strong>{qualifiedCount}</strong>
        </div>
        <div className="kpi-card">
          <span>Average match</span>
          <strong>{avgScore}%</strong>
        </div>
        <div className="kpi-card">
          <span>Role</span>
          <strong className="kpi-small">{jobTitle}</strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Ranked candidates</h3>
          <table className="rank-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Match</th>
                <th>Attributes</th>
                <th>Experience</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m, idx) => {
                const matchScore = computeMatchTotalScore(m.dimensions, jdWeights)
                const qualified = matchScore >= 60
                return (
                <tr
                  key={m.candidateId}
                  className={m.candidateId === selected?.candidateId ? 'selected-row' : ''}
                  onClick={() => onSelect(m.candidateId)}
                >
                  <td>{idx + 1}</td>
                  <td><strong>{m.candidate.name}</strong></td>
                  <td>
                    <div className="bar-cell">
                      <div className="bar-track"><div className="bar-fill" style={{ width: `${matchScore}%` }} /></div>
                      <span>{matchScore}%</span>
                    </div>
                  </td>
                  <td>{m.matchedCount}/{m.totalDimensions}</td>
                  <td>{m.candidate.yearsExperience} yrs</td>
                  <td><span className={`status-pill ${qualified ? 'ok' : 'no'}`}>{qualified ? 'Qualified' : 'Disqualified'}</span></td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="card detail-panel">
            <h3>{selected.candidate.name}</h3>
            <p className="muted">{selected.candidate.education}</p>
            <p><strong>{selectedScore}%</strong> CV–JD match · {selected.matchedCount}/{selected.totalDimensions} dimensions matched</p>
            <p className="tiny muted jd-score-formula">
              Σ(dimension % × JD weight) ÷ Σ(weights) — same formula as H4 composite CV pillar
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
                      <span>{pct}% · +{contrib}</span>
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
