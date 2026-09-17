import { useCallback, useEffect, useRef, useState } from 'react'

import { Pause, Play, SkipForward } from 'lucide-react'

import { AvatarPanel } from './AvatarPanel'

import { localAi } from '../lib/localAi'

import { useInterviewAvatar } from '../hooks/useInterviewAvatar'

import { unlockAudioPlayback } from '../lib/audioUnlock'

import {

  installLiveAvatarLifecycleGuards,

  stopLiveAvatarSession,

} from '../lib/liveavatarPlayer'

import { loadPlaybackRecording } from '../lib/interviewRecording'

import {

  preloadSpeechVoices,

  setHeyGenAvatarEnabled,

  setLiveAvatarEnabled,

  speakCandidateReplay,

  stopActiveSpeech,

  warmInterviewSpeech,

} from '../lib/voiceSpeak'

import type { InterviewRecordingMeta, InterviewTurn } from '../types'



interface InterviewReviewPanelProps {

  turns: InterviewTurn[]

  applicationId: string

  recordingMeta: InterviewRecordingMeta | null

  focusTurnId?: string | null

}



export function InterviewReviewPanel({ turns, applicationId, recordingMeta, focusTurnId }: InterviewReviewPanelProps) {

  const [activeIndex, setActiveIndex] = useState(0)

  const [playing, setPlaying] = useState(false)

  const [sessionActive, setSessionActive] = useState(false)

  const [playbackError, setPlaybackError] = useState('')

  const [avatarMode, setAvatarMode] = useState<'heygen' | 'liveavatar'>('liveavatar')

  const [sessionRecordingUrl, setSessionRecordingUrl] = useState<string | null>(null)

  const [sessionRecordingReady, setSessionRecordingReady] = useState(false)

  const sessionVideoRef = useRef<HTMLVideoElement>(null)

  const avatar = useInterviewAvatar(avatarMode)

  const playbackAbortRef = useRef<AbortController | null>(null)

  const playbackGenRef = useRef(0)



  useEffect(() => {

    preloadSpeechVoices()

    warmInterviewSpeech()

    setLiveAvatarEnabled(true)

    localAi.status()

      .then((status) => {

        const provider = status.speech?.avatarProvider

        if (provider === 'liveavatar') {

          setAvatarMode('liveavatar')

          setLiveAvatarEnabled(true)

          setHeyGenAvatarEnabled(false)

        } else {

          const heygen = provider === 'heygen' || status.avatar?.configured === true

          setAvatarMode(heygen ? 'heygen' : 'liveavatar')

          setHeyGenAvatarEnabled(heygen)

          setLiveAvatarEnabled(!heygen)

        }

      })

      .catch(() => {

        setLiveAvatarEnabled(true)

      })

  }, [])



  useEffect(() => {

    let cancelled = false

    let objectUrl: string | null = null

    setSessionRecordingReady(false)

    setSessionRecordingUrl(null)



    if (!applicationId) return



    void loadPlaybackRecording(applicationId)

      .then((stored) => {

        if (cancelled || !stored?.blob) return

        objectUrl = URL.createObjectURL(stored.blob)

        setSessionRecordingUrl(objectUrl)

        setSessionRecordingReady(true)

      })

      .catch(() => {

        if (!cancelled) setSessionRecordingReady(false)

      })



    return () => {

      cancelled = true

      if (objectUrl) URL.revokeObjectURL(objectUrl)

    }

  }, [applicationId, recordingMeta?.endedAt, recordingMeta?.byteLength])

  useEffect(() => {
    if (!focusTurnId) return
    const index = turns.findIndex((turn) => turn.id === focusTurnId)
    if (index < 0) return
    setActiveIndex(index)
    const offsetSec = (turns[index]?.offsetMs ?? 0) / 1000
    const video = sessionVideoRef.current
    if (video && sessionRecordingUrl && Number.isFinite(offsetSec)) {
      video.currentTime = offsetSec
    }
  }, [focusTurnId, sessionRecordingUrl, turns])



  useEffect(() => {

    if (avatarMode !== 'liveavatar') return

    installLiveAvatarLifecycleGuards()

    return () => {

      playbackAbortRef.current?.abort()

      void stopLiveAvatarSession()

    }

  }, [avatarMode])



  const stopPlayback = useCallback(() => {

    playbackGenRef.current += 1

    playbackAbortRef.current?.abort()

    playbackAbortRef.current = null

    avatar.stop()

    stopActiveSpeech()

    const video = sessionVideoRef.current

    if (video) {

      video.pause()

      video.currentTime = 0

    }

    setPlaying(false)

  }, [avatar])



  useEffect(() => () => stopPlayback(), [stopPlayback])



  const ensureLiveSession = useCallback(async () => {

    if (avatarMode !== 'liveavatar') return true

    const ready = await avatar.connectLiveAvatar()

    if (ready) setSessionActive(true)

    return ready

  }, [avatar, avatarMode])



  const playTurnAt = useCallback(async (index: number, signal: AbortSignal, gen: number) => {

    if (playbackGenRef.current !== gen || signal.aborted) return



    stopActiveSpeech()

    if (signal.aborted || playbackGenRef.current !== gen) return



    const turn = turns[index]

    if (!turn) return



    if (turn.speaker === 'avatar') {

      await avatar.speakTurn(turn, { addToTranscript: false, signal })

      return

    }



    avatar.setCaption(turn.text)

    await speakCandidateReplay(turn.text, signal)

  }, [avatar, turns])



  const playSessionRecording = useCallback(async () => {

    if (!sessionRecordingUrl) return false

    stopPlayback()

    unlockAudioPlayback()

    const video = sessionVideoRef.current

    if (!video) return false

    try {

      video.currentTime = 0

      await video.play()

      setPlaying(true)

      return true

    } catch (error) {

      setPlaybackError(error instanceof Error ? error.message : 'Could not play session recording')

      return false

    }

  }, [sessionRecordingUrl, stopPlayback])



  const playFromIndex = useCallback(async (startIndex: number) => {

    if (turns.length === 0) return



    if (sessionRecordingReady && sessionRecordingUrl && startIndex === 0) {

      const played = await playSessionRecording()

      if (played) {

        setActiveIndex(0)

        return

      }

    }



    stopPlayback()

    setPlaybackError('')

    unlockAudioPlayback()



    if (avatarMode === 'liveavatar') {

      const ready = await ensureLiveSession()

      if (!ready) {

        setPlaybackError('LiveAvatar video is not ready. Click Play again in a moment.')

        return

      }

    }



    const abort = new AbortController()

    playbackAbortRef.current = abort

    const gen = playbackGenRef.current

    setPlaying(true)



    try {

      for (let i = startIndex; i < turns.length; i++) {

        if (abort.signal.aborted || playbackGenRef.current !== gen) break

        setActiveIndex(i)

        await playTurnAt(i, abort.signal, gen)

      }

    } catch (error) {

      if (!(error instanceof DOMException && error.name === 'AbortError')) {

        setPlaybackError(error instanceof Error ? error.message : 'Playback failed')

      }

    } finally {

      if (playbackAbortRef.current === abort) playbackAbortRef.current = null

      setPlaying(false)

    }

  }, [

    avatarMode,

    ensureLiveSession,

    playSessionRecording,

    playTurnAt,

    sessionRecordingReady,

    sessionRecordingUrl,

    stopPlayback,

    turns,

  ])



  const playSingleTurn = useCallback(async (index: number) => {

    stopPlayback()

    setPlaybackError('')

    unlockAudioPlayback()

    setActiveIndex(index)

    const offsetSec = (turns[index]?.offsetMs ?? 0) / 1000
    const video = sessionVideoRef.current
    if (video && sessionRecordingUrl && Number.isFinite(offsetSec)) {
      video.currentTime = offsetSec
    }



    if (avatarMode === 'liveavatar') {

      const ready = await ensureLiveSession()

      if (!ready) {

        setPlaybackError('LiveAvatar video is not ready. Try again in a moment.')

        return

      }

    }



    const abort = new AbortController()

    playbackAbortRef.current = abort

    const gen = playbackGenRef.current

    setPlaying(true)



    try {

      await playTurnAt(index, abort.signal, gen)

    } catch (error) {

      if (!(error instanceof DOMException && error.name === 'AbortError')) {

        setPlaybackError(error instanceof Error ? error.message : 'Playback failed')

      }

    } finally {

      if (playbackAbortRef.current === abort) playbackAbortRef.current = null

      setPlaying(false)

    }

  }, [avatarMode, ensureLiveSession, playTurnAt, stopPlayback])



  if (turns.length === 0) {

    return <p className="muted">No recording yet — use Load demo application on H1 or complete Candidate C4.</p>

  }



  const active = turns[activeIndex]

  const caption =

    avatar.caption ||

    active?.text ||

    'Select a turn or press Play recording'



  return (

    <div className="interview-review">

      {sessionRecordingReady && sessionRecordingUrl && (

        <div className="card stack interview-session-recording">

          <h4>Session recording</h4>

          <p className="muted tiny">

            Candidate inset + interviewer, loaded from the API server.{' '}

            {recordingMeta

              ? `${Math.round(recordingMeta.durationMs / 1000)}s · ${recordingMeta.turnCount} transcript turns · ${applicationId}`

              : applicationId}

          </p>

          <video

            ref={sessionVideoRef}

            className="interview-session-video"

            src={sessionRecordingUrl}

            controls

            playsInline

            onEnded={() => setPlaying(false)}

            onPause={() => setPlaying(false)}

          />

        </div>

      )}



      <div className="interview-review-player">

        {(avatar.isConnecting || avatar.isThinking) && avatar.statusMessage && (

          <div className="interview-loading" role="status" aria-live="polite">

            <span className="interview-loading-spinner" aria-hidden="true" />

            <span>{avatar.statusMessage}</span>

          </div>

        )}

        <AvatarPanel

          speaking={avatar.isSpeaking || (playing && active?.speaker === 'avatar')}

          expression={active?.expression ?? avatar.expression}

          caption={caption}

          viseme={avatar.isSpeaking ? avatar.viseme : undefined}

          avatarMode={avatarMode}

          liveAvatarSessionActive={sessionActive && avatarMode === 'liveavatar'}

          liveAvatarContext="hr-review"

          overlay={(
            <div className="candidate-camera-pip blocked">
              <span className="candidate-camera-tag">Candidate</span>
              <p className="candidate-camera-fallback">
                {sessionRecordingReady
                  ? 'See session recording above for candidate inset'
                  : 'No candidate camera on this replay'}
              </p>
            </div>
          )}

        />

        {playbackError && <p className="danger-text">{playbackError}</p>}

        <div className="playback-controls">

          {playing ? (

            <button type="button" className="primary" onClick={stopPlayback}>

              <Pause size={16} /> Stop

            </button>

          ) : (

            <button

              type="button"

              className="primary"

              disabled={avatar.isBusy}

              onClick={() => { void playFromIndex(0) }}

            >

              <Play size={16} /> {sessionRecordingReady ? 'Play session recording' : 'Play recording'}

            </button>

          )}

          <button

            type="button"

            disabled={playing || avatar.isBusy}

            onClick={() => setActiveIndex((i) => Math.min(i + 1, turns.length - 1))}

          >

            <SkipForward size={16} /> Next turn

          </button>

          <span className="muted tiny">Turn {activeIndex + 1} / {turns.length}</span>

        </div>

        {!sessionRecordingReady && (

          <p className="muted tiny">No stored A/V blob yet — turn-by-turn replay uses transcript TTS below.</p>

        )}

      </div>

      <div className="transcript transcript-review">

        {turns.map((t, idx) => (

          <button

            key={t.id}

            type="button"

            className={`turn turn-btn ${t.speaker} ${idx === activeIndex ? 'active-turn' : ''}`}

            onClick={() => { void playSingleTurn(idx) }}

          >

            <strong>{t.speaker}</strong>

            {t.recordedAt && <span className="muted tiny turn-ts">{new Date(t.recordedAt).toLocaleTimeString()}</span>}

            <p>{t.text}</p>

          </button>

        ))}

      </div>

    </div>

  )

}

