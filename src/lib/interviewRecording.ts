import type { InterviewRecordingMeta } from '../types'

const DB_NAME = 'oia-recruitment-demo-v1'
const STORE = 'interview-recordings'

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

export async function startInterviewMediaRecorder(options: {
  videoEl: HTMLVideoElement | null
  onError?: (message: string) => void
}): Promise<MediaRecorder | null> {
  if (typeof MediaRecorder === 'undefined') {
    options.onError?.('MediaRecorder is not supported in this browser.')
    return null
  }

  const tracks: MediaStreamTrack[] = []

  try {
    const micAndCam = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user' },
    })
    micAndCam.getTracks().forEach((track) => tracks.push(track))
  } catch {
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      mic.getAudioTracks().forEach((track) => tracks.push(track))
    } catch {
      // Mic optional — avatar video track may still capture interviewer audio.
    }
  }

  const captureStream = options.videoEl
    ? (options.videoEl as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream
    : undefined
  if (typeof captureStream === 'function') {
    captureStream.call(options.videoEl).getTracks().forEach((track: MediaStreamTrack) => tracks.push(track))
  }

  if (tracks.length === 0) {
    options.onError?.('No media tracks available to record.')
    return null
  }

  const stream = new MediaStream(tracks)
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''

  const tryRecorder = (candidate: MediaStream) => {
    try {
      return mimeType ? new MediaRecorder(candidate, { mimeType }) : new MediaRecorder(candidate)
    } catch {
      return null
    }
  }

  const recorder = tryRecorder(stream) ?? tryRecorder(new MediaStream(tracks.filter((track) => track.kind === 'audio').concat(
    tracks.filter((track) => track.kind === 'video').slice(0, 1),
  )))

  if (!recorder) {
    options.onError?.('Could not start recording')
    tracks.forEach((track) => track.stop())
    return null
  }

  return recorder
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
