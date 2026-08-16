import { CheckCircle2, Mic, Keyboard, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { isBrowserAsrSupported, startSpeechCapture, type SpeechCaptureSession } from '../lib/browserAsr'
import { startPcm16Capture, type PcmCaptureSession } from '../lib/capturePcm16'
import { unlockAudioPlayback } from '../lib/audioUnlock'
import { localAi } from '../lib/localAi'

interface VoiceAnswerInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  onSubmit: () => void
  submitLabel: string
  submitDisabled?: boolean
  asrProvider?: string
}

type CaptureSession = PcmCaptureSession | SpeechCaptureSession

export function VoiceAnswerInput({
  value,
  onChange,
  disabled = false,
  placeholder,
  onSubmit,
  submitLabel,
  submitDisabled = false,
  asrProvider = 'browser',
}: VoiceAnswerInputProps) {
  const [listening, setListening] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [showTyping, setShowTyping] = useState(false)
  const sendRef = useRef<HTMLButtonElement | null>(null)
  const sessionRef = useRef<CaptureSession | null>(null)
  const useAzureAsr = asrProvider === 'azure'
  const asrSupported = useAzureAsr || isBrowserAsrSupported()
  const canSend = Boolean(value.trim()) && !disabled && !listening && !processing && !submitDisabled

  useEffect(() => {
    if (!value.trim() || listening || processing) return
    sendRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [listening, processing, value])

  useEffect(() => () => {
    sessionRef.current?.cancel()
    sessionRef.current = null
  }, [])

  function startListening() {
    if (disabled || listening || processing || !asrSupported) return
    unlockAudioPlayback()
    setVoiceError('')
    onChange('')
    setListening(true)

    try {
      sessionRef.current = useAzureAsr ? startPcm16Capture() : startSpeechCapture()
    } catch (error) {
      setListening(false)
      const message = error instanceof Error ? error.message : 'Voice capture failed'
      setVoiceError(message)
    }
  }

  function cancelListening() {
    sessionRef.current?.cancel()
    sessionRef.current = null
    setListening(false)
    setProcessing(false)
  }

  async function finishListening() {
    const session = sessionRef.current
    if (!session || !listening || processing) return

    unlockAudioPlayback()
    setProcessing(true)
    try {
      let transcript = ''
      if (useAzureAsr) {
        const capture = await (session as PcmCaptureSession).finish()
        const result = await localAi.transcribe({
          pcmBase64: capture.pcmBase64,
          sampleRate: capture.sampleRate,
        })
        transcript = result.transcript
      } else {
        transcript = await (session as SpeechCaptureSession).finish()
        try {
          await localAi.transcribe({ transcript })
        } catch {
          // Browser ASR already captured transcript; server logging is optional.
        }
      }
      onChange(transcript)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Voice capture failed'
      setVoiceError(message)
    } finally {
      sessionRef.current = null
      setListening(false)
      setProcessing(false)
    }
  }

  return (
    <div className="voice-answer stack">
      <div className="voice-answer-toolbar">
        {!listening ? (
          <button
            type="button"
            className="voice-mic-btn"
            disabled={disabled || processing || !asrSupported}
            onClick={startListening}
          >
            <Mic size={16} />
            {useAzureAsr ? 'Answer with Azure mic' : 'Answer with microphone'}
          </button>
        ) : (
          <button
            type="button"
            className="primary voice-done-btn"
            disabled={processing}
            onClick={() => { void finishListening() }}
          >
            <CheckCircle2 size={16} />
            {processing ? 'Processing…' : 'Done speaking'}
          </button>
        )}
        <button
          type="button"
          className="ghost-btn"
          onClick={() => setShowTyping((current) => !current)}
          disabled={listening}
        >
          <Keyboard size={16} /> {showTyping ? 'Hide typing' : 'Type instead'}
        </button>
        {listening && (
          <button
            type="button"
            className="ghost-btn"
            disabled={processing}
            onClick={cancelListening}
          >
            Cancel
          </button>
        )}
      </div>

      {!asrSupported && (
        <p className="muted tiny">Microphone ASR needs Chrome/Edge/Safari. Use typing fallback below.</p>
      )}

      {useAzureAsr && !listening && (
        <p className="muted tiny">Azure Speech ASR · en-US · server-side recognition</p>
      )}

      {listening && (
        <p className="muted tiny">Speak your answer, then click <strong>Done speaking</strong> when finished.</p>
      )}

      {value && !listening && !processing && (
        <div className="voice-transcript-preview">
          <span className="muted tiny">Your answer (review before sending)</span>
          <p>{value}</p>
        </div>
      )}

      {(showTyping || !asrSupported) && (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled || listening || processing}
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
        {value.trim() && !listening && !processing && (
          <button
            type="button"
            className="ghost-btn"
            disabled={disabled}
            onClick={() => {
              onChange('')
              setVoiceError('')
            }}
          >
            Clear &amp; record again
          </button>
        )}
      </div>

      {value.trim() && !canSend && !listening && !processing && (
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
