import { Mic, MicOff, Keyboard, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { isBrowserAsrSupported, listenForSpeech, type SpeechLanguage } from '../lib/browserAsr'
import { localAi } from '../lib/localAi'

interface VoiceAnswerInputProps {
  language: SpeechLanguage
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  onSubmit: () => void
  submitLabel: string
  submitDisabled?: boolean
}

export function VoiceAnswerInput({
  language,
  value,
  onChange,
  disabled = false,
  placeholder,
  onSubmit,
  submitLabel,
  submitDisabled = false,
}: VoiceAnswerInputProps) {
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [showTyping, setShowTyping] = useState(false)
  const sendRef = useRef<HTMLButtonElement | null>(null)
  const asrSupported = isBrowserAsrSupported()
  const canSend = Boolean(value.trim()) && !disabled && !listening && !submitDisabled

  useEffect(() => {
    if (!value.trim() || listening) return
    sendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [listening, value])

  async function startListening() {
    if (disabled || listening || !asrSupported) return
    setVoiceError('')
    onChange('')
    setListening(true)
    try {
      const transcript = await listenForSpeech(language)
      onChange(transcript)
      try {
        await localAi.transcribe({ transcript, language })
      } catch {
        // Browser ASR already captured transcript; server logging is optional.
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Voice capture failed'
      setVoiceError(message)
    } finally {
      setListening(false)
    }
  }

  return (
    <div className="voice-answer stack">
      <div className="voice-answer-toolbar">
        <button
          type="button"
          className={`voice-mic-btn ${listening ? 'listening' : ''}`}
          disabled={disabled || !asrSupported}
          onClick={() => { void startListening() }}
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
          {listening ? 'Listening…' : 'Answer with microphone'}
        </button>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => setShowTyping((current) => !current)}
        >
          <Keyboard size={16} /> {showTyping ? 'Hide typing' : 'Type instead'}
        </button>
      </div>

      {!asrSupported && (
        <p className="muted tiny">Microphone ASR needs Chrome/Edge/Safari. Use typing fallback below.</p>
      )}

      {listening && (
        <p className="muted tiny">Speak now — recording stops automatically when you pause.</p>
      )}

      {value && !listening && (
        <div className="voice-transcript-preview" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <span className="muted tiny">Your answer (review before sending)</span>
          <p>{value}</p>
        </div>
      )}

      {(showTyping || !asrSupported) && (
        <textarea
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled || listening}
        />
      )}

      {voiceError && <p className="danger-text">{voiceError}</p>}

      <div className="voice-send-row">
        <button
          ref={sendRef}
          type="button"
          className="primary"
          disabled={!canSend}
          onClick={onSubmit}
        >
          <Send size={16} /> {submitLabel}
        </button>
        {value.trim() && !listening && (
          <button
            type="button"
            className="ghost-btn"
            disabled={disabled || listening}
            onClick={() => {
              onChange('')
              setVoiceError('')
            }}
          >
            Clear &amp; record again
          </button>
        )}
      </div>

      {value.trim() && !canSend && !listening && (
        <p className="muted tiny">
          {avatarBusyHint(disabled, submitDisabled)}
        </p>
      )}
    </div>
  )
}

function avatarBusyHint(disabled: boolean, submitDisabled: boolean) {
  if (submitDisabled) return 'Generating the next question…'
  if (disabled) return 'Wait for the avatar to finish speaking, then send your answer.'
  return 'Send when ready.'
}
