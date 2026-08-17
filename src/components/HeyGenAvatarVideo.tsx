import { useEffect, useRef } from 'react'
import { setHeyGenVideoElement } from '../lib/heygenPlayer'

interface HeyGenAvatarVideoProps {
  active: boolean
  className?: string
}

export function HeyGenAvatarVideo({ active, className }: HeyGenAvatarVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setHeyGenVideoElement(videoRef.current)
    return () => setHeyGenVideoElement(null)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || active) return
    video.pause()
    video.removeAttribute('src')
    video.load()
  }, [active])

  return (
    <video
      ref={videoRef}
      className={`heygen-avatar-video${active ? ' active' : ''}${className ? ` ${className}` : ''}`}
      playsInline
      aria-label="HeyGen AI interviewer video"
    />
  )
}
