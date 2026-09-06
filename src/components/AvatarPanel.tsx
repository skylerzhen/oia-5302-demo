import { HeyGenAvatarVideo } from './HeyGenAvatarVideo'
import { LiveAvatarStage } from './LiveAvatarStage'
import type { AvatarExpression } from '../types'

interface AvatarPanelProps {
  speaking: boolean
  caption: string
  expression?: AvatarExpression
  viseme?: import('../types').Viseme
  avatarMode?: 'heygen' | 'liveavatar'
  liveAvatarSessionActive?: boolean
  liveAvatarContext?: 'candidate-interview' | 'hr-review'
}

export function AvatarPanel({
  speaking,
  caption,
  avatarMode = 'liveavatar',
  liveAvatarSessionActive = false,
  liveAvatarContext = 'candidate-interview',
}: AvatarPanelProps) {
  return (
    <div className="avatar-panel">
      <div className="video-frame">
        <span className="live-tag">{speaking ? 'Speaking' : 'AI Interviewer'}</span>

        <div className="avatar-2d-wrap">
          {avatarMode === 'heygen' && <HeyGenAvatarVideo active={speaking} />}
          {avatarMode === 'liveavatar' && (
            <LiveAvatarStage
              active={speaking}
              sessionActive={liveAvatarSessionActive}
              context={liveAvatarContext}
            />
          )}
        </div>
      </div>

      <div className="avatar-meta">
        <span className="badge">English</span>
        <span className="badge">
          {avatarMode === 'liveavatar' ? 'LiveAvatar' : 'HeyGen realtime'}
        </span>
        {speaking && <span className="badge live">Live</span>}
      </div>

      <div className="caption-bar">
        {caption}
      </div>
    </div>
  )
}
