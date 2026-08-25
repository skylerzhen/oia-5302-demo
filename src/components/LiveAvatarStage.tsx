import { useEffect, useRef, useState } from 'react'
import {
  ensureLiveAvatarSession,
  getLiveAvatarLastError,
  isLiveAvatarReconnectPaused,
  liveAvatarVideoHealthy,
  refreshLiveAvatarSession,
  reconnectLiveAvatarVideo,
  setLiveAvatarVideoElement,
} from '../lib/liveavatarPlayer'

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
        setErrorMessage(getLiveAvatarLastError() ?? 'Could not connect LiveAvatar video')
        return
      }

      await reconnectLiveAvatarVideo()
      if (cancelled) return

      const video = videoRef.current
      if (video && video.videoWidth > 0) {
        setStatus('ready')
        return
      }

      window.setTimeout(() => {
        if (cancelled) return
        if (videoRef.current && videoRef.current.videoWidth > 0) {
          setStatus('ready')
        } else {
          setStatus('connecting')
        }
      }, 1200)
    }

    void connect()
    return () => {
      cancelled = true
    }
  }, [sessionActive])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlaying = () => setStatus('ready')
    video.addEventListener('playing', onPlaying)
    video.addEventListener('loadeddata', onPlaying)
    return () => {
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('loadeddata', onPlaying)
    }
  }, [])

  useEffect(() => {
    if (!sessionActive) return

    const timer = window.setInterval(() => {
      if (isLiveAvatarReconnectPaused()) {
        setStatus('error')
        setErrorMessage(getLiveAvatarLastError() ?? 'LiveAvatar reconnect paused')
        return
      }
      if (liveAvatarVideoHealthy()) {
        setStatus((current) => (current === 'ready' ? current : 'ready'))
        return
      }
      setStatus('connecting')
      void refreshLiveAvatarSession().then((ok) => {
        if (ok && liveAvatarVideoHealthy()) {
          setStatus('ready')
          setErrorMessage('')
        } else if (!ok || isLiveAvatarReconnectPaused()) {
          setStatus('error')
          setErrorMessage(getLiveAvatarLastError() ?? 'LiveAvatar video reconnect failed')
        }
      })
    }, 20_000)

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
              <span>Connecting LiveAvatar…</span>
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
