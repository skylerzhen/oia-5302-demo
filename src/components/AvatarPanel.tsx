import { Avatar2DInterviewer } from './Avatar2DInterviewer'
import { HeyGenAvatarVideo } from './HeyGenAvatarVideo'
import { LiveAvatarStage } from './LiveAvatarStage'

interface AvatarPanelProps {
  speaking: boolean
  caption: string
  expression?: 'neutral' | 'supportive' | 'curious' | 'gesture'
  viseme?: import('../types').Viseme
  avatarMode?: '2d' | 'heygen' | 'liveavatar'
}

export function AvatarPanel({
  speaking,
  caption,
  expression = 'neutral',
  avatarMode = '2d',
}: AvatarPanelProps) {
  const digitalMode = avatarMode === 'heygen' || avatarMode === 'liveavatar'

  return (
    <div className="avatar-panel">
      <div className="video-frame">
        <span className="live-tag">{speaking ? 'Speaking' : 'AI Interviewer'}</span>

        <div className="avatar-2d-wrap">
          <Avatar2DInterviewer speaking={speaking && !digitalMode} expression={expression} />
          {avatarMode === 'heygen' && <HeyGenAvatarVideo active={speaking} />}
          {avatarMode === 'liveavatar' && <LiveAvatarStage active={speaking} />}
        </div>
      </div>

      <div className="avatar-meta">
        <span className="badge">English</span>
        <span className="badge">
          {avatarMode === 'liveavatar'
            ? 'LiveAvatar Lite'
            : avatarMode === 'heygen'
              ? 'HeyGen realtime'
              : 'Portrait 2D'}
        </span>
        {speaking && <span className="badge live">Live</span>}
      </div>

      <div className="caption-bar">
        {caption}
      </div>
    </div>
  )
}
