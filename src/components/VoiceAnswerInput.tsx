import { Mic, MicOff, Keyboard } from 'lucide-react'
import { useState } from 'react'
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
  const asrSupported = isBrowserAsrSupported()

  async function startListening() {
    if (disabled || listening || !asrSupported) return
    setVoiceError('')
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

      {value && (
        <div className="voice-transcript-preview" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <span className="muted tiny">Live transcript</span>
          <p>{value}</p>
        </div>
      )}

      {(showTyping || !asrSupported) && (
        <textarea
          dir={language === 'ar' ? 'rtl' : 'ltr'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}

      {voiceError && <p className="danger-text">{voiceError}</p>}

      <button
        type="button"
        className="primary"
        disabled={submitDisabled || !value.trim() || disabled || listening}
        onClick={onSubmit}
      >
        {submitLabel}
      </button>
    </div>
  )
}
