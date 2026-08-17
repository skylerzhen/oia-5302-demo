import Hls from 'hls.js'

let sharedHeyGenVideo: HTMLVideoElement | null = null

export function setHeyGenVideoElement(element: HTMLVideoElement | null) {
  sharedHeyGenVideo = element
}

export function getHeyGenVideoElement() {
  return sharedHeyGenVideo
}

export async function playHeyGenHls(
  video: HTMLVideoElement,
  hlsUrl: string,
  signal?: AbortSignal,
): Promise<void> {
  video.muted = false
  video.playsInline = true

  await new Promise<void>((resolve, reject) => {
    let hls: Hls | null = null

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort)
      if (hls) {
        hls.destroy()
        hls = null
      }
    }

    const onAbort = () => {
      cleanup()
      video.pause()
      reject(new DOMException('Speech interrupted', 'AbortError'))
    }

    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    const finishOk = () => {
      cleanup()
      resolve()
    }

    const finishErr = (error: Error) => {
      cleanup()
      reject(error)
    }

    video.onended = finishOk
    video.onerror = () => finishErr(new Error('HeyGen video playback failed'))

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl
      void video.play().catch((error) => finishErr(error instanceof Error ? error : new Error('HeyGen playback failed')))
      return
    }

    if (!Hls.isSupported()) {
      finishErr(new Error('HLS playback is not supported in this browser'))
      return
    }

    hls = new Hls({ enableWorker: true, lowLatencyMode: true })
    hls.loadSource(hlsUrl)
    hls.attachMedia(video)
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      void video.play().catch((error) => finishErr(error instanceof Error ? error : new Error('HeyGen playback failed')))
    })
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        finishErr(new Error(`HeyGen HLS error: ${data.type}`))
      }
    })
  })
}
