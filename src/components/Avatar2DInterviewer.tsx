import { useEffect, useRef } from 'react'
import {
  AVATAR2D_BASE_SRC,
  AVATAR2D_TALK_SRC,
  resolveTalkOpacity,
} from '../lib/avatar2dMouth'
import { avatarLipSyncBus } from '../lib/avatarLipSyncBus'

export type AvatarExpression = 'neutral' | 'supportive' | 'curious' | 'gesture'

interface Avatar2DInterviewerProps {
  speaking: boolean
  expression?: AvatarExpression
}

export function Avatar2DInterviewer({
  speaking,
  expression = 'neutral',
}: Avatar2DInterviewerProps) {
  const talkRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const sync = (snap = avatarLipSyncBus.get()) => {
      const talk = talkRef.current
      if (!talk) return
      talk.style.opacity = resolveTalkOpacity(snap).toFixed(3)
    }

    sync()
    return avatarLipSyncBus.subscribe(sync)
  }, [])

  return (
    <div
      className={`avatar-stage avatar2d-stage expression-${expression} ${speaking ? 'speaking' : ''}`}
      aria-label="OIA AI interviewer avatar"
    >
      <div className="avatar2d-portrait">
        <img
          className="avatar2d-layer avatar2d-base"
          src={AVATAR2D_BASE_SRC}
          alt="OIA AI interviewer"
          draggable={false}
        />
        <img
          ref={talkRef}
          className="avatar2d-layer avatar2d-talk"
          src={AVATAR2D_TALK_SRC}
          alt=""
          aria-hidden
          draggable={false}
        />

        {speaking && <div className="avatar2d-speaking-ring" aria-hidden />}
      </div>

      <div className="avatar-tech-note">
        {expression} · portrait interviewer · lip-sync
      </div>
    </div>
  )
}
