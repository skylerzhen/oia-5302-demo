import { Avatar2DInterviewer } from './Avatar2DInterviewer'
import { HeyGenAvatarVideo } from './HeyGenAvatarVideo'
import { LiveAvatarStage } from './LiveAvatarStage'
import { LiveAvatarStatic } from './LiveAvatarStatic'

interface AvatarPanelProps {
  speaking: boolean
  caption: string
  expression?: 'neutral' | 'supportive' | 'curious' | 'gesture'
  viseme?: import('../types').Viseme
  avatarMode?: '2d' | 'heygen' | 'liveavatar' | 'liveavatar-static'
  liveAvatarSessionActive?: boolean
  liveAvatarContext?: 'candidate-interview' | 'hr-review'
}

export function AvatarPanel({
  speaking,
  caption,
  expression = 'neutral',
  avatarMode = '2d',
  liveAvatarSessionActive = false,
  liveAvatarContext = 'candidate-interview',
}: AvatarPanelProps) {
  const digitalMode = avatarMode === 'heygen' || avatarMode === 'liveavatar' || avatarMode === 'liveavatar-static'

  return (
    <div className="avatar-panel">
      <div className="video-frame">
        <span className="live-tag">{speaking ? 'Speaking' : 'AI Interviewer'}</span>

        <div className="avatar-2d-wrap">
          {!digitalMode && (
            <Avatar2DInterviewer speaking={speaking} expression={expression} />
          )}
          {avatarMode === 'heygen' && <HeyGenAvatarVideo active={speaking} />}
          {avatarMode === 'liveavatar' && (
            <LiveAvatarStage
              active={speaking}
              sessionActive={liveAvatarSessionActive}
              context={liveAvatarContext}
            />
          )}
          {avatarMode === 'liveavatar-static' && <LiveAvatarStatic speaking={speaking} />}
        </div>
      </div>

      <div className="avatar-meta">
        <span className="badge">English</span>
        <span className="badge">
          {avatarMode === 'liveavatar' || avatarMode === 'liveavatar-static'
            ? 'LiveAvatar'
            : avatarMode === 'heygen'
              ? 'HeyGen realtime'
              : 'Portrait 2D'}
        </span>
        {(speaking && avatarMode !== 'liveavatar-static') && <span className="badge live">Live</span>}
        {avatarMode === 'liveavatar-static' && <span className="badge">Playback</span>}
      </div>

      <div className="caption-bar">
        {caption}
      </div>
    </div>
  )
}
