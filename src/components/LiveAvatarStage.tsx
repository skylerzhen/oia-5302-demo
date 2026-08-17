import { useEffect, useRef } from 'react'
import {
  getLiveAvatarCredentials,
  reconnectLiveAvatarVideo,
  setLiveAvatarVideoElement,
} from '../lib/liveavatarPlayer'

interface LiveAvatarStageProps {
  active: boolean
  className?: string
}

export function LiveAvatarStage({ active, className }: LiveAvatarStageProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setLiveAvatarVideoElement(videoRef.current)
    return () => setLiveAvatarVideoElement(null)
  }, [])

  useEffect(() => {
    const credentials = getLiveAvatarCredentials()
    if (!credentials || !videoRef.current) return
    void reconnectLiveAvatarVideo()
  }, [active])

  useEffect(() => {
    const video = videoRef.current
    if (!video || active) return
    video.pause()
  }, [active])

  return (
    <video
      ref={videoRef}
      className={`liveavatar-avatar-video${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
      playsInline
      autoPlay
      aria-label="LiveAvatar AI interviewer video"
    />
  )
}
