import { Target, FileCheck, MessageSquare } from 'lucide-react'
import type { CandidateMatch } from '../types'
import type { InterviewEvaluationReport } from '../lib/interviewReport'

interface ScoreSummaryPanelProps {
  match: CandidateMatch
  assessmentScore: number
  interviewReport: InterviewEvaluationReport | null
}

export function ScoreSummaryPanel({ match, assessmentScore, interviewReport }: ScoreSummaryPanelProps) {
  const avgInterviewScore = interviewReport
    ? Math.round(
        interviewReport.dimensions.reduce((sum, d) => sum + d.score, 0) /
          interviewReport.dimensions.length,
      )
    : 0

  return (
    <div className="score-summary-panel card">
      <h2>Complete Scoring Overview</h2>
      <p className="muted">
        Comprehensive evaluation across CV-JD matching, technical assessment, and interview performance
      </p>

      <div className="score-summary-grid">
        <div className="score-summary-card">
          <div className="score-summary-header">
            <Target size={20} />
            <h3>CV-JD Matching</h3>
          </div>
          <div className="score-summary-main-score">
            <strong>{match.totalScore}%</strong>
            <span>Overall Match</span>
          </div>
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
            <span className="tiny muted">Dimension Breakdown</span>
            {match.dimensions.map((d) => {
              const pct = Math.round((d.score / d.maxScore) * 100)
              return (
                <div key={d.key} className="score-summary-dim">
                  <span>{d.label}</span>
                  <div className="bar-track">
                    <div className={`bar-fill ${d.matched ? 'match' : 'weak'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="score-summary-pct">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="score-summary-card">
          <div className="score-summary-header">
            <FileCheck size={20} />
            <h3>Technical Assessment</h3>
          </div>
          <div className="score-summary-main-score">
            <strong>{assessmentScore}%</strong>
            <span>MCQ Score</span>
          </div>
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
        </div>

        <div className="score-summary-card">
          <div className="score-summary-header">
            <MessageSquare size={20} />
            <h3>Interview Evaluation</h3>
          </div>
          {interviewReport ? (
            <>
              <div className="score-summary-main-score">
                <strong>{avgInterviewScore}%</strong>
                <span>Avg Score</span>
              </div>
              <div className="score-summary-breakdown">
                <span className="tiny muted">LLM-Generated Dimension Scores</span>
                {interviewReport.dimensions.map((dim) => (
                  <div key={dim.label} className="score-summary-dim">
                    <span>{dim.label}</span>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${dim.score >= 60 ? 'match' : 'weak'}`}
                        style={{ width: `${dim.score}%` }}
                      />
                    </div>
                    <span className="score-summary-pct">{dim.score}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted">LLM assessment pending or unavailable</p>
          )}
        </div>
      </div>

      <div className="score-summary-overall">
        <h3>Overall Candidate Profile</h3>
        <div className="score-summary-profile-grid">
          <div>
            <span className="tiny muted">Name</span>
            <p><strong>{match.candidate.name}</strong></p>
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
