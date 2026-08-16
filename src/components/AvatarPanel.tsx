import { Avatar2DInterviewer } from './Avatar2DInterviewer'

interface AvatarPanelProps {
  speaking: boolean
  caption: string
  expression?: 'neutral' | 'supportive' | 'curious' | 'gesture'
  viseme?: import('../types').Viseme
}

export function AvatarPanel({
  speaking,
  caption,
  expression = 'neutral',
}: AvatarPanelProps) {
  return (
    <div className="avatar-panel">
      <div className="video-frame">
        <span className="live-tag">{speaking ? 'Speaking' : 'AI Interviewer'}</span>

        <div className="avatar-2d-wrap">
          <Avatar2DInterviewer speaking={speaking} expression={expression} />
        </div>
      </div>

      <div className="avatar-meta">
        <span className="badge">English</span>
        <span className="badge">Portrait 2D</span>
        {speaking && <span className="badge live">Live</span>}
      </div>

      <div className="caption-bar">
        {caption}
      </div>
    </div>
  )
}
