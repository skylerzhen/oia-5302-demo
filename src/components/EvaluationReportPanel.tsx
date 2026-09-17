import type { AssessmentResult } from '../lib/localAi'

function interviewDimensionPct(score: number, maxScore?: number): number {
  const max = maxScore ?? 100
  if (max <= 0) return 0
  return Math.round((score / max) * 100)
}

interface EvaluationReportPanelProps {
  report: Pick<AssessmentResult, 'recommendation' | 'dimensions'>
  clampedRecommendation?: string
  onSelectEvidence?: (turnId: string, quote: string) => void
}

export function EvaluationReportPanel({
  report,
  clampedRecommendation,
  onSelectEvidence,
}: EvaluationReportPanelProps) {
  return (
    <section className="evaluation-report card">
      <header className="section-head">
        <div>
          <h2>Evidence-linked interview evaluation</h2>
          <p>Deterministic scores are authoritative. Click a dimension to open the transcript segment that produced it.</p>
        </div>
      </header>

      <div className="report-list">
        {report.dimensions.map((dimension) => (
          <article key={dimension.label} className="report-item">
            <div className="report-score">
              <strong>{interviewDimensionPct(dimension.score, dimension.maxScore)}%</strong>
              <span>{dimension.label}</span>
            </div>
            <div>
              <p>{dimension.rationale}</p>
              <blockquote>
                <span>Transcript evidence</span>
                {onSelectEvidence && dimension.evidence?.id ? (
                  <button
                    type="button"
                    className="evidence-turn-link"
                    onClick={() => onSelectEvidence(dimension.evidence.id, dimension.evidence.text)}
                  >
                    {dimension.evidence.text}
                  </button>
                ) : (
                  dimension.evidence?.text ?? 'No transcript excerpt'
                )}
              </blockquote>
            </div>
          </article>
        ))}
      </div>

      <p className="report-recommendation">
        <strong>Recommendation:</strong> {clampedRecommendation || report.recommendation}
      </p>
    </section>
  )
}
