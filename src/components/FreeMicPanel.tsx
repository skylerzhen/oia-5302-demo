import { Keyboard, Mic } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { unlockAudioPlayback } from '../lib/audioUnlock'
import { isFreeMicSupported, startFreeMicSession } from '../lib/freeMicAsr'

interface FreeMicPanelProps {
  active: boolean
  llmBusy: boolean
  avatarSpeaking: boolean
  onBargeIn: () => void
  onPartialStable: (partial: string) => void
  onUtterance: (text: string) => void
  typedValue?: string
  onTypedChange?: (value: string) => void
  onTypedSubmit?: () => void
  typedSubmitLabel?: string
  typedPlaceholder?: string
}

/** Ignore mic submissions for this long after the avatar stops (prevents bleed-through). */
const AVATAR_COOLDOWN_MS = 3_000

export function FreeMicPanel({
  active,
  llmBusy,
  avatarSpeaking,
  onBargeIn,
  onPartialStable,
  onUtterance,
  typedValue = '',
  onTypedChange,
  onTypedSubmit,
  typedSubmitLabel = 'Send typed answer',
  typedPlaceholder = 'Type your answer…',
}: FreeMicPanelProps) {
  const [liveCaption, setLiveCaption] = useState('')
  const [micError, setMicError] = useState('')
  const [showTyping, setShowTyping] = useState(false)
  const [following, setFollowing] = useState(false)
  const sessionRef = useRef<ReturnType<typeof startFreeMicSession> | null>(null)
  const llmBusyRef = useRef(llmBusy)
  const avatarSpeakingRef = useRef(avatarSpeaking)
  const onBargeInRef = useRef(onBargeIn)
  const onPartialStableRef = useRef(onPartialStable)
  const onUtteranceRef = useRef(onUtterance)
  const utteranceSubmittingRef = useRef(false)
  const avatarCooldownUntilRef = useRef(0)
  const userBargedInRef = useRef(false)
  const wasAvatarSpeakingRef = useRef(false)
  const supported = isFreeMicSupported()

  llmBusyRef.current = llmBusy
  avatarSpeakingRef.current = avatarSpeaking
  onBargeInRef.current = onBargeIn
  onPartialStableRef.current = onPartialStable
  onUtteranceRef.current = onUtterance

  useEffect(() => {
    if (avatarSpeaking) {
      userBargedInRef.current = false
      wasAvatarSpeakingRef.current = true
      return
    }
    if (wasAvatarSpeakingRef.current) {
      wasAvatarSpeakingRef.current = false
      avatarCooldownUntilRef.current = Date.now() + AVATAR_COOLDOWN_MS
    }
  }, [avatarSpeaking])

  useEffect(() => {
    if (!active || !supported) {
      sessionRef.current?.stop()
      sessionRef.current = null
      setLiveCaption('')
      setFollowing(false)
      return
    }

    unlockAudioPlayback()
    setMicError('')

    try {
      sessionRef.current = startFreeMicSession({
        onLiveCaption: (caption) => {
          if (avatarSpeakingRef.current && !userBargedInRef.current) {
            setLiveCaption('')
            return
          }
          setLiveCaption(caption)
        },
        onSpeechStart: (caption) => {
          if (avatarSpeakingRef.current && caption.length >= 10) {
            userBargedInRef.current = true
            onBargeInRef.current()
          }
        },
        onPartialStable: (partial) => {
          if (llmBusyRef.current || avatarSpeakingRef.current) return
          if (Date.now() < avatarCooldownUntilRef.current) return
          setFollowing(true)
          onPartialStableRef.current(partial)
          window.setTimeout(() => setFollowing(false), 1800)
        },
        shouldAcceptUtterance: () => {
          if (llmBusyRef.current || utteranceSubmittingRef.current) return false
          if (avatarSpeakingRef.current) return false
          if (Date.now() < avatarCooldownUntilRef.current && !userBargedInRef.current) return false
          return true
        },
        onUtteranceComplete: (text) => {
          if (llmBusyRef.current || utteranceSubmittingRef.current) return
          utteranceSubmittingRef.current = true
          userBargedInRef.current = false
          setLiveCaption('')
          setFollowing(false)
          onUtteranceRef.current(text)
          window.setTimeout(() => {
            utteranceSubmittingRef.current = false
          }, 2_500)
        },
        onError: (message) => setMicError(message),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Microphone unavailable'
      setMicError(message)
    }

    return () => {
      sessionRef.current?.stop()
      sessionRef.current = null
    }
  }, [active, supported])

  return (
    <div className="free-mic-panel stack">
      <div className="free-mic-head">
        <span className={`free-mic-badge ${active && supported ? 'live' : ''}`}>
          <Mic size={14} aria-hidden />
          {active && supported ? 'Duplex · listen & respond' : 'Duplex off'}
        </span>
        {following && (
          <span className="free-mic-follow muted tiny">AI following your answer…</span>
        )}
        {onTypedChange && (
          <button type="button" className="ghost-btn" onClick={() => setShowTyping((v) => !v)}>
            <Keyboard size={16} /> {showTyping ? 'Hide typing' : 'Type instead'}
          </button>
        )}
      </div>

      <p className="muted tiny">
        Mic stays open — talk over the avatar anytime. Pause ~2 seconds when you finish your answer;
        the interviewer waits until you speak (avatar audio is ignored).
      </p>

      {active && supported && (
        <div className="free-mic-caption" aria-live="polite">
          <span className="muted tiny">You · live caption</span>
          <p>
            {avatarSpeaking && !liveCaption
              ? 'Interviewer speaking — your turn after they finish…'
              : liveCaption || (llmBusy ? 'Generating follow-up…' : 'Listening…')}
          </p>
        </div>
      )}

      {!supported && (
        <p className="muted tiny">Duplex mic needs Chrome or Edge. Use typing below.</p>
      )}

      {micError && <p className="danger-text">{micError}</p>}

      {showTyping && onTypedChange && (
        <div className="stack">
          <textarea
            value={typedValue}
            onChange={(event) => onTypedChange(event.target.value)}
            placeholder={typedPlaceholder}
            disabled={llmBusy}
          />
          {onTypedSubmit && (
            <button
              type="button"
              className="primary"
              disabled={llmBusy || !typedValue.trim()}
              onClick={onTypedSubmit}
            >
              {typedSubmitLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
