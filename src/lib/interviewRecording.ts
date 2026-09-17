import type { InterviewRecordingMeta } from '../types'

const DB_NAME = 'oia-recruitment-demo-v1'
const STORE = 'interview-recordings'
const COMPOSITE_WIDTH = 1280
const COMPOSITE_HEIGHT = 720

export type InterviewRecorderHandle = {
  recorder: MediaRecorder
  stopExtras: () => void
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

export async function saveInterviewRecordingBlob(
  applicationId: string,
  blob: Blob,
  meta: InterviewRecordingMeta,
): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
    tx.objectStore(STORE).put({ blob, meta }, applicationId)
  })
  db.close()
}

export async function loadInterviewRecordingBlob(
  applicationId: string,
): Promise<{ blob: Blob; meta: InterviewRecordingMeta } | null> {
  const db = await openDb()
  const result = await new Promise<{ blob: Blob; meta: InterviewRecordingMeta } | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB read failed'))
    const req = tx.objectStore(STORE).get(applicationId)
    req.onsuccess = () => resolve(req.result as { blob: Blob; meta: InterviewRecordingMeta } | undefined)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'))
  })
  db.close()
  if (!result?.blob) return null
  return result
}

export async function acquireCandidateMedia(
  onError?: (message: string) => void,
): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) {
    onError?.('Camera is not available in this browser.')
    return null
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user' },
    })
  } catch {
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      onError?.('Camera was blocked — microphone only. HR replay will not show your video.')
      return mic
    } catch {
      onError?.('Camera and microphone were blocked.')
      return null
    }
  }
}

function captureElementStream(videoEl: HTMLVideoElement | null): MediaStream | null {
  if (!videoEl) return null
  const capture = (videoEl as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream
  if (typeof capture !== 'function') return null
  try {
    return capture.call(videoEl)
  } catch {
    return null
  }
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus'
  if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm'
  if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm'
  return ''
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const vw = video.videoWidth || w
  const vh = video.videoHeight || h
  const scale = Math.max(w / vw, h / vh)
  const dw = vw * scale
  const dh = vh * scale
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(video, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

function startCompositeLoop(
  canvas: HTMLCanvasElement,
  avatarEl: HTMLVideoElement | null,
  candidateEl: HTMLVideoElement | null,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => undefined
  let running = true
  const tick = () => {
    if (!running) return
    ctx.fillStyle = '#0B1A2F'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    if (avatarEl && avatarEl.readyState >= 2 && avatarEl.videoWidth > 0) {
      drawCover(ctx, avatarEl, 0, 0, canvas.width, canvas.height)
    }
    if (candidateEl && candidateEl.readyState >= 2 && candidateEl.videoWidth > 0) {
      const pipW = Math.round(canvas.width * 0.28)
      const pipH = Math.round(pipW * 0.75)
      const x = canvas.width - pipW - 28
      const y = canvas.height - pipH - 28
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x - 3, y - 22, pipW + 6, pipH + 25)
      ctx.fillStyle = '#0B1A2F'
      ctx.font = '600 14px Inter, sans-serif'
      ctx.fillText('Candidate', x + 6, y - 6)
      drawCover(ctx, candidateEl, x, y, pipW, pipH)
    }
    requestAnimationFrame(tick)
  }
  tick()
  return () => {
    running = false
  }
}

export async function startInterviewMediaRecorder(options: {
  videoEl: HTMLVideoElement | null
  candidateStream?: MediaStream | null
  candidateVideoEl?: HTMLVideoElement | null
  onError?: (message: string) => void
}): Promise<InterviewRecorderHandle | null> {
  if (typeof MediaRecorder === 'undefined') {
    options.onError?.('MediaRecorder is not supported in this browser.')
    return null
  }

  const candidateStream = options.candidateStream ?? await acquireCandidateMedia(options.onError)
  const canvas = document.createElement('canvas')
  canvas.width = COMPOSITE_WIDTH
  canvas.height = COMPOSITE_HEIGHT
  const stopLoop = startCompositeLoop(canvas, options.videoEl, options.candidateVideoEl ?? null)
  const canvasStream = canvas.captureStream(20)
  const mixed = new MediaStream(canvasStream.getVideoTracks())
  candidateStream?.getAudioTracks().forEach((track) => mixed.addTrack(track.clone()))
  const avatarStream = captureElementStream(options.videoEl)
  avatarStream?.getAudioTracks().forEach((track) => mixed.addTrack(track.clone()))

  if (mixed.getTracks().length === 0) {
    stopLoop()
    options.onError?.('No media tracks available to record.')
    return null
  }

  const mimeType = pickMimeType()
  const tryRecorder = (candidate: MediaStream) => {
    try {
      return mimeType ? new MediaRecorder(candidate, { mimeType }) : new MediaRecorder(candidate)
    } catch {
      return null
    }
  }

  const recorder = tryRecorder(mixed)
    ?? tryRecorder(new MediaStream(mixed.getAudioTracks().concat(mixed.getVideoTracks().slice(0, 1))))

  if (!recorder) {
    stopLoop()
    canvasStream.getTracks().forEach((track) => track.stop())
    options.onError?.('Could not start recording')
    return null
  }

  return {
    recorder,
    stopExtras: () => {
      stopLoop()
      canvasStream.getTracks().forEach((track) => track.stop())
    },
  }
}

export function stopMediaRecorder(recorder: MediaRecorder | null, streamTracks?: MediaStreamTrack[]) {
  if (recorder && recorder.state !== 'inactive') {
    try {
      recorder.stop()
    } catch {
      // ignore
    }
  }
  streamTracks?.forEach((track) => track.stop())
}

export function beginInterviewRecording(recorder: MediaRecorder, chunks: Blob[]) {
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  recorder.start(1000)
}

export function waitForRecorderStop(recorder: MediaRecorder | null): Promise<void> {
  if (!recorder || recorder.state === 'inactive') return Promise.resolve()
  return new Promise((resolve) => {
    recorder.addEventListener('stop', () => resolve(), { once: true })
    try {
      recorder.stop()
    } catch {
      resolve()
    }
  })
}

export function buildRecordingBlob(chunks: Blob[], mimeType: string): Blob | null {
  if (chunks.length === 0) return null
  return new Blob(chunks, { type: mimeType || chunks[0]?.type || 'video/webm' })
}

export async function loadPlaybackRecording(
  applicationId: string,
): Promise<{ blob: Blob; source: 'server' | 'browser' } | null> {
  const { localAi } = await import('./localAi')
  try {
    const blob = await localAi.downloadInterviewRecording(applicationId)
    if (blob && blob.size > 0) return { blob, source: 'server' }
  } catch {
    // Fall back to the same-browser cache if the API is unreachable.
  }
  const stored = await loadInterviewRecordingBlob(applicationId)
  if (stored?.blob) return { blob: stored.blob, source: 'browser' }
  return null
}