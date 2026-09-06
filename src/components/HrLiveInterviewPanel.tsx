import { useState } from 'react'
import { Radio, Send } from 'lucide-react'
import type { HrInjectedQuestion, InterviewTurn, PipelineStatus } from '../types'

interface HrLiveInterviewPanelProps {
  interviewTurns: InterviewTurn[]
  pipeline: PipelineStatus
  hrInjectedQuestion: HrInjectedQuestion | null
  onQueueQuestion: (textEn: string) => void
  onOpenReview?: () => void
}

export function HrLiveInterviewPanel({
  interviewTurns,
  pipeline,
  hrInjectedQuestion,
  onQueueQuestion,
  onOpenReview,
}: HrLiveInterviewPanelProps) {
  const [draft, setDraft] = useState('')

  const live =
    pipeline.assessmentSubmitted
    && !pipeline.interviewCompleted
    && interviewTurns.length > 0
  const waiting =
    pipeline.assessmentSubmitted
    && !pipeline.interviewCompleted
    && interviewTurns.length === 0
  const done = pipeline.interviewCompleted && interviewTurns.length > 0

  function submitQuestion() {
    const text = draft.trim()
    if (!text) return
    onQueueQuestion(text)
    setDraft('')
  }

  return (
    <section className="card stack hr-live-interview">
      <header className="hr-live-interview-head">
        <div>
          <h3>Live interview monitor</h3>
          <p className="muted tiny">
            Same browser session as the candidate — transcript updates as they answer.
          </p>
        </div>
        {live && <span className="live-pill"><Radio size={14} aria-hidden /> Live</span>}
        {waiting && <span className="muted tiny">Waiting for candidate to start C4…</span>}
        {done && <span className="badge">Submitted</span>}
      </header>

      {interviewTurns.length === 0 ? (
        <p className="muted tiny">
          No turns yet. Open Candidate portal → C4, or load demo data after the candidate begins.
        </p>
      ) : (
        <div className="hr-live-transcript" aria-live="polite">
          {interviewTurns.map((turn) => (
            <div key={turn.id} className={`turn ${turn.speaker}`}>
              <strong>{turn.speaker === 'avatar' ? 'Avatar' : 'Candidate'}</strong>
              <p>{turn.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="hr-live-push stack">
        <label className="stack gap-xs">
          <span className="tiny-label">Push next avatar question</span>
          <textarea
            rows={3}
            value={draft}
            placeholder="Type the question the digital human should ask next…"
            onChange={(e) => setDraft(e.target.value)}
            disabled={pipeline.interviewCompleted}
          />
        </label>
        {hrInjectedQuestion && (
          <p className="ok-text tiny">
            Queued for next turn: “{hrInjectedQuestion.textEn.slice(0, 120)}
            {hrInjectedQuestion.textEn.length > 120 ? '…' : ''}”
          </p>
        )}
        <div className="row-actions">
          <button
            type="button"
            className="primary"
            disabled={!draft.trim() || pipeline.interviewCompleted}
            onClick={submitQuestion}
          >
            <Send size={16} /> Queue for next turn
          </button>
          {onOpenReview && interviewTurns.length > 0 && (
            <button type="button" className="primary-outline" onClick={onOpenReview}>
              Open full replay (H3)
            </button>
          )}
        </div>
        <p className="muted tiny">
          Overrides the next fixed/adaptive question once. Edit the full blueprint below for later turns.
        </p>
      </div>
    </section>
  )
}
