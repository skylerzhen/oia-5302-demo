import { useEffect, useRef, useState } from 'react'
import {
  ensureLiveAvatarSession,
  getLiveAvatarLastError,
  isLiveAvatarReconnectPaused,
  liveAvatarVideoHealthy,
  setLiveAvatarVideoElement,
} from '../lib/liveavatarPlayer'
import { formatLiveAvatarError } from '../lib/liveavatarErrors'

interface LiveAvatarStageProps {
  /** Avatar is currently speaking */
  active: boolean
  /** Billable LiveAvatar session is allowed (after Start interview) */
  sessionActive: boolean
  /** HR replay uses different idle copy than candidate C4 */
  context?: 'candidate-interview' | 'hr-review'
  className?: string
}

export function LiveAvatarStage({
  active,
  sessionActive,
  context = 'candidate-interview',
  className,
}: LiveAvatarStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'ready' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setLiveAvatarVideoElement(videoRef.current)
    return () => setLiveAvatarVideoElement(null)
  }, [])

  useEffect(() => {
    if (!sessionActive) {
      setStatus('idle')
      setErrorMessage('')
      return
    }

    let cancelled = false

    async function connect() {
      setStatus('connecting')
      setErrorMessage('')

      const ok = await ensureLiveAvatarSession()
      if (cancelled) return

      if (!ok) {
        setStatus('error')
        setErrorMessage(formatLiveAvatarError(getLiveAvatarLastError() ?? 'Could not connect LiveAvatar video'))
        return
      }

      const video = videoRef.current
      if (video && video.videoWidth > 0) {
        setStatus('ready')
        return
      }

      const deadline = Date.now() + 25_000
      while (Date.now() < deadline && !cancelled) {
        await new Promise((resolve) => window.setTimeout(resolve, 250))
        if (videoRef.current && videoRef.current.videoWidth > 0) {
          setStatus('ready')
          return
        }
      }

      if (!cancelled) {
        setStatus('connecting')
      }
    }

    void connect()
    return () => {
      cancelled = true
    }
  }, [sessionActive])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onReady = () => {
      if (liveAvatarVideoHealthy() || video.videoWidth > 0) {
        setStatus('ready')
        setErrorMessage('')
      }
    }

    video.addEventListener('playing', onReady)
    video.addEventListener('loadeddata', onReady)
    return () => {
      video.removeEventListener('playing', onReady)
      video.removeEventListener('loadeddata', onReady)
    }
  }, [])

  useEffect(() => {
    if (!sessionActive) return

    const timer = window.setInterval(() => {
      if (isLiveAvatarReconnectPaused()) {
        setStatus('error')
        setErrorMessage(formatLiveAvatarError(getLiveAvatarLastError() ?? 'LiveAvatar reconnect paused'))
        return
      }
      if (liveAvatarVideoHealthy()) {
        setStatus('ready')
        setErrorMessage('')
      }
    }, 3000)

    return () => window.clearInterval(timer)
  }, [sessionActive])

  return (
    <div className={`liveavatar-stage${className ? ` ${className}` : ''}`}>
      {!sessionActive && (
        <div className="liveavatar-stage-overlay idle" aria-live="polite">
          {context === 'hr-review' ? (
            <>
              <strong>Interview replay · HR review</strong>
              <span>Press <em>Play recording</em> below to load avatar video for this transcript.</span>
              <span className="tiny">Read-only playback — no new candidate session is started until you press Play.</span>
            </>
          ) : (
            <>
              <strong>LiveAvatar Lite</strong>
              <span>Press <em>Start interview</em> to connect video.</span>
              <span className="tiny">Session billing starts only after you start — not while this screen is idle.</span>
            </>
          )}
        </div>
      )}
      {sessionActive && status !== 'ready' && (
        <div className="liveavatar-stage-overlay" aria-live="polite">
          {status === 'error' ? (
            <>
              <strong>LiveAvatar video unavailable</strong>
              <span>{errorMessage}</span>
            </>
          ) : (
            <>
              <span className="interview-loading-spinner" aria-hidden="true" />
              <span>Connecting LiveAvatar… first connect may take up to 60 seconds.</span>
            </>
          )}
        </div>
      )}
      <video
        ref={videoRef}
        className={`liveavatar-avatar-video${active ? ' speaking' : ''}`}
        playsInline
        autoPlay
        aria-label="LiveAvatar AI interviewer video"
      />
    </div>
  )
}
