import { User, ArrowLeft } from 'lucide-react'
import type { CandidateMatch } from '../types'

interface CurrentCandidateCardProps {
  candidate: CandidateMatch
  cvMatchScore?: number
  onChangeCandidate?: () => void
  showChangeButton?: boolean
}

export function CurrentCandidateCard({
  candidate,
  cvMatchScore,
  onChangeCandidate,
  showChangeButton = true,
}: CurrentCandidateCardProps) {
  const matchScore = cvMatchScore ?? candidate.totalScore
  return (
    <div className="current-candidate-card">
      <div className="current-candidate-avatar">
        <User size={32} />
      </div>
      <div className="current-candidate-info">
        <div className="current-candidate-header">
          <div>
            <span className="current-candidate-label">Current Candidate</span>
            <h3>{candidate.candidate.name}</h3>
          </div>
          {showChangeButton && onChangeCandidate && (
            <button type="button" className="ghost-btn" onClick={onChangeCandidate}>
              <ArrowLeft size={16} /> Change candidate
            </button>
          )}
        </div>
        <div className="current-candidate-metrics">
          <div className="current-candidate-metric">
            <span>CV-JD Match</span>
            <strong className={matchScore >= 60 ? 'ok-text' : 'danger-text'}>
              {matchScore}%
            </strong>
          </div>
          <div className="current-candidate-metric">
            <span>Matched Dimensions</span>
            <strong>
              {candidate.matchedCount}/{candidate.totalDimensions}
            </strong>
          </div>
          <div className="current-candidate-metric">
            <span>Experience</span>
            <strong>{candidate.candidate.yearsExperience} years</strong>
          </div>
          <div className="current-candidate-metric">
            <span>Education</span>
            <strong className="current-candidate-small">{candidate.candidate.education}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
