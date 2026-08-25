import { AVATAR2D_BASE_SRC, AVATAR2D_TALK_SRC } from '../lib/avatar2dMouth'

interface LiveAvatarStaticProps {
  speaking: boolean
}

export function LiveAvatarStatic({ speaking }: LiveAvatarStaticProps) {
  return (
    <div
      className={`avatar-stage liveavatar-static-stage has-preview ${speaking ? 'speaking' : ''}`}
      aria-label="LiveAvatar interview recording (static playback)"
    >
      <div className="liveavatar-static-frame">
        <img
          className="liveavatar-static-preview"
          src={AVATAR2D_BASE_SRC}
          alt="LiveAvatar recording"
          draggable={false}
        />
        <img
          className="liveavatar-static-preview liveavatar-static-talk"
          src={AVATAR2D_TALK_SRC}
          alt=""
          aria-hidden
          draggable={false}
          style={{ opacity: speaking ? 0.78 : 0 }}
        />
        {speaking && <div className="liveavatar-static-wave" />}
        <div className="liveavatar-static-badge">
          <span className="liveavatar-static-dot"></span>
          LiveAvatar Recording
        </div>
      </div>

      <div className="avatar-tech-note">
        {speaking ? 'Playing' : 'Paused'} · LiveAvatar playback · no session cost
      </div>
    </div>
  )
}
