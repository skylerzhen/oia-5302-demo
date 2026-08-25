import { useMemo, type ReactNode } from 'react'
import { RotateCcw, Target, FileCheck, MessageSquare } from 'lucide-react'
import type { CandidateMatch } from '../types'
import type { InterviewEvaluationReport } from '../lib/interviewReport'
import {
  applyJdWeights,
  computeCvScoreFromDimensions,
  computeInterviewScoreFromDimensions,
  computeOverallScore,
  dimensionAchievementPct,
  dimensionWeightedContribution,
  DEFAULT_PILLAR_WEIGHTS,
  weightShare,
  pillarContribution,
  type JdDimensionWeight,
  type PillarWeights,
} from '../lib/hrScoring'
import { JdRubricWeightsPanel } from './JdRubricWeightsPanel'

interface ScoreSummaryPanelProps {
  match: CandidateMatch
  assessmentScore: number
  interviewReport: InterviewEvaluationReport | null
  weights: PillarWeights
  onWeightsChange: (weights: PillarWeights) => void
  jdWeights: JdDimensionWeight[]
  onJdWeightsChange: (weights: JdDimensionWeight[]) => void
}

type PillarKey = keyof PillarWeights

const PILLAR_LABELS: Record<PillarKey, string> = {
  cvMatch: 'CV-JD Matching',
  assessment: 'Technical Assessment',
  interview: 'Interview Evaluation',
}

export function ScoreSummaryPanel({
  match,
  assessmentScore,
  interviewReport,
  weights,
  onWeightsChange,
  jdWeights,
  onJdWeightsChange,
}: ScoreSummaryPanelProps) {

  const weightedDimensions = useMemo(
    () => applyJdWeights(match.dimensions, jdWeights),
    [match.dimensions, jdWeights],
  )

  const cvScore = useMemo(
    () => computeCvScoreFromDimensions(weightedDimensions),
    [weightedDimensions],
  )

  const interviewScore = useMemo(
    () =>
      interviewReport
        ? computeInterviewScoreFromDimensions(interviewReport.dimensions)
        : null,
    [interviewReport],
  )

  const overallScore = useMemo(
    () => computeOverallScore(cvScore, assessmentScore, interviewScore, weights),
    [cvScore, assessmentScore, interviewScore, weights],
  )

  function updateWeight(key: PillarKey, raw: string) {
    onWeightsChange({
      ...weights,
      [key]: Math.min(100, Math.max(0, Number(raw) || 0)),
    })
  }

  function resetWeights() {
    onWeightsChange({ ...DEFAULT_PILLAR_WEIGHTS })
  }

  const weightTotal = weights.cvMatch + weights.assessment + weights.interview

  return (
    <div className="score-summary-panel card">
      <header className="score-summary-head">
        <div>
          <h2>Complete Scoring Overview</h2>
          <p className="muted">
            Weighted composite across CV–JD matching, technical assessment, and interview — weights are
            recruiter-configurable (versioned rubric).
          </p>
        </div>
        <button type="button" className="ghost-btn score-weight-reset" onClick={resetWeights}>
          <RotateCcw size={14} /> Reset weights
        </button>
      </header>

      <JdRubricWeightsPanel weights={jdWeights} onChange={onJdWeightsChange} compact />

      <div className="score-summary-composite">
        <div className="score-summary-composite-main">
          <span className="tiny muted">Overall weighted score</span>
          <strong>{overallScore}%</strong>
        </div>
        <div className="score-summary-composite-formula">
          <span className="tiny muted">Formula</span>
          <p>
            ({cvScore}% × {weightShare(weights.cvMatch, weights)}%) + ({assessmentScore}% ×{' '}
            {weightShare(weights.assessment, weights)}%)
            {interviewScore != null && (
              <>
                {' '}
                + ({interviewScore}% × {weightShare(weights.interview, weights)}%)
              </>
            )}
          </p>
          {weightTotal === 0 && (
            <p className="danger-text tiny">Set at least one pillar weight above zero.</p>
          )}
        </div>
      </div>

      <div className="score-summary-grid">
        <PillarCard
          icon={<Target size={20} />}
          title={PILLAR_LABELS.cvMatch}
          score={cvScore}
          weight={weights.cvMatch}
          weightShare={weightShare(weights.cvMatch, weights)}
          contribution={pillarContribution(cvScore, weights.cvMatch, weights)}
          onWeightChange={(v) => updateWeight('cvMatch', v)}
        >
          <div className="score-summary-metrics">
            <div className="score-summary-metric">
              <span>Matched Dimensions</span>
              <strong>
                {match.matchedCount}/{match.totalDimensions}
              </strong>
            </div>
            <div className="score-summary-metric">
              <span>Experience</span>
              <strong>{match.candidate.yearsExperience} years</strong>
            </div>
          </div>
          <div className="score-summary-breakdown">
            <span className="tiny muted">
              Dimension breakdown — achievement % × JD weight (Σ ÷ {weightedDimensions.reduce((s, d) => s + d.weight, 0)} = {cvScore}%)
            </span>
            {weightedDimensions.map((d) => {
              const pct = dimensionAchievementPct(d)
              const contrib = dimensionWeightedContribution(d)
              return (
                <div key={d.key} className="score-summary-dim">
                  <span className="score-summary-dim-label">
                    {d.label}
                    <em className="score-dim-weight">w={d.weight}</em>
                  </span>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${d.matched ? 'match' : 'weak'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="score-summary-pct">{pct}% · +{contrib}</span>
                </div>
              )
            })}
          </div>
        </PillarCard>

        <PillarCard
          icon={<FileCheck size={20} />}
          title={PILLAR_LABELS.assessment}
          score={assessmentScore}
          weight={weights.assessment}
          weightShare={weightShare(weights.assessment, weights)}
          contribution={pillarContribution(assessmentScore, weights.assessment, weights)}
          onWeightChange={(v) => updateWeight('assessment', v)}
        >
          <div className="score-summary-metrics">
            <div className="score-summary-metric">
              <span>Benchmark</span>
              <strong>70%</strong>
            </div>
            <div className="score-summary-metric">
              <span>Status</span>
              <strong className={assessmentScore >= 70 ? 'ok-text' : 'danger-text'}>
                {assessmentScore >= 70 ? 'Pass' : 'Below'}
              </strong>
            </div>
          </div>
          <p className="tiny muted">
            Role-specific multiple-choice questions covering portfolio analysis, risk reporting, and Excel
            modeling
          </p>
        </PillarCard>

        <PillarCard
          icon={<MessageSquare size={20} />}
          title={PILLAR_LABELS.interview}
          score={interviewScore}
          weight={weights.interview}
          weightShare={weightShare(weights.interview, weights)}
          contribution={
            interviewScore != null
              ? pillarContribution(interviewScore, weights.interview, weights)
              : null
          }
          onWeightChange={(v) => updateWeight('interview', v)}
        >
          {interviewReport ? (
            <div className="score-summary-breakdown">
              <span className="tiny muted">LLM dimension scores (equal weight within pillar)</span>
              {interviewReport.dimensions.map((dim) => {
                const pct =
                  dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : dim.score
                return (
                  <div key={dim.label} className="score-summary-dim">
                    <span>{dim.label}</span>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${pct >= 60 ? 'match' : 'weak'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="score-summary-pct">{pct}%</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="muted">LLM assessment pending or unavailable</p>
          )}
        </PillarCard>
      </div>

      <div className="score-summary-overall">
        <h3>Overall Candidate Profile</h3>
        <div className="score-summary-profile-grid">
          <div>
            <span className="tiny muted">Name</span>
            <p>
              <strong>{match.candidate.name}</strong>
            </p>
          </div>
          <div>
            <span className="tiny muted">Education</span>
            <p>{match.candidate.education}</p>
          </div>
          <div>
            <span className="tiny muted">Experience</span>
            <p>{match.candidate.yearsExperience} years in finance</p>
          </div>
          <div>
            <span className="tiny muted">Key Skills</span>
            <p>{match.candidate.skills.slice(0, 3).join(', ')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function PillarCard({
  icon,
  title,
  score,
  weight,
  weightShare,
  contribution,
  onWeightChange,
  children,
}: {
  icon: ReactNode
  title: string
  score: number | null
  weight: number
  weightShare: number
  contribution: number | null
  onWeightChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div className="score-summary-card">
      <div className="score-summary-header">
        {icon}
        <h3>{title}</h3>
      </div>

      <label className="score-weight-control">
        <span>Pillar weight</span>
        <div className="score-weight-input-row">
          <input
            type="number"
            min={0}
            max={100}
            step={5}
            value={weight}
            onChange={(e) => onWeightChange(e.target.value)}
            aria-label={`${title} weight`}
          />
          <span className="score-weight-share">→ {weightShare}% of composite</span>
        </div>
      </label>

      <div className="score-summary-main-score">
        <strong>{score != null ? `${score}%` : '—'}</strong>
        <span>Pillar score</span>
        {contribution != null && (
          <em className="score-contribution">Contributes ~{contribution} pts to overall</em>
        )}
      </div>

      {children}
    </div>
  )
}
