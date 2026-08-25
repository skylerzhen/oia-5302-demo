import type { InterviewTurn, Viseme } from '../types'
import type { TtsResult } from './localAi'
import { unlockAudioPlayback } from './audioUnlock'
import { primeLiveAvatarAudioPlayback, prepareLiveAvatarForSpeech } from './liveavatarPlayer'
import { speakInterviewLine } from './voiceSpeak'

/** UI phases — never combine LLM wait with TTS playback in one flag. */
export type InterviewAvatarUiPhase = 'idle' | 'connecting' | 'thinking' | 'speaking'

export interface SpeakTurnOptions {
  avatarMode: '2d' | 'heygen' | 'liveavatar'
  onViseme?: (viseme: Viseme) => void
  /** Default true — set false when transcript row was already appended. */
  addToTranscript?: boolean
  prefetchedTts?: TtsResult | null
  onTranscriptTurn?: (turn: InterviewTurn, add: boolean) => void
  signal?: AbortSignal
}

/**
 * Single-flight avatar speech controller (mirrors the old 2D path: one speak at a time).
 * LiveAvatar session connect is separate from speak; LLM "thinking" uses {@link think}.
 */
export class InterviewAvatarController {
  private speakLocked = false
  private abortController: AbortController | null = null
  private phase: InterviewAvatarUiPhase = 'idle'
  private onPhaseChange?: (phase: InterviewAvatarUiPhase) => void

  constructor(onPhaseChange?: (phase: InterviewAvatarUiPhase) => void) {
    this.onPhaseChange = onPhaseChange
  }

  getPhase() {
    return this.phase
  }

  private setPhase(next: InterviewAvatarUiPhase) {
    this.phase = next
    this.onPhaseChange?.(next)
  }

  stop() {
    this.abortController?.abort()
    this.abortController = null
    this.speakLocked = false
    this.setPhase('idle')
  }

  /** LiveAvatar: wait for video + session before the first line (connecting phase). */
  async connectLiveAvatar(
    avatarMode: '2d' | 'heygen' | 'liveavatar',
    timeoutMs = 20_000,
  ): Promise<boolean> {
    if (avatarMode !== 'liveavatar') return true
    this.setPhase('connecting')
    unlockAudioPlayback()
    primeLiveAvatarAudioPlayback()
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      return await prepareLiveAvatarForSpeech(timeoutMs)
    } finally {
      if (this.phase === 'connecting') this.setPhase('idle')
    }
  }

  /** LLM follow-up / scoring — does not overlap with {@link speakTurn}. */
  async think<T>(work: () => Promise<T>): Promise<T> {
    if (this.speakLocked) {
      throw new Error('Cannot think while avatar is speaking')
    }
    this.setPhase('thinking')
    try {
      return await work()
    } finally {
      if (this.phase === 'thinking') this.setPhase('idle')
    }
  }

  /**
   * Speak exactly one avatar line. Re-entrancy is rejected (no double opening).
   * Returns TTS mode string, or null if aborted / skipped.
   */
  async speakTurn(turn: InterviewTurn, options: SpeakTurnOptions): Promise<string | null> {
    if (this.speakLocked) {
      console.warn('[InterviewAvatar] ignored duplicate speak while line in flight')
      return null
    }

    this.speakLocked = true
    this.abortController?.abort()
    const controller = new AbortController()
    this.abortController = controller
    this.setPhase('speaking')

    unlockAudioPlayback()
    if (options.avatarMode === 'liveavatar') primeLiveAvatarAudioPlayback()

    const addToTranscript = options.addToTranscript !== false
    options.onTranscriptTurn?.(turn, addToTranscript)

    const signal = options.signal
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort, { once: true })

    try {
      const mode = await speakInterviewLine({
        text: turn.text,
        language: turn.language,
        onViseme: options.onViseme,
        signal: controller.signal,
        prefetchedTts: options.prefetchedTts,
      })
      return mode
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null
      throw error
    } finally {
      signal?.removeEventListener('abort', onAbort)
      if (this.abortController === controller) this.abortController = null
      this.speakLocked = false
      this.setPhase('idle')
    }
  }
}

export function interviewAvatarStatusMessage(
  phase: InterviewAvatarUiPhase,
  liveAvatarMode: boolean,
): string {
  switch (phase) {
    case 'connecting':
      return liveAvatarMode ? 'Connecting LiveAvatar video…' : 'Preparing interview…'
    case 'thinking':
      return 'Generating follow-up…'
    default:
      return ''
  }
}
