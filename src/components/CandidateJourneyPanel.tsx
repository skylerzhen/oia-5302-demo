import { CheckCircle2, XCircle, Clock } from 'lucide-react'
import type { CandidateMatch, InterviewTurn, PipelineStatus } from '../types'
import type { InterviewEvaluationReport } from '../lib/interviewReport'

interface CandidateJourneyPanelProps {
  match: CandidateMatch
  assessmentScore: number
  interviewTurns: InterviewTurn[]
  interviewReport: InterviewEvaluationReport | null
  pipeline: PipelineStatus
  onClose: () => void
}

export function CandidateJourneyPanel({
  match,
  assessmentScore,
  interviewTurns,
  interviewReport,
  pipeline,
  onClose,
}: CandidateJourneyPanelProps) {
  const hasInterview = interviewTurns.length > 0
  const candidateAnswers = interviewTurns.filter((t) => t.speaker === 'candidate').length

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal candidate-journey-modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <div>
            <h2>Candidate Journey: {match.candidate.name}</h2>
            <p className="muted">Full pipeline status and scoring breakdown</p>
          </div>
          <button type="button" onClick={onClose} className="ghost-btn">
            Close
          </button>
        </header>

        <div className="journey-content">
          <section className="journey-stage">
            <div className="journey-stage-header">
              <CheckCircle2 size={20} className="ok" />
              <h3>CV-JD Matching</h3>
              <span className="status-pill ok">Completed</span>
            </div>
            <div className="journey-metrics">
              <div className="journey-metric-card">
                <span>Overall Match</span>
                <strong>{match.totalScore}%</strong>
              </div>
              <div className="journey-metric-card">
                <span>Matched Dimensions</span>
                <strong>{match.matchedCount}/{match.totalDimensions}</strong>
              </div>
              <div className="journey-metric-card">
                <span>Experience</span>
                <strong>{match.candidate.yearsExperience} years</strong>
              </div>
            </div>
            <div className="journey-dimensions">
              {match.dimensions.map((d) => {
                const pct = Math.round((d.score / d.maxScore) * 100)
                return (
                  <div key={d.key} className="journey-dimension-row">
                    <span>{d.label}</span>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${d.matched ? 'match' : 'weak'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="journey-pct">{pct}%</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="journey-stage">
            <div className="journey-stage-header">
              {pipeline.assessmentSubmitted ? (
                <CheckCircle2 size={20} className="ok" />
              ) : (
                <Clock size={20} className="pending" />
              )}
              <h3>Assessment Exam</h3>
              <span className={`status-pill ${pipeline.assessmentSubmitted ? 'ok' : 'no'}`}>
                {pipeline.assessmentSubmitted ? 'Completed' : 'Pending'}
              </span>
            </div>
            {pipeline.assessmentSubmitted ? (
              <div className="journey-metrics">
                <div className="journey-metric-card">
                  <span>Score</span>
                  <strong>{assessmentScore}%</strong>
                </div>
                <div className="journey-metric-card">
                  <span>Benchmark</span>
                  <strong>70%</strong>
                </div>
                <div className="journey-metric-card">
                  <span>Status</span>
                  <strong className={assessmentScore >= 70 ? 'ok-text' : 'danger-text'}>
                    {assessmentScore >= 70 ? 'Pass' : 'Below target'}
                  </strong>
                </div>
              </div>
            ) : (
              <p className="muted tiny">Candidate has not completed the assessment exam yet.</p>
            )}
          </section>

          <section className="journey-stage">
            <div className="journey-stage-header">
              {pipeline.interviewCompleted ? (
                <CheckCircle2 size={20} className="ok" />
              ) : hasInterview ? (
                <Clock size={20} className="pending" />
              ) : (
                <XCircle size={20} className="muted-icon" />
              )}
              <h3>AI Avatar Interview</h3>
              <span
                className={`status-pill ${pipeline.interviewCompleted ? 'ok' : hasInterview ? 'no' : 'no'}`}
              >
                {pipeline.interviewCompleted ? 'Completed' : hasInterview ? 'In progress' : 'Not started'}
              </span>
            </div>
            {hasInterview ? (
              <>
                <div className="journey-metrics">
                  <div className="journey-metric-card">
                    <span>Interview Turns</span>
                    <strong>{interviewTurns.length}</strong>
                  </div>
                  <div className="journey-metric-card">
                    <span>Candidate Answers</span>
                    <strong>{candidateAnswers}</strong>
                  </div>
                  <div className="journey-metric-card">
                    <span>Status</span>
                    <strong className="kpi-small">
                      {pipeline.interviewCompleted ? 'Submitted' : 'Active'}
                    </strong>
                  </div>
                </div>
                {interviewReport && (
                  <div className="journey-interview-eval">
                    <h4>LLM Evaluation Summary</h4>
                    <div className="journey-eval-grid">
                      {interviewReport.dimensions.map((dim) => (
                        <div key={dim.label} className="journey-eval-card">
                          <span>{dim.label}</span>
                          <strong>{dim.score}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="muted tiny">Candidate has not started the interview yet.</p>
            )}
          </section>

          <section className="journey-stage">
            <div className="journey-stage-header">
              {pipeline.shortlisted ? (
                <CheckCircle2 size={20} className="ok" />
              ) : pipeline.disqualified ? (
                <XCircle size={20} className="danger" />
              ) : (
                <Clock size={20} className="pending" />
              )}
              <h3>Shortlist Decision</h3>
              <span
                className={`status-pill ${pipeline.shortlisted ? 'ok' : pipeline.disqualified ? 'no' : 'no'}`}
              >
                {pipeline.shortlisted
                  ? 'Shortlisted'
                  : pipeline.disqualified
                    ? 'Disqualified'
                    : 'Pending'}
              </span>
            </div>
            <p className="muted tiny">
              {pipeline.shortlisted
                ? 'Candidate advanced to final decision stage'
                : pipeline.disqualified
                  ? 'Candidate removed from pipeline'
                  : 'Awaiting HR shortlist decision'}
            </p>
          </section>

          <section className="journey-stage">
            <div className="journey-stage-header">
              {pipeline.finalDecisionMade ? (
                pipeline.finalDecisionType === 'hire' ? (
                  <CheckCircle2 size={20} className="ok" />
                ) : (
                  <XCircle size={20} className="danger" />
                )
              ) : (
                <Clock size={20} className="pending" />
              )}
              <h3>Final Decision</h3>
              <span
                className={`status-pill ${pipeline.finalDecisionMade ? (pipeline.finalDecisionType === 'hire' ? 'ok' : 'no') : 'no'}`}
              >
                {pipeline.finalDecisionMade
                  ? pipeline.finalDecisionType === 'hire'
                    ? 'Hire'
                    : 'Reject'
                  : 'Pending'}
              </span>
            </div>
            <p className="muted tiny">
              {pipeline.finalDecisionMade
                ? `Final decision: ${pipeline.finalDecisionType === 'hire' ? 'Recommended for hire' : 'Rejected'}`
                : 'Awaiting final HR decision'}
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
