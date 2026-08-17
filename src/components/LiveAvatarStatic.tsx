interface LiveAvatarStaticProps {
  speaking: boolean
}

export function LiveAvatarStatic({ speaking }: LiveAvatarStaticProps) {
  return (
    <div
      className={`avatar-stage liveavatar-static-stage ${speaking ? 'speaking' : ''}`}
      aria-label="LiveAvatar interview recording (static playback)"
    >
      <div className="liveavatar-static-frame">
        <div className="liveavatar-static-placeholder">
          <div className="liveavatar-static-avatar">
            <div className="liveavatar-static-head">
              <div className="liveavatar-static-face">
                <div className="liveavatar-eye left"></div>
                <div className="liveavatar-eye right"></div>
                <div className={`liveavatar-mouth ${speaking ? 'talking' : ''}`}></div>
              </div>
            </div>
          </div>
          {speaking && <div className="liveavatar-static-wave" />}
        </div>
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
