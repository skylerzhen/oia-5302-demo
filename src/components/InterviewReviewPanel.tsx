import { useEffect, useState } from 'react'
import { Play, SkipForward } from 'lucide-react'
import { AvatarPanel } from './AvatarPanel'
import type { InterviewTurn } from '../types'

interface InterviewReviewPanelProps {
  turns: InterviewTurn[]
}

export function InterviewReviewPanel({ turns }: InterviewReviewPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  const active = turns[activeIndex]
  const avatarTurn = active?.speaker === 'avatar' ? active : turns.find((t) => t.speaker === 'avatar')

  useEffect(() => {
    if (!playing || turns.length === 0) return
    const timer = window.setInterval(() => {
      setActiveIndex((i) => {
        if (i >= turns.length - 1) {
          setPlaying(false)
          return i
        }
        return i + 1
      })
    }, 2200)
    return () => window.clearInterval(timer)
  }, [playing, turns.length])

  if (turns.length === 0) {
    return <p className="muted">No recording yet — use Load demo application on H1 or complete Candidate C4.</p>
  }

  const captionTurn = active?.speaker === 'avatar' ? active : avatarTurn ?? active

  return (
    <div className="interview-review">
      <div className="interview-review-player">
        <AvatarPanel
          speaking={playing && active?.speaker === 'avatar'}
          language={captionTurn?.language ?? 'en'}
          caption={captionTurn?.text ?? 'Select a turn to preview'}
        />
        <div className="playback-controls">
          <button type="button" className="primary" onClick={() => { setActiveIndex(0); setPlaying(true) }}>
            <Play size={16} /> Play recording
          </button>
          <button type="button" onClick={() => setActiveIndex((i) => Math.min(i + 1, turns.length - 1))}>
            <SkipForward size={16} /> Next turn
          </button>
          <span className="muted tiny">Turn {activeIndex + 1} / {turns.length}</span>
        </div>
      </div>
      <div className="transcript transcript-review">
        {turns.map((t, idx) => (
          <button
            key={t.id}
            type="button"
            className={`turn turn-btn ${t.speaker} ${idx === activeIndex ? 'active-turn' : ''}`}
            dir={t.language === 'ar' ? 'rtl' : 'ltr'}
            onClick={() => { setActiveIndex(idx); setPlaying(false) }}
          >
            <strong>{t.speaker} · {t.language.toUpperCase()}</strong>
            <p>{t.text}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
