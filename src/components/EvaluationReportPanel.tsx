import type { InterviewEvaluationReport } from '../lib/interviewReport'

function interviewDimensionPct(score: number, maxScore?: number): number {
  const max = maxScore ?? 100
  if (max <= 0) return 0
  return Math.round((score / max) * 100)
}

interface EvaluationReportPanelProps {
  report: InterviewEvaluationReport
}

export function EvaluationReportPanel({ report }: EvaluationReportPanelProps) {
  return (
    <section className="evaluation-report card">
      <header className="section-head">
        <div>
          <h2>Evidence-linked interview evaluation</h2>
          <p>Scores are recommendations for HR review, not an automatic decision.</p>
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
                {dimension.evidence.text}
              </blockquote>
            </div>
          </article>
        ))}
      </div>

      <p className="report-recommendation"><strong>Recommendation:</strong> {report.recommendation}</p>
    </section>
  )
}
