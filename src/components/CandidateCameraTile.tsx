import { useEffect, type RefObject } from 'react'

export type CandidateCameraStatus = 'idle' | 'live' | 'blocked'

interface CandidateCameraTileProps {
  videoRef: RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  status: CandidateCameraStatus
  label?: string
}

export function CandidateCameraTile({
  videoRef,
  stream,
  status,
  label = 'You',
}: CandidateCameraTileProps) {
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.srcObject = stream
    if (stream) {
      void el.play().catch(() => undefined)
    }
    return () => {
      el.srcObject = null
    }
  }, [stream, videoRef])

  return (
    <div className={`candidate-camera-pip ${status}`}>
      <span className="candidate-camera-tag">{label}</span>
      <video ref={videoRef} muted playsInline autoPlay />
      {status !== 'live' && (
        <p className="candidate-camera-fallback">
          {status === 'blocked' ? 'Camera blocked' : 'Camera off'}
        </p>
      )}
    </div>
  )
}
