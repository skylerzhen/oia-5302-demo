import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { CheckCircle2, ChevronUp, FileUp, Play, Upload } from 'lucide-react'
import { useDemo } from '../context/DemoContext'
import { AvatarPanel } from './AvatarPanel'
import { VoiceAnswerInput } from './VoiceAnswerInput'
import { EvidenceModal } from './EvidenceModal'
import { SourceDocumentModal } from './SourceDocumentModal'
import { CvReviewPanel } from './CvReviewPanel'
import type { CvEvidenceLocateRequest, CvPreviewKind } from './CvSourcePreview'
import { CvProfilePanel } from './CvProfilePanel'
import { Layout } from './Layout'
import { CV_UPLOAD_SAMPLES, CV_V2_DIFF } from '../data/candidates'
import { resolveSampleProfileId } from '../data/cvParseProfiles'
import { FINANCE_JOB } from '../data/job'
import { MCQ_QUESTIONS, INTERVIEW_PRESET } from '../data/questions'
import { CANDIDATE_STEPS } from '../lib/demo'
import { localAi, type FollowUpResult } from '../lib/localAi'
import { preloadSpeechVoices, setHeyGenAvatarEnabled, setLiveAvatarEnabled, warmInterviewSpeech } from '../lib/voiceSpeak'
import { installLiveAvatarLifecycleGuards, stopLiveAvatarSession } from '../lib/liveavatarPlayer'
import { unlockAudioPlayback } from '../lib/audioUnlock'
import { useInterviewAvatar } from '../hooks/useInterviewAvatar'
import { controlledViewUrl } from '../lib/controlledDocUrl'
import { runCvUploadFlow, type CvUploadProgress, type CvUploadResult } from '../lib/cvUploadFlow'
import { resolveCvSourceUrl } from '../lib/cvSourceUrl'
import {
  buildImprovementTips,
  buildInterviewFollowUp,
  countCandidateAnswers,
  DEFAULT_INTERVIEW_CLOSING,
  getInterviewUiPhase,
  interviewAnswerProgress,
  shouldForceInterviewClosing,
} from '../lib/matching'
import { getPrimaryMatch, loadLlmMatches } from '../lib/llmMatching'
import { profileFieldsKey } from '../lib/profileFieldsKey'
import type { CandidateMatchWithTips } from '../lib/matching'
import { scrollPageToTop } from '../lib/scrollPageToTop'
import { scrollToC1RevealAnchor, pulseRevealElement } from '../lib/smoothScroll'
import type { CandidateStepId, FieldStatus, InterviewTurn, ProfileTagGroup, WorkExperienceEntry } from '../types'

const UPLOAD_STAGE_TRACK = [
  { id: 'reading', label: 'Read' },
  { id: 'uploading', label: 'Upload' },
  { id: 'parsing', label: 'Extract' },
  { id: 'mapping', label: 'Map' },
  { id: 'done', label: 'Review' },
] as const

type C1ReviewAnim = 'hidden' | 'entering' | 'visible'

function uploadStageIndex(stage: CvUploadProgress['stage']) {
  if (stage === 'idle' || stage === 'error') return -1
  return UPLOAD_STAGE_TRACK.findIndex((entry) => entry.id === stage)
}

function hasCvUploadEvidence(
  fields: { evidence?: string; source?: string; status: FieldStatus }[],
  uploadedSamples: string[],
  workHistory: WorkExperienceEntry[],
) {
  if (uploadedSamples.length > 0) return true
  if (workHistory.length > 0) return true
  return fields.some((f) => f.status !== 'missing' && Boolean(f.evidence?.trim() || f.source?.trim()))
}

function profileSubmitBlockReason(
  fields: { key: string; label: string; value: string; status: FieldStatus }[],
  profileFromCv: boolean,
  uploadedSamples: string[],
  workHistory: WorkExperienceEntry[],
): string | null {
  if (!profileFromCv) return 'Upload a CV and click Apply to profile in the extraction preview.'
  if (!hasCvUploadEvidence(fields, uploadedSamples, workHistory)) {
    return 'Open the extraction preview after upload and click Apply to profile.'
  }
  const emptyRequired = fields.filter((f) => f.status !== 'missing' && !f.value.trim())
  if (emptyRequired.length > 0) {
    return `Fill in: ${emptyRequired.map((f) => f.label).join(', ')}`
  }
  return null
}

export function CandidatePortal() {
  const {
    offline, setOffline, log, integrationSyncs, syncIntegration,
    pipeline, setPipeline,
    fields, setFields,
    profileSkills, setProfileSkills,
    profileLanguages, setProfileLanguages,
    profileWorkHistory, setProfileWorkHistory,
    interviewTurns, setInterviewTurns,
    assessmentScore, setAssessmentScore,
    candidateStep: step, setCandidateStep: setStep, logout,
  } = useDemo()

  const [uploadedSamples, setUploadedSamples] = useState<string[]>([])
  const [draftSaved, setDraftSaved] = useState(false)
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({})
  const [examSubmitted, setExamSubmitted] = useState(false)
  const [examBreakdown, setExamBreakdown] = useState<{ id: string; correct: boolean }[]>([])
  const [examStartedAt, setExamStartedAt] = useState<number | null>(null)
  const [examDurationSec, setExamDurationSec] = useState(0)
  const [interviewStarted, setInterviewStarted] = useState(() => interviewTurns.length > 0)
  const [interviewClosingReady, setInterviewClosingReady] = useState(false)
  const [candidateAnswerEn, setCandidateAnswerEn] = useState('')
  const [supportivePrompt, setSupportivePrompt] = useState('')
  const [speechStatus, setSpeechStatus] = useState({ asr: 'browser' })
  const [avatarMode, setAvatarMode] = useState<'2d' | 'heygen' | 'liveavatar'>('2d')
  const avatar = useInterviewAvatar(avatarMode)
  const [llmError, setLlmError] = useState('')
  const [matchLoading, setMatchLoading] = useState(false)
  const [llmMatch, setLlmMatch] = useState<CandidateMatchWithTips | null>(null)
  const [scanImported, setScanImported] = useState(false)
  const [profileFromCv, setProfileFromCv] = useState(() => fields.some((f) => f.value.trim()))
  const [appliedCvFileName, setAppliedCvFileName] = useState('')
  const [uploadExpanded, setUploadExpanded] = useState(false)
  const [parsePreview, setParsePreview] = useState<CvUploadResult | null>(null)
  const [appliedSourceUrl, setAppliedSourceUrl] = useState('')
  const [appliedPreviewUrl, setAppliedPreviewUrl] = useState('')
  const [appliedPreviewKind, setAppliedPreviewKind] = useState<CvPreviewKind>('html')
  const [evidenceLocate, setEvidenceLocate] = useState<CvEvidenceLocateRequest | null>(null)
  const [c1UploadExiting, setC1UploadExiting] = useState(false)
  const [c1ReviewAnim, setC1ReviewAnim] = useState<C1ReviewAnim>(() => (
    fields.some((field) => field.value.trim()) ? 'visible' : 'hidden'
  ))
  const [submissionReveal, setSubmissionReveal] = useState(false)
  const previewBlobRef = useRef<string | null>(null)
  const parsePreviewKeyRef = useRef<string | null>(null)
  const [lastUploadInput, setLastUploadInput] = useState<{
    sampleId: string
    label: string
    filePath?: string
    isScannedPdf?: boolean
  } | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [reviewReady, setReviewReady] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadProgress, setUploadProgress] = useState<CvUploadProgress>({ stage: 'idle', progress: 0, message: '' })
  const [evidenceModal, setEvidenceModal] = useState<{ title: string; evidence: string; source?: string } | null>(null)
  const [sourceDoc, setSourceDoc] = useState<{ title: string; url: string } | null>(null)
  const confirmFieldsRef = useRef<HTMLDivElement | null>(null)
  const submissionReviewRef = useRef<HTMLElement | null>(null)
  const submissionActionsRef = useRef<HTMLDivElement | null>(null)
  const c3SectionRef = useRef<HTMLElement | null>(null)
  const stepTopRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function revokePreviewBlob() {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current)
      previewBlobRef.current = null
    }
  }

  function adoptPreviewBlob(url?: string) {
    revokePreviewBlob()
    if (url?.startsWith('blob:')) previewBlobRef.current = url
  }

  function scrollC1ToBottom(anchor?: HTMLElement | null) {
    return scrollToC1RevealAnchor(anchor ?? submissionActionsRef.current)
  }

  useEffect(() => () => revokePreviewBlob(), [])

  function stopInterviewSpeech() {
    avatar.stop()
  }

  function appendAvatarTurn(turn: InterviewTurn, add: boolean) {
    if (add) setInterviewTurns((prev) => [...prev, turn])
  }

  const interviewPhase = getInterviewUiPhase(interviewTurns, pipeline.interviewCompleted, interviewClosingReady)
  const interviewProgress = interviewAnswerProgress(interviewTurns)
  const match = llmMatch
  const fieldsKey = useMemo(() => profileFieldsKey(fields), [fields])

  useEffect(() => {
    if (step !== 'C5') return

    let active = true
    setMatchLoading(true)
    loadLlmMatches(fields)
      .then(({ matches, mode }) => {
        if (!active) return
        const primary = getPrimaryMatch(matches)
        setLlmMatch(primary ?? null)
        if (primary) {
          log('System', 'LLM CV–JD match scored', `${primary.totalScore}% · ${primary.matchedCount}/${primary.totalDimensions} dimensions · mode ${mode}`, 'C5')
        }
      })
      .catch((error: Error) => {
        if (!active) return
        setLlmMatch(null)
        log('System', 'LLM match failed', error.message, 'C5')
      })
      .finally(() => {
        if (active) setMatchLoading(false)
      })

    return () => { active = false }
  }, [fieldsKey, step])

  useEffect(() => {
    if (step === 'C3' && !examSubmitted && !examStartedAt) setExamStartedAt(Date.now())
  }, [examStartedAt, examSubmitted, step])

  useEffect(() => {
    if (step === 'C4') return
    stopInterviewSpeech()
  }, [step])

  useEffect(() => {
    return () => stopInterviewSpeech()
  }, [])

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      scrollPageToTop()
      stepTopRef.current?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(raf)
  }, [step])

  useEffect(() => {
    if (step !== 'C4' || pipeline.interviewCompleted) return
    setInterviewStarted(interviewTurns.length > 0)
  }, [step, pipeline.interviewCompleted, interviewTurns.length])

  useEffect(() => {
    if (!examSubmitted) return
    requestAnimationFrame(() => scrollPageToTop())
  }, [examSubmitted])

  useEffect(() => {
    if (step !== 'C3' && step !== 'C4') return
    warmInterviewSpeech()
  }, [step])

  useEffect(() => {
    if (avatarMode !== 'liveavatar') return
    installLiveAvatarLifecycleGuards()
  }, [avatarMode])

  useEffect(() => {
    if (step !== 'C4' || avatarMode !== 'liveavatar') {
      if (avatarMode === 'liveavatar') void stopLiveAvatarSession()
      return
    }
    return () => {
      void stopLiveAvatarSession()
    }
  }, [step, avatarMode])

  useEffect(() => {
    if (!pipeline.interviewCompleted || avatarMode !== 'liveavatar') return
    void stopLiveAvatarSession()
  }, [pipeline.interviewCompleted, avatarMode])

  useEffect(() => {
    preloadSpeechVoices()
    localAi.status()
      .then((status) => {
        const provider = status.speech?.avatarProvider
        if (provider === 'liveavatar') {
          setAvatarMode('liveavatar')
          setLiveAvatarEnabled(true)
          setHeyGenAvatarEnabled(false)
        } else {
          const heygen = provider === 'heygen' || status.avatar?.configured === true
          setAvatarMode(heygen ? 'heygen' : '2d')
          setHeyGenAvatarEnabled(heygen)
          setLiveAvatarEnabled(false)
        }
        setSpeechStatus({
          asr: status.speech?.asrProvider ?? 'browser',
        })
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!reviewReady) {
      setSubmissionReveal(false)
      return
    }

    setSubmissionReveal(true)

    let cancelled = false
    let cancelScroll: (() => void) | undefined
    let attempts = 0

    const startScroll = () => {
      if (cancelled) return
      const anchor = submissionActionsRef.current
      if (anchor || attempts >= 24) {
        cancelScroll = scrollC1ToBottom(anchor)
        window.setTimeout(() => {
          pulseRevealElement(submissionReviewRef.current, 'submission-review--revealed')
        }, 700)
        return
      }
      attempts += 1
      requestAnimationFrame(startScroll)
    }

    startScroll()
    return () => {
      cancelled = true
      cancelScroll?.()
    }
  }, [reviewReady])

  useEffect(() => {
    if (!parsePreview) {
      if (profileFromCv) setC1ReviewAnim('visible')
      return
    }

    const revealKey = `${parsePreview.sampleId}:${parsePreview.fileName}`
    if (parsePreviewKeyRef.current === revealKey) return
    parsePreviewKeyRef.current = revealKey

    const firstReveal = !profileFromCv
    if (firstReveal) {
      setC1UploadExiting(true)
      setC1ReviewAnim('entering')
      const exitTimer = window.setTimeout(() => setC1UploadExiting(false), 540)
      const enterTimer = window.setTimeout(() => {
        setC1ReviewAnim('visible')
        scrollC1ToBottom(confirmFieldsRef.current)
      }, 300)
      return () => {
        window.clearTimeout(exitTimer)
        window.clearTimeout(enterTimer)
      }
    }

    setC1ReviewAnim('entering')
    const timer = window.setTimeout(() => {
      setC1ReviewAnim('visible')
      scrollC1ToBottom(confirmFieldsRef.current)
    }, 100)
    return () => window.clearTimeout(timer)
  }, [parsePreview, profileFromCv])

  useEffect(() => {
    if (step !== 'C1') {
      setC1UploadExiting(false)
      setC1ReviewAnim('hidden')
      setSubmissionReveal(false)
      parsePreviewKeyRef.current = null
    }
  }, [step])

  async function processCvUpload(input: {
    sampleId: string
    label: string
    filePath?: string
    file?: File
    isScannedPdf?: boolean
  }) {
    if (uploadBusy) return
    if (!profileFromCv && uploadedSamples.includes(input.sampleId)) return
    setLastUploadInput({
      sampleId: input.sampleId,
      label: input.label,
      filePath: input.filePath,
      isScannedPdf: input.isScannedPdf,
    })
    if (profileFromCv) setUploadExpanded(true)
    setUploadBusy(true)
    setUploadError('')
    setReviewReady(false)
    setUploadProgress({ stage: 'reading', progress: 0, message: 'Reading document…' })
    try {
      const result = await runCvUploadFlow(
        {
          sampleId: input.sampleId,
          filePath: input.filePath,
          file: input.file,
          fileName: input.file?.name ?? input.label.split(' · ')[0] ?? input.label,
          isScannedPdf: input.isScannedPdf,
        },
        setUploadProgress,
      )
      if (!profileFromCv) {
        setC1UploadExiting(true)
        setC1ReviewAnim('entering')
      } else {
        setC1ReviewAnim('entering')
      }
      setParsePreview(result)
      adoptPreviewBlob(result.previewBlobUrl)
      log('System', 'LLM CV parsing invoked', `${result.fileName}; ${result.fileSize} bytes; mode: ${result.mode}`, 'C1')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      setUploadError(message)
      setUploadProgress((current) => (
        current.stage === 'error'
          ? current
          : { stage: 'error', progress: 0, message }
      ))
      log('System', 'CV upload failed', message, 'C1')
    } finally {
      setUploadBusy(false)
      window.setTimeout(() => {
        setUploadProgress((current) => (current.stage === 'done' ? { stage: 'idle', progress: 0, message: '' } : current))
      }, 2800)
    }
  }

  function handleLocalCvUpload(files: FileList | null) {
    const file = files?.[0]
    if (!file || uploadBusy) return
    const normalized = file.name.toLowerCase()
    const isScannedPdf = normalized.includes('noor') || normalized.includes('scan')
    const sampleId = resolveSampleProfileId(file.name)
      ?? (isScannedPdf ? 'pdf-scan' : normalized.endsWith('.docx') ? 'docx-en' : `local-${normalized}`)
    void processCvUpload({ sampleId, label: file.name, file, isScannedPdf })
  }

  function acceptParsePreview() {
    if (!parsePreview) return
    setFields(parsePreview.fields)
    setProfileSkills(parsePreview.skills)
    setProfileLanguages(parsePreview.languages)
    setProfileWorkHistory(parsePreview.workHistory)
    setScanImported(parsePreview.isScannedPdf)
    setProfileFromCv(true)
    setAppliedCvFileName(parsePreview.fileName)
    setAppliedSourceUrl(parsePreview.sourceUrl)
    setAppliedPreviewUrl(parsePreview.previewUrl)
    setAppliedPreviewKind(parsePreview.previewKind)
    adoptPreviewBlob(parsePreview.previewBlobUrl)
    setEvidenceLocate(null)
    setUploadExpanded(false)
    setUploadedSamples((current) => (
      current.includes(parsePreview.sampleId) ? current : [...current, parsePreview.sampleId]
    ))
    log(
      'Candidate',
      parsePreview.isScannedPdf ? 'Scanned CV accepted' : 'CV accepted',
      `${parsePreview.fileName}; ${parsePreview.fields.filter((f) => f.status !== 'missing').length} fields applied`,
      'C1',
    )
    setParsePreview(null)
    parsePreviewKeyRef.current = null
  }

  function cancelParsePreview() {
    setC1ReviewAnim('hidden')
    window.setTimeout(() => {
      setParsePreview(null)
      parsePreviewKeyRef.current = null
      revokePreviewBlob()
      setEvidenceLocate(null)
      setUploadProgress({ stage: 'idle', progress: 0, message: '' })
    }, 340)
  }

  function updateParsePreviewScalar(key: string, value: string) {
    setParsePreview((current) => {
      if (!current) return current
      return {
        ...current,
        fields: current.fields.map((field) => (
          field.key === key
            ? {
                ...field,
                value,
                status: field.status === 'missing' && value.trim() ? 'parsed' : field.status,
              }
            : field
        )),
      }
    })
  }

  function updateParsePreviewSkills(items: string[]) {
    setParsePreview((current) => (
      current ? { ...current, skills: { ...current.skills, items } } : current
    ))
  }

  function updateParsePreviewLanguages(items: string[]) {
    setParsePreview((current) => (
      current ? { ...current, languages: { ...current.languages, items } } : current
    ))
  }

  function handleReparseCv() {
    if (!lastUploadInput || uploadBusy) return
    void processCvUpload(lastUploadInput)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)
    handleLocalCvUpload(event.dataTransfer.files)
  }

  function interviewCandidateProfile() {
    const pick = (key: string) => fields.find((field) => field.key === key)?.value?.trim() ?? ''
    return {
      name: pick('name'),
      experience: pick('experience'),
      education: pick('educationLevel'),
      certification: pick('certification'),
      companyName: pick('companyName'),
    }
  }

  async function generateAvatarFollowUp(answer: string, priorTurns = interviewTurns): Promise<FollowUpResult> {
    const candidateTurnCount = priorTurns.filter((turn) => turn.speaker === 'candidate').length
    const trimmedTurns = priorTurns.slice(-8).map((turn) => ({
      speaker: turn.speaker,
      language: turn.language,
      text: turn.text.slice(0, 400),
    }))
    try {
      const result = await localAi.followUp({
        answer: answer.slice(0, 1200),
        priorTurns: trimmedTurns,
        candidateProfile: interviewCandidateProfile(),
      })
      log(
        'System',
        result.mode === 'model'
          ? result.action === 'closing' ? 'LLM interview closing' : 'LLM follow-up generated'
          : 'Follow-up template',
        `${result.mode}; action=${result.action ?? 'follow_up'}; grounded on: ${result.evidencePhrase ?? answer.slice(0, 40)}`,
        'C4',
      )
      return {
        ...result,
        action: result.action ?? 'follow_up',
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'timeout'
      const fallback = buildInterviewFollowUp(answer, Math.max(0, candidateTurnCount - 1))
      log('System', 'LLM follow-up fallback', `${message} · using local template`, 'C4')
      setLlmError(`LLM follow-up unavailable (${message}). Using a local template — check audit log.`)
      return {
        mode: 'adapter-fallback',
        text: fallback,
        evidencePhrase: answer.trim().split(/\s+/).slice(0, 8).join(' '),
        action: 'follow_up',
      }
    }
  }

  async function deliverInterviewClosing(closingText = DEFAULT_INTERVIEW_CLOSING) {
    const turn: InterviewTurn = {
      id: nextTurnId('close'),
      speaker: 'avatar',
      language: 'en',
      text: closingText,
      expression: 'supportive',
    }
    const mode = await avatar.speakTurn(turn, { onTranscriptTurn: appendAvatarTurn })
    if (mode) {
      log('System', 'Avatar TTS', `closing; mode: ${mode}`, 'C4')
    }
    setInterviewClosingReady(true)
    log('System', 'Adaptive interview closing', `${countCandidateAnswers(interviewTurns)} answers · orchestrator end`, 'C4')
  }

  async function handleCandidateAnswerSubmit(ans: string) {
    unlockAudioPlayback()
    setLlmError('')

    try {
      await avatar.think(async () => {
        const candidateTurn = {
          id: nextTurnId('c-en'),
          speaker: 'candidate' as const,
          language: 'en' as const,
          text: ans,
        }
        const updatedTurns = [...interviewTurns, candidateTurn]
        setInterviewTurns(updatedTurns)
        setCandidateAnswerEn('')
        const answerCount = countCandidateAnswers(updatedTurns)

        if (shouldForceInterviewClosing(answerCount)) {
          await deliverInterviewClosing()
          return
        }

        const followUp = await generateAvatarFollowUp(ans, updatedTurns)
        if (followUp.mode === 'model') setLlmError('')

        if (followUp.action === 'closing') {
          await deliverInterviewClosing(followUp.text)
          return
        }

        await deliverAvatarFollowUp(followUp)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'LLM request failed'
      setLlmError(message)
      log('System', 'LLM request failed', message, 'C4')
    }
  }

  async function submitInterviewAndContinue() {
    stopInterviewSpeech()
    setPipeline({ interviewCompleted: true })
    syncIntegration('jadarah.interviewRecord', 'C4', `${interviewTurns.length} turns recorded`)
    log('Candidate', 'Interview completed', 'Recording saved for HR review', 'C4')
    setStep('C5')
  }

  async function deliverAvatarFollowUp(followUp: FollowUpResult) {
    const turn: InterviewTurn = {
      id: nextTurnId('fu'),
      speaker: 'avatar',
      language: 'en',
      text: followUp.text,
      expression: 'curious',
      followUpMeta: {
        mode: followUp.mode === 'model' ? 'model' : 'adapter-fallback',
        evidencePhrase: followUp.evidencePhrase,
      },
    }
    setInterviewTurns((prev) => [...prev, turn])
    const prefetchedTts = avatarMode === 'liveavatar'
      ? null
      : await localAi.synthesize({ text: followUp.text })
    const mode = await avatar.speakTurn(turn, {
      addToTranscript: false,
      prefetchedTts,
      onTranscriptTurn: appendAvatarTurn,
    })
    if (mode) {
      log('System', 'Avatar TTS', `follow-up; mode: ${mode}`, 'C4')
    }
  }

  function nextTurnId(prefix: string) {
    return `${prefix}-${Date.now()}`
  }

  function confirmAllFields() {
    setFields((prev) => prev.map((f) => ({
      ...f,
      value: f.status === 'missing' && !f.value.trim() ? '' : f.value,
      status: f.value.trim() ? (f.status === 'missing' ? 'parsed' as const : f.status) : 'missing' as const,
    })))
    setProfileSkills((prev) => ({
      ...prev,
      status: prev.items.length ? prev.status : 'missing',
    }))
    setProfileLanguages((prev) => ({
      ...prev,
      status: prev.items.length ? prev.status : 'missing',
    }))
    log('Candidate', 'Fields confirmed', 'Parsed values accepted; missing fields left blank', 'C1')
  }

  const canSubmitProfile =
    profileFromCv &&
    hasCvUploadEvidence(fields, uploadedSamples, profileWorkHistory) &&
    fields.filter((f) => f.status !== 'missing').every((f) => f.value.trim())

  const submitBlockReason = profileSubmitBlockReason(fields, profileFromCv, uploadedSamples, profileWorkHistory)

  function updateScalarField(key: string, value: string) {
    setFields((prev) => prev.map((f) => f.key === key
      ? { ...f, value, status: value.trim() ? (f.status === 'missing' ? 'parsed' : f.status) : 'missing' }
      : f))
  }

  function updateTagGroup(setter: Dispatch<SetStateAction<ProfileTagGroup>>, items: string[]) {
    setter((prev) => ({
      ...prev,
      items,
      status: items.length ? (prev.status === 'missing' ? 'parsed' : prev.status) : 'missing',
    }))
  }

  const steps = CANDIDATE_STEPS.map((s) => {
    const locked =
      (s.id === 'C2' && !pipeline.profileSubmitted) ||
      (s.id === 'C3' && !pipeline.diffAccepted) ||
      (s.id === 'C4' && !pipeline.assessmentSubmitted) ||
      (s.id === 'C5' && !pipeline.interviewCompleted) ||
      (s.id === 'C6' && !pipeline.interviewCompleted)
    const lockNote =
      s.id === 'C2' ? 'Submit profile in C1' :
      s.id === 'C3' ? 'Accept CV update in C2' :
      s.id === 'C4' ? 'Finish assessment in C3' :
      s.id === 'C5' || s.id === 'C6' ? 'Submit interview in C4' :
      undefined
    return { ...s, locked, lockNote: locked ? lockNote : undefined }
  })

  function interruptAvatar() {
    if (!avatar.isSpeaking) return
    avatar.stop()
    avatar.setCaption('I have paused. Please continue when you are ready.')
    avatar.setExpression('supportive')
    log('Candidate', 'Avatar interrupted', 'Candidate interrupted the avatar; interview safely paused', 'C4')
  }

  function requestSupportivePause() {
    setSupportivePrompt('Waiting for three seconds before the supportive response…')
    window.setTimeout(() => {
      avatar.setCaption('Take your time. Please share the example when you are ready.')
      avatar.setExpression('supportive')
      setSupportivePrompt('Supportive pause displayed and recorded.')
      log('System', 'Supportive pause', 'Candidate pause of three seconds triggered supportive interview response', 'C4')
    }, 3000)
  }

  const showCompactUpload = profileFromCv && !uploadExpanded && !uploadBusy

  function renderCvUploadControls() {
    if (showCompactUpload) {
      return (
        <div className="c1-upload-compact">
          <div className="c1-upload-compact-main">
            <CheckCircle2 size={18} className="ok" aria-hidden />
            <div>
              <strong>CV applied</strong>
              <span className="muted tiny">{appliedCvFileName || 'Profile loaded from CV'}</span>
            </div>
          </div>
          <button type="button" className="c1-upload-compact-action" onClick={() => setUploadExpanded(true)}>
            Change CV
          </button>
        </div>
      )
    }

    return (
      <>
        <div className="c1-upload-expanded-head">
          <div>
            <h3>Upload CV</h3>
            {!profileFromCv && (
              <p className="muted tiny">Drop a PDF/DOCX here or pick a demo sample. Fields appear only after you confirm the extraction.</p>
            )}
            {profileFromCv && (
              <p className="muted tiny">Replace the current CV or try another demo sample.</p>
            )}
          </div>
          {profileFromCv && (
            <button type="button" className="c1-upload-collapse" onClick={() => setUploadExpanded(false)}>
              <ChevronUp size={16} aria-hidden /> Hide
            </button>
          )}
        </div>

        <div
          className={`cv-drop-zone ${dragActive ? 'active' : ''} ${uploadBusy ? 'busy' : ''} ${profileFromCv ? 'cv-drop-zone-compact' : ''}`}
          onDragEnter={(event) => { event.preventDefault(); setDragActive(true) }}
          onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
          onDragLeave={(event) => {
            event.preventDefault()
            if (event.currentTarget.contains(event.relatedTarget as Node)) return
            setDragActive(false)
          }}
          onDrop={handleDrop}
          onClick={() => !uploadBusy && fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              if (!uploadBusy) fileInputRef.current?.click()
            }
          }}
          role="button"
          tabIndex={0}
        >
          <FileUp size={profileFromCv ? 22 : 28} aria-hidden />
          <strong>{dragActive ? 'Drop to upload' : profileFromCv ? 'Drop or browse to replace CV' : 'Drag & drop your CV here'}</strong>
          <span>PDF, DOC, DOCX, PNG, JPG</span>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
            disabled={uploadBusy}
            onChange={(event) => handleLocalCvUpload(event.target.files)}
          />
        </div>

        {(uploadBusy || uploadProgress.stage === 'done' || uploadProgress.stage === 'error' || uploadError) && (
          <div className={`upload-progress ${uploadProgress.stage === 'idle' && uploadError ? 'error' : uploadProgress.stage}`}>
            <ol className="upload-stage-track" aria-label="Upload progress">
              {UPLOAD_STAGE_TRACK.map((stage, index) => {
                const activeIndex = uploadStageIndex(uploadProgress.stage)
                const done = activeIndex > index || uploadProgress.stage === 'done'
                const active = activeIndex === index
                return (
                  <li key={stage.id} className={`upload-stage-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                    <span className="upload-stage-dot" aria-hidden />
                    <span>{stage.label}</span>
                  </li>
                )
              })}
            </ol>
            <div className="upload-progress-head">
              <strong>
                {uploadProgress.stage === 'reading' && 'Reading document'}
                {uploadProgress.stage === 'uploading' && 'Uploading'}
                {uploadProgress.stage === 'parsing' && 'Extracting'}
                {uploadProgress.stage === 'mapping' && 'Normalizing'}
                {uploadProgress.stage === 'done' && 'Ready for review'}
                {(uploadProgress.stage === 'error' || uploadError) && 'Upload failed'}
              </strong>
              <span>{uploadProgress.progress}%</span>
            </div>
            <div className="upload-progress-bar"><span style={{ width: `${uploadProgress.progress}%` }} /></div>
            <p className="danger-text">{uploadError || uploadProgress.message}</p>
          </div>
        )}

        <p className="muted tiny sample-heading">Demo samples</p>
        <ul className="upload-list">
          {CV_UPLOAD_SAMPLES.map((sample) => (
            <li key={sample.id}>
              <button
                type="button"
                disabled={uploadBusy || uploadedSamples.includes(sample.id)}
                onClick={() => {
                  void processCvUpload({
                    sampleId: sample.id,
                    label: sample.label,
                    filePath: sample.filePath,
                    isScannedPdf: sample.id === 'pdf-scan',
                  })
                }}
              >
                <Upload size={16} /> {uploadedSamples.includes(sample.id) ? 'Applied' : 'Upload'} {sample.label}
              </button>
              <button
                type="button"
                className="source-file-link"
                onClick={() => setSourceDoc({
                  title: sample.label,
                  url: controlledViewUrl(sample.filePath),
                })}
              >
                Open source
              </button>
              {uploadedSamples.includes(sample.id) && <CheckCircle2 size={16} className="ok" />}
            </li>
          ))}
        </ul>
      </>
    )
  }

  const showInitialUpload = !parsePreview && !profileFromCv
  const showUploadCard = showInitialUpload || c1UploadExiting
  const c1InReviewMode = Boolean(parsePreview || profileFromCv)

  return (
    <>
      <Layout
        role="candidate"
        offline={offline}
        onToggleOffline={() => setOffline(!offline)}
        activeStep={step}
        steps={steps}
        onStepChange={(s) => setStep(s as CandidateStepId)}
        onLogout={logout}
        integrationSyncs={integrationSyncs}
      >
          <div ref={stepTopRef} className="step-scroll-anchor" aria-hidden="true" />
          {step === 'C1' && (
            <section className={`stack c1-flow ${c1InReviewMode ? 'c1-flow-review' : 'c1-flow-upload'}`}>
              <header className={`section-head c1-section-head ${c1InReviewMode ? 'is-review' : 'is-upload'}`}>
                <h1>C1 · Apply & confirm profile</h1>
                <p className="c1-section-subtitle">
                  {c1InReviewMode
                    ? 'Review extracted fields against your CV, edit if needed, then confirm for Jadarah (simulated).'
                    : 'Upload your CV — AI extracts fields for human review, then submit to Jadarah (simulated).'}
                </p>
              </header>

              {showUploadCard && (
                <div
                  className={`card c1-upload-card ${uploadBusy ? 'is-busy' : ''} ${c1UploadExiting ? 'is-exiting' : 'is-entering'}`}
                >
                  {renderCvUploadControls()}
                </div>
              )}

              {c1InReviewMode && (
                <>
                  {(showCompactUpload || uploadExpanded || uploadBusy) && !parsePreview && (
                    <div className="card c1-upload-card c1-upload-card-inline is-entering">
                      {renderCvUploadControls()}
                    </div>
                  )}

                  <div
                    ref={confirmFieldsRef}
                    className={`card c1-review-card c1-review-card--${c1ReviewAnim}`}
                  >
                    <CvReviewPanel
                      fileName={parsePreview?.fileName ?? appliedCvFileName}
                      previewUrl={parsePreview?.previewUrl ?? (appliedPreviewUrl || appliedSourceUrl || resolveCvSourceUrl('pdf-en', appliedCvFileName))}
                      previewKind={parsePreview?.previewKind ?? appliedPreviewKind}
                      fields={parsePreview?.fields ?? fields}
                      skills={parsePreview?.skills ?? profileSkills}
                      languages={parsePreview?.languages ?? profileLanguages}
                      workHistory={parsePreview?.workHistory ?? profileWorkHistory}
                      isScannedPdf={parsePreview?.isScannedPdf ?? scanImported}
                      parseMode={parsePreview?.mode}
                      readOnly={false}
                      reparseBusy={uploadBusy}
                      locateRequest={evidenceLocate}
                      onFieldChange={parsePreview ? updateParsePreviewScalar : updateScalarField}
                      onSkillsChange={parsePreview ? updateParsePreviewSkills : (items) => updateTagGroup(setProfileSkills, items)}
                      onLanguagesChange={parsePreview ? updateParsePreviewLanguages : (items) => updateTagGroup(setProfileLanguages, items)}
                      onEvidence={(title, evidence, source) => {
                        setEvidenceLocate({ title, evidence, source, token: Date.now() })
                      }}
                      onReparse={lastUploadInput ? handleReparseCv : undefined}
                      footer={parsePreview ? (
                        <div className="cv-decision-actions">
                          <button type="button" onClick={cancelParsePreview}>Upload a different file</button>
                          <button type="button" className="primary" onClick={acceptParsePreview}>Confirm extraction</button>
                        </div>
                      ) : (
                        <div className="cv-decision-actions">
                          <button type="button" onClick={() => { setDraftSaved(true); log('Candidate', 'Draft saved', 'Profile wizard draft', 'C1') }}>Save draft</button>
                          <button type="button" onClick={confirmAllFields}>Confirm all fields</button>
                          <button
                            type="button"
                            className="primary"
                            disabled={!canSubmitProfile}
                            onClick={() => {
                              confirmAllFields()
                              setReviewReady(true)
                            }}
                          >
                            Review & submit
                          </button>
                          {submitBlockReason && <p className="muted tiny">{submitBlockReason}</p>}
                          {draftSaved && <p className="ok-text">Draft saved.</p>}
                        </div>
                      )}
                    />
                  </div>
                </>
              )}

              {reviewReady && profileFromCv && !parsePreview && (
                <section
                  ref={submissionReviewRef}
                  className={`card submission-review ${submissionReveal ? 'is-entering' : ''}`}
                >
                  <header className="section-head">
                    <div>
                      <h2>Review & submit</h2>
                      <p>Final candidate confirmation before simulated Jadarah profile write-back.</p>
                    </div>
                  </header>
                  <CvProfilePanel
                    fields={fields}
                    skills={profileSkills}
                    languages={profileLanguages}
                    workHistory={profileWorkHistory}
                    readOnly
                  />
                  <div ref={submissionActionsRef} className="actions">
                    <button type="button" onClick={() => setReviewReady(false)}>Back to edit</button>
                    <button type="button" className="primary" onClick={() => {
                      setPipeline({ profileSubmitted: true })
                      syncIntegration('jadarah.profileWrite', 'C1', 'Candidate profile after review')
                      log('Candidate', 'Profile submitted', 'Simulated Jadarah profile write-back after candidate review', 'C1')
                      setStep('C2')
                    }}>
                      Confirm & submit profile
                    </button>
                  </div>
                </section>
              )}
            </section>
          )}

          {step === 'C2' && (
            <section className="card stack">
              <h1>C2 · CV update confirmation</h1>
              <p className="muted">Side-by-side diff — candidate must accept before profile is overwritten.</p>
              <button
                type="button"
                className="source-file-link"
                onClick={() => setSourceDoc({
                  title: 'Controlled CV update source',
                  url: controlledViewUrl('/issue-5302-inputs/07-sara-v2-update.pdf'),
                })}
              >
                Open controlled CV update source
              </button>
              <table className="data-table diff-table">
                <thead><tr><th>Field</th><th>Previous (Jadarah)</th><th>New (CV v2)</th><th>Change</th></tr></thead>
                <tbody>
                  <tr className="diff-changed">
                    <td><strong>Experience</strong></td>
                    <td className="diff-old">{CV_V2_DIFF.experience.old}</td>
                    <td className="diff-new">{CV_V2_DIFF.experience.new}</td>
                    <td><span className="status-pill no">Updated</span></td>
                  </tr>
                  <tr className="diff-added">
                    <td><strong>Certification</strong></td>
                    <td className="diff-old diff-empty">—</td>
                    <td className="diff-new">{CV_V2_DIFF.certification.new}</td>
                    <td><span className="status-pill ok">New</span></td>
                  </tr>
                </tbody>
              </table>
              <button type="button" className="primary" onClick={() => {
                setPipeline({ diffAccepted: true })
                syncIntegration('jadarah.profileUpdate', 'C2', 'CV v2 diff accepted')
                log('Candidate', 'Diff accepted', 'Profile updated from new CV', 'C2')
                setStep('C3')
              }}>Accept & continue to assessment</button>
            </section>
          )}

          {step === 'C3' && (
            <section ref={c3SectionRef} className="card stack">
              <h1>C3 · Assessment exam</h1>
              <p className="muted">Role-specific MCQ · auto-scored on submit.</p>
              <button
                type="button"
                className="source-file-link"
                onClick={() => setSourceDoc({
                  title: 'Controlled assessment question bank',
                  url: controlledViewUrl('/issue-5302-inputs/08-assessment-question-bank.pdf'),
                })}
              >
                Open controlled assessment question bank
              </button>
              {!examSubmitted ? (
                <>
                  {MCQ_QUESTIONS.map((q) => (
                    <fieldset key={q.id} className="mcq">
                      <legend>{q.prompt}</legend>
                      {q.options.map((opt, idx) => (
                        <label key={opt}><input type="radio" name={q.id} checked={mcqAnswers[q.id] === idx} onChange={() => setMcqAnswers({ ...mcqAnswers, [q.id]: idx })} />{opt}</label>
                      ))}
                    </fieldset>
                  ))}
                  <button
                    type="button"
                    className="primary"
                    disabled={Object.keys(mcqAnswers).length < MCQ_QUESTIONS.length}
                    onClick={() => {
                      const breakdown = MCQ_QUESTIONS.map((q) => ({
                        id: q.id,
                        correct: mcqAnswers[q.id] === q.correctIndex,
                      }))
                      const correct = breakdown.filter((b) => b.correct).length
                      const score = Math.round((correct / MCQ_QUESTIONS.length) * 100)
                      const durationSec = Math.max(1, Math.round((Date.now() - (examStartedAt ?? Date.now())) / 1000))
                      setExamBreakdown(breakdown)
                      setAssessmentScore(score)
                      setExamDurationSec(durationSec)
                      setExamSubmitted(true)
                      syncIntegration('jadarah.assessmentResult', 'C3', `Score ${score}% · ${durationSec}s`)
                      log('Candidate', 'Assessment submitted', `Score ${score}% · accuracy ${score}% · duration ${durationSec}s · benchmark 70%`, 'C3')
                      requestAnimationFrame(() => scrollPageToTop())
                    }}
                  >
                    Submit exam
                  </button>
                </>
              ) : (
                <>
                  <div className="result-box">
                    <strong>Score: {assessmentScore}%</strong>
                    <span>{examBreakdown.filter((b) => b.correct).length} / {MCQ_QUESTIONS.length} correct</span>
                  </div>
                  <div className="kpi-row compact assessment-metrics">
                    <div className="kpi-card"><span>Score</span><strong>{assessmentScore}%</strong></div>
                    <div className="kpi-card"><span>Accuracy</span><strong>{assessmentScore}%</strong></div>
                    <div className="kpi-card"><span>Duration</span><strong>{examDurationSec}s</strong></div>
                    <div className="kpi-card"><span>Benchmark</span><strong>70%</strong></div>
                  </div>
                  <ul className="score-breakdown">
                    {MCQ_QUESTIONS.map((q, i) => (
                      <li key={q.id} className={examBreakdown[i]?.correct ? 'ok' : 'miss'}>
                        Q{i + 1}: {examBreakdown[i]?.correct ? 'Correct' : 'Incorrect'} — {q.prompt.slice(0, 50)}…
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="primary" onClick={() => {
                    setInterviewTurns([])
                    setInterviewStarted(false)
                    setInterviewClosingReady(false)
                    setCandidateAnswerEn('')
                    avatar.setCaption('')
                    avatar.stop()
                    setPipeline({ assessmentSubmitted: true, interviewCompleted: false })
                    log('System', 'Interview segment ready', 'Candidate entered AI avatar interview (C4)', 'C4')
                    setStep('C4')
                  }}>Continue to AI interview →</button>
                </>
              )}
            </section>
          )}

          {step === 'C4' && (
            <section className="stack">
              <header className="section-head">
                <h1>C4 · AI avatar interview</h1>
                <p>Adaptive dialogue (5–10 questions) · LLM decides when sufficient evidence · HR reviews recording separately</p>
              </header>
              <div className="interview-steps card">
                <span className={interviewClosingReady || pipeline.interviewCompleted ? 'done' : 'active'}>1. Adaptive Q&amp;A</span>
                <span className={pipeline.interviewCompleted ? 'done' : interviewPhase === 'ready_to_finish' ? 'active' : ''}>2. Submit &amp; scoring</span>
              </div>
              <div className="grid-2">
                <AvatarPanel
                  speaking={avatar.isSpeaking || avatar.uiPhase === 'speaking'}
                  expression={avatar.expression}
                  caption={avatar.caption || 'Start when ready'}
                  viseme={avatar.isSpeaking ? avatar.viseme : undefined}
                  avatarMode={avatarMode}
                  liveAvatarSessionActive={interviewStarted && avatarMode === 'liveavatar'}
                />
                <div className="card stack">
                  {(avatar.isConnecting || avatar.isThinking) && avatar.statusMessage && (
                    <div className="interview-loading" role="status" aria-live="polite">
                      <span className="interview-loading-spinner" aria-hidden="true" />
                      <span>{avatar.statusMessage}</span>
                    </div>
                  )}
                  {!interviewStarted ? (
                    <button type="button" className="primary" disabled={avatar.isBusy} onClick={() => {
                      unlockAudioPlayback()
                      setInterviewClosingReady(false)
                      void (async () => {
                        setLlmError('')
                        setInterviewStarted(true)
                        try {
                          const ready = await avatar.connectLiveAvatar()
                          if (!ready) {
                            setLlmError('LiveAvatar video is not ready yet. Please try again in a moment.')
                            setInterviewStarted(false)
                            return
                          }
                          const openingQuestion = INTERVIEW_PRESET[0].text
                          const mode = await avatar.speakTurn({
                            id: nextTurnId('g'),
                            speaker: 'avatar',
                            language: 'en',
                            text: openingQuestion,
                            expression: 'neutral',
                          }, { onTranscriptTurn: appendAvatarTurn })
                          if (mode) {
                            log('System', 'Avatar TTS', `opening; mode: ${mode}`, 'C4')
                          }
                        } catch (error) {
                          const message = error instanceof Error ? error.message : 'Interview start failed'
                          setLlmError(message)
                          log('System', 'Interview start failed', message, 'C4')
                          setInterviewStarted(false)
                        }
                      })()
                    }}><Play size={16} /> Start interview</button>
                  ) : (
                    <>
                      <div className="transcript">
                        {interviewTurns.map((t) => (
                          <div key={t.id} className={`turn ${t.speaker}`}>
                            <strong>{t.speaker}</strong>
                            <p>{t.text}</p>
                            {t.followUpMeta && (
                              <p className="follow-up-meta muted tiny">
                                {t.followUpMeta.mode === 'model' ? 'LLM follow-up' : 'Local template (LLM unavailable)'}
                                {t.followUpMeta.evidencePhrase
                                  ? ` · grounded on “${t.followUpMeta.evidencePhrase}”`
                                  : ''}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      {llmError && <p className="danger-text">{llmError}</p>}
                      {avatar.isSpeaking && (
                        <button type="button" className="danger" onClick={interruptAvatar}>
                          Interrupt avatar
                        </button>
                      )}

                      {interviewPhase === 'english_answer' && (
                        <div className="stack">
                          <p className="muted tiny">
                            Answer {interviewProgress.currentRound}
                            {interviewProgress.answered < interviewProgress.minRequired
                              ? ` · ${interviewProgress.minRequired}–${interviewProgress.maxAllowed} adaptive questions (minimum ${interviewProgress.minRequired} before wrap-up)`
                              : ` · up to ${interviewProgress.maxAllowed} · AI may close when evidence is sufficient`}
                            {interviewProgress.answered > 0 ? ' · contextual follow-up after each reply' : ''}
                            {' · '}via microphone or typing.
                          </p>
                          <VoiceAnswerInput
                            key="c4-english-answer"
                            value={candidateAnswerEn}
                            onChange={setCandidateAnswerEn}
                            disabled={avatar.isBusy}
                            placeholder="Your answer..."
                            submitLabel={avatar.isThinking ? 'Generating follow-up…' : 'Send answer'}
                            submitDisabled={avatar.isBusy}
                            asrProvider={speechStatus.asr}
                            onSubmit={() => {
                              const ans = candidateAnswerEn.trim()
                              if (!ans) return
                              void handleCandidateAnswerSubmit(ans)
                            }}
                          />
                          <button type="button" onClick={requestSupportivePause} disabled={avatar.isSpeaking}>
                            I need a moment (3-second supportive response)
                          </button>
                          {supportivePrompt && <p className="muted tiny">{supportivePrompt}</p>}
                        </div>
                      )}

                      {interviewPhase === 'ready_to_finish' && !pipeline.interviewCompleted && (
                        <div className="stack">
                          <div className="bilingual-closing card">
                            <p className="bilingual-caption" dir="rtl" lang="ar">
                              شكراً لمشاركتكم في مقابلة هيئة الاستثمار العمانية. نقدّر وقتكم ونتطلع إلى مراجعة إجاباتكم.
                            </p>
                            <p className="bilingual-caption" lang="en">
                              Thank you for completing the OIA interview. We appreciate your time and will review your responses with HR.
                            </p>
                            <p className="muted tiny">Multilingual subtitles · display only (demo)</p>
                          </div>
                          <p className="ok-text">Interview complete — review the closing message above, then submit to view your match score.</p>
                          <button type="button" className="primary" onClick={() => void submitInterviewAndContinue()}>
                            Submit interview &amp; view my score →
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {step === 'C5' && (
            <section className="card stack">
              <h1>C5 · My match score & tips</h1>
              {matchLoading && (
                <p className="muted" role="status">Analyzing your CV against the job description…</p>
              )}
              {match && (
                <>
                  <p>Match: <strong>{match.totalScore}%</strong> for {FINANCE_JOB.title}</p>
                  <p className="muted">
                    LLM rubric · {match.matchedCount}/{match.totalDimensions} dimensions evidenced
                  </p>
                  <p className="muted">Assessment: {assessmentScore}% · Interview submitted — awaiting HR decision.</p>
                  <ul>
                    {(match.improvementTips?.length ? match.improvementTips : buildImprovementTips(match)).map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </>
              )}
              <button type="button" className="primary" onClick={() => setStep('C6')}>View application status</button>
            </section>
          )}

          {step === 'C6' && (
            <section className="card">
              <h1>C6 · Application status</h1>
              <ul className="status-list">
                <li className="done">Profile submitted</li>
                <li className="done">Assessment completed ({assessmentScore}%)</li>
                <li className="done">Interview completed</li>
                <li className={pipeline.shortlisted ? 'done' : 'pending'}>
                  HR shortlist {pipeline.shortlisted ? '✓' : '— pending recruiter review'}
                </li>
                <li className={pipeline.finalDecisionMade ? 'done' : 'pending'}>
                  Final decision {pipeline.finalDecisionMade ? '✓' : '— not yet'}
                </li>
              </ul>
              <p className="muted tiny">You cannot see other candidates or make hiring decisions in this portal.</p>
            </section>
          )}
        </Layout>

      {evidenceModal && <EvidenceModal {...evidenceModal} onClose={() => setEvidenceModal(null)} />}
      {sourceDoc && <SourceDocumentModal {...sourceDoc} onClose={() => setSourceDoc(null)} />}
    </>
  )
}
