import { useCallback, useEffect, useRef, useState } from 'react'
import type { InterviewTurn, Viseme } from '../types'
import type { TtsResult } from '../lib/localAi'
import {
  InterviewAvatarController,
  interviewAvatarStatusMessage,
  type InterviewAvatarUiPhase,
} from '../lib/interviewAvatarController'
import { stopActiveSpeech } from '../lib/voiceSpeak'
import type { AvatarExpression } from '../components/Avatar2DInterviewer'

export function useInterviewAvatar(avatarMode: '2d' | 'heygen' | 'liveavatar') {
  const [uiPhase, setUiPhase] = useState<InterviewAvatarUiPhase>('idle')
  const [caption, setCaption] = useState('')
  const [expression, setExpression] = useState<AvatarExpression>('neutral')
  const [viseme, setViseme] = useState<Viseme>('rest')

  const controllerRef = useRef<InterviewAvatarController | null>(null)
  if (!controllerRef.current) {
    controllerRef.current = new InterviewAvatarController(setUiPhase)
  }

  useEffect(() => () => controllerRef.current?.stop(), [])

  const stop = useCallback(() => {
    controllerRef.current?.stop()
    stopActiveSpeech()
    setViseme('rest')
  }, [])

  const speakTurn = useCallback(async (
    turn: InterviewTurn,
    options?: {
      addToTranscript?: boolean
      prefetchedTts?: TtsResult | null
      onTranscriptTurn?: (turn: InterviewTurn, add: boolean) => void
      signal?: AbortSignal
    },
  ) => {
    setCaption(turn.text)
    setExpression(turn.expression ?? 'neutral')
    setViseme('rest')
    return controllerRef.current!.speakTurn(turn, {
      avatarMode,
      onViseme: setViseme,
      addToTranscript: options?.addToTranscript,
      prefetchedTts: options?.prefetchedTts,
      onTranscriptTurn: options?.onTranscriptTurn,
      signal: options?.signal,
    })
  }, [avatarMode])

  const connectLiveAvatar = useCallback(
    () => controllerRef.current!.connectLiveAvatar(avatarMode),
    [avatarMode],
  )

  const think = useCallback(
    <T,>(work: () => Promise<T>) => controllerRef.current!.think(work),
    [],
  )

  const statusMessage = interviewAvatarStatusMessage(uiPhase, avatarMode === 'liveavatar')

  return {
    uiPhase,
    isConnecting: uiPhase === 'connecting',
    isThinking: uiPhase === 'thinking',
    isSpeaking: uiPhase === 'speaking',
    isBusy: uiPhase !== 'idle',
    caption,
    setCaption,
    expression,
    setExpression,
    viseme,
    statusMessage,
    speakTurn,
    connectLiveAvatar,
    think,
    stop,
  }
}
