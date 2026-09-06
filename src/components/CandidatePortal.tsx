import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  ChevronUp,
  ClipboardList,
  FileCheck,
  FileText,
  FileUp,
  LayoutList,
  LogOut,
  MessageSquare,
  Play,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Scale,
  Shield,
  Target,
  Upload,
  UserCheck,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { useDemo } from '../context/DemoContext'
import { AvatarPanel } from './AvatarPanel'
import { FreeMicPanel } from './FreeMicPanel'
import { EvidenceModal } from './EvidenceModal'
import { SourceDocumentModal } from './SourceDocumentModal'
import { CvReviewPanel } from './CvReviewPanel'
import type { CvEvidenceLocateRequest, CvPreviewKind } from './CvSourcePreview'
import { CvProfilePanel } from './CvProfilePanel'
import { IntegrationStatusPanel } from './IntegrationStatusPanel'
import { NetworkStatus } from './NetworkStatus'
import { CV_UPLOAD_SAMPLES, CV_V2_DIFF } from '../data/candidates'
import { resolveSampleProfileId } from '../data/cvParseProfiles'
import { FINANCE_JOB } from '../data/job'
import { MCQ_QUESTIONS } from '../data/questions'
import { CANDIDATE_STEPS } from '../lib/demo'
import {
  interviewAnswerProgress as configInterviewProgress,
  interviewConfigSummary,
  nextFixedQuestion,
  openingQuestion,
  shouldForceInterviewClosing as configShouldForceClosing,
  toInterviewConfigPayload,
} from '../lib/interviewConfig'
import { localAi, type FollowUpResult, type AssessmentResult } from '../lib/localAi'
import { preloadSpeechVoices, setHeyGenAvatarEnabled, setLiveAvatarEnabled, warmInterviewSpeech } from '../lib/voiceSpeak'
import {
  installLiveAvatarLifecycleGuards,
  liveAvatarVideoHealthy,
  stopLiveAvatarSession,
  getLiveAvatarLastError,
  waitForLiveAvatarVideoReady,
  refreshLiveAvatarSession,
  resetLiveAvatarReconnectState,
} from '../lib/liveavatarPlayer'
import { formatLiveAvatarError } from '../lib/liveavatarErrors'
import { unlockAudioPlayback } from '../lib/audioUnlock'
import {
  prefetchMatchesUtterance,
  resetDuplexSession,
  resetFollowUpPrefetchState,
  setInterviewDuplexMode,
  startFollowUpPrefetch,
  type FollowUpPrefetch,
} from '../lib/freeMicDuplex'
import { useInterviewAvatar } from '../hooks/useInterviewAvatar'
import { controlledViewUrl } from '../lib/controlledDocUrl'
import { runCvUploadFlow, generateCvUploadId, type CvUploadProgress, type CvUploadResult } from '../lib/cvUploadFlow'
import { resolveCvSourceUrl } from '../lib/cvSourceUrl'
import {
  buildImprovementTips,
  buildInterviewFollowUp,
  countCandidateAnswers,
  DEFAULT_INTERVIEW_CLOSING,
  getInterviewUiPhase,
} from '../lib/matching'
import {
  applyJdWeights,
  computeInterviewScoreFromDimensions,
  computeMatchTotalScore,
  computeOverallScore,
  dimensionAchievementPct,
  pillarContribution,
  weightShare,
} from '../lib/hrScoring'
import { useScoringWeights } from '../hooks/useScoringWeights'
import { buildAssessmentKey, cachedLlmAssessment } from '../lib/llmRequestCache'
import { getPrimaryMatch, loadLlmMatches } from '../lib/llmMatching'
import { profileFieldsKey } from '../lib/profileFieldsKey'
import type { CandidateMatchWithTips } from '../lib/matching'
import { scrollPageToTop } from '../lib/scrollPageToTop'
import { getContentScrollContainer } from '../lib/smoothScroll'
import type { CandidateStepId, FieldStatus, IntegrationSyncEvent, InterviewQuestion, InterviewTurn, ProfileTagGroup, UserRole, WorkExperienceEntry } from '../types'

const CANDIDATE_NAV_ICONS: Record<string, LucideIcon> = {
  C1: FileUp,
  C2: UserCheck,
  C3: ClipboardList,
  C4: Video,
  C5: BarChart3,
  C6: BadgeCheck,
}

const HR_NAV_ICONS: Record<string, LucideIcon> = {
  H1: LayoutList,
  H2: UserCheck,
  H3: PlayCircle,
  H4: Scale,
  H5: FileText,
}

export interface StepItem {
  id: string
  label: string
  hint?: string
  locked?: boolean
  lockNote?: string
  complete?: boolean
  order: number
}

interface LayoutProps {
  role: UserRole
  offline: boolean
  onToggleOffline: () => void
  activeStep: string
  steps: readonly StepItem[]
  onStepChange: (step: string) => void
  onLogout: () => void
  integrationSyncs: IntegrationSyncEvent[]
  demoShortcut?: ReactNode
  children: ReactNode
}

export function Layout({
  role,
  offline,
  onToggleOffline,
  activeStep,
  steps,
  onStepChange,
  onLogout,
  integrationSyncs,
  demoShortcut,
  children,
}: LayoutProps) {
  const isCandidate = role === 'candidate'
  const roleLabel = isCandidate ? 'Candidate portal' : 'HR portal'
  const navIcons = isCandidate ? CANDIDATE_NAV_ICONS : HR_NAV_ICONS
  const contentRef = useRef<HTMLElement>(null)
  const activeStepMeta = useMemo(
    () => steps.find((step) => step.id === activeStep),
    [activeStep, steps],
  )
  const activeStepLabel = activeStepMeta?.label ?? activeStep
  const completedCount = steps.filter((step) => step.complete).length

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const scrollToTop = () => {
      content.scrollTop = 0
      window.scrollTo(0, 0)
    }

    scrollToTop()
    const raf = requestAnimationFrame(scrollToTop)
    const timer = window.setTimeout(scrollToTop, 0)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [activeStep])

  return (
    <div className="app-shell" dir="ltr">
      <div className="main-grid">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <Shield size={20} aria-hidden />
            <div className="sidebar-brand-copy">
              <strong>OIA Recruitment</strong>
              <span className="sidebar-brand-meta">RFQ 5302 prototype</span>
            </div>
          </div>

          <div className="sidebar-nav-head">
            <h3>{isCandidate ? 'Application progress' : 'Recruitment workspace'}</h3>
            <span className="sidebar-nav-progress">
              {completedCount}/{steps.length} complete
            </span>
          </div>

          <nav className="sidebar-nav" aria-label={isCandidate ? 'Application steps' : 'Recruitment steps'}>
            {steps.map((step) => {
              const Icon = navIcons[step.id]
              const isActive = activeStep === step.id
              const showComplete = step.complete && !isActive

              return (
                <button
                  key={step.id}
                  type="button"
                  className={`nav-item ${isActive ? 'active' : ''} ${step.locked ? 'locked' : ''} ${showComplete ? 'complete' : ''}`}
                  onClick={() => !step.locked && onStepChange(step.id)}
                  disabled={step.locked}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span className="nav-item-marker" aria-hidden>
                    {showComplete ? 'Done' : step.order}
                  </span>
                  <div className="nav-item-body">
                    <span className="nav-item-title-row">
                      {Icon && <Icon size={15} className="nav-item-icon" aria-hidden />}
                      <strong>{step.label}</strong>
                    </span>
                    {step.locked && step.lockNote ? (
                      <small className="lock-note">{step.lockNote}</small>
                    ) : step.hint ? (
                      <small className="nav-item-hint">{step.hint}</small>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </nav>

          {demoShortcut && <div className="demo-shortcut-panel">{demoShortcut}</div>}

          <IntegrationStatusPanel events={integrationSyncs} />
        </aside>

        <div className="content-column">
          <header className="topbar">
            <div className="topbar-title">
              <span className="topbar-role">{roleLabel}</span>
              <span className="topbar-step">{activeStepLabel}</span>
              {activeStepMeta && (
                <span className="topbar-step-meta">
                  Step {activeStepMeta.order} of {steps.length}
                </span>
              )}
            </div>
            <div className="topbar-actions">
              <NetworkStatus offline={offline} onToggle={onToggleOffline} />
              <button type="button" className="ghost-btn" onClick={onLogout}>
                <LogOut size={16} /> Exit portal
              </button>
            </div>
          </header>

          <main ref={contentRef} className="content">{children}</main>
        </div>
      </div>
    </div>
  )
}

const UPLOAD_STAGE_TRACK = [
  { id: 'reading', label: 'Read' },
  { id: 'uploading', label: 'Upload' },
  { id: 'parsing', label: 'Extract' },
  { id: 'mapping', label: 'Map' },
  { id: 'done', label: 'Review' },
] as const

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
    interviewConfig,
    hrInjectedQuestion, setHrInjectedQuestion,
    assessmentScore, setAssessmentScore,
    disqualifiedReason, finalReason,
    candidateStep: step, setCandidateStep: setStep, logout,
  } = useDemo()

  const [uploadedSamples, setUploadedSamples] = useState<string[]>([])
  const [draftSaved, setDraftSaved] = useState(false)
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({})
  const [examSubmitted, setExamSubmitted] = useState(false)
  const [examBreakdown, setExamBreakdown] = useState<{ id: string; correct: boolean }[]>([])
  const [examStartedAt, setExamStartedAt] = useState<number | null>(null)
  const [examDurationSec, setExamDurationSec] = useState(0)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [liveAvatarReady, setLiveAvatarReady] = useState(false)
  const [interviewClosingReady, setInterviewClosingReady] = useState(false)
  const [candidateAnswerEn, setCandidateAnswerEn] = useState('')
  const [supportivePrompt, setSupportivePrompt] = useState('')
  const [avatarMode, setAvatarMode] = useState<'heygen' | 'liveavatar'>('liveavatar')
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
  const [c1Submitting, setC1Submitting] = useState(false)
  const previewBlobRef = useRef<string | null>(null)
  const parsePreviewKeyRef = useRef<string | null>(null)
  const interviewTurnsRef = useRef(interviewTurns)
  const hrInjectedQuestionRef = useRef(hrInjectedQuestion)
  const prefetchRef = useRef<FollowUpPrefetch | null>(null)
  const lastAnswerSubmitRef = useRef({ at: 0, text: '' })
  const c4ResumeKeyRef = useRef('')
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

  function pinC1ToTop() {
    const pane = getContentScrollContainer()
    if (pane) pane.scrollTop = 0
    window.scrollTo(0, 0)
  }

  useEffect(() => () => revokePreviewBlob(), [])

  function stopInterviewSpeech() {
    avatar.stop()
    setInterviewDuplexMode(false)
    prefetchRef.current = null
  }

  async function reconnectLiveAvatarSession(options?: { forceRefresh?: boolean }): Promise<boolean> {
    if (avatarMode !== 'liveavatar') {
      setLiveAvatarReady(true)
      return true
    }
    setLlmError('')
    resetLiveAvatarReconnectState()

    let healthy = false
    if (options?.forceRefresh) {
      healthy = await refreshLiveAvatarSession()
    } else {
      healthy = await waitForLiveAvatarVideoReady(90_000)
      if (!healthy) healthy = await refreshLiveAvatarSession()
    }

    if (healthy) {
      healthy = await waitForLiveAvatarVideoReady(30_000) || liveAvatarVideoHealthy()
    }

    setLiveAvatarReady(healthy)
    if (!healthy) {
      setLlmError(formatLiveAvatarError(
        getLiveAvatarLastError() ?? 'LiveAvatar video reconnect failed — try again or restart the interview.',
      ))
    }
    return healthy
  }

  function restartInterview() {
    stopInterviewSpeech()
    void stopLiveAvatarSession()
    c4ResumeKeyRef.current = ''
    setInterviewTurns([])
    setHrInjectedQuestion(null)
    setInterviewStarted(false)
    setLiveAvatarReady(false)
    setInterviewClosingReady(false)
    setCandidateAnswerEn('')
    setSupportivePrompt('')
    setLlmError('')
    avatar.setCaption('')
    setPipeline({ interviewCompleted: false })
    log('Candidate', 'Interview restarted', 'Transcript cleared — ready for a fresh C4 session', 'C4')
  }

  function appendAvatarTurn(turn: InterviewTurn, add: boolean) {
    if (add) setInterviewTurns((prev) => [...prev, turn])
  }

  const interviewPhase = getInterviewUiPhase(
    interviewTurns,
    pipeline.interviewCompleted,
    interviewClosingReady,
    interviewConfig.maxAnswers,
  )
  const interviewProgress = configInterviewProgress(interviewConfig, interviewTurns)
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
    interviewTurnsRef.current = interviewTurns
  }, [interviewTurns])

  useEffect(() => {
    hrInjectedQuestionRef.current = hrInjectedQuestion
  }, [hrInjectedQuestion])

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
    })
    return () => cancelAnimationFrame(raf)
  }, [step])

  useEffect(() => {
    if (step !== 'C4' || pipeline.interviewCompleted) return
    setInterviewStarted(false)
    setLiveAvatarReady(false)
    c4ResumeKeyRef.current = ''
  }, [step, pipeline.interviewCompleted])

  useEffect(() => {
    if (step !== 'C4' || avatarMode !== 'liveavatar' || !interviewStarted) return
    let misses = 0
    const timer = window.setInterval(() => {
      if (liveAvatarVideoHealthy()) {
        misses = 0
        setLiveAvatarReady(true)
        return
      }
      misses += 1
      if (misses >= 3) setLiveAvatarReady(false)
    }, 2000)
    return () => window.clearInterval(timer)
  }, [step, avatarMode, interviewStarted])

  useEffect(() => {
    if (step === 'C4') return
    if (avatarMode === 'liveavatar') void stopLiveAvatarSession()
  }, [step, avatarMode])

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
    if (!pipeline.interviewCompleted || avatarMode !== 'liveavatar') return
    void stopLiveAvatarSession()
  }, [pipeline.interviewCompleted, avatarMode])

  useEffect(() => {
    if (step !== 'C4' || avatarMode !== 'liveavatar' || interviewStarted) return
    void localAi.liveavatarStatus().catch(() => undefined)
  }, [step, avatarMode, interviewStarted])

  useEffect(() => {
    preloadSpeechVoices()
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

  useLayoutEffect(() => {
    if (step !== 'C1') return
    pinC1ToTop()
  }, [step, parsePreview, reviewReady, profileFromCv, c1Submitting])

  useEffect(() => {
    if (step !== 'C1') {
      setC1Submitting(false)
      setReviewReady(false)
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
      setParsePreview(result)
      pinC1ToTop()
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
    const controlledId = resolveSampleProfileId(file.name)
    void processCvUpload({
      sampleId: controlledId ?? generateCvUploadId(),
      label: file.name,
      file,
      isScannedPdf: controlledId === 'pdf-scan' || isScannedPdf,
    })
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
    setParsePreview(null)
    parsePreviewKeyRef.current = null
    revokePreviewBlob()
    setEvidenceLocate(null)
    setUploadProgress({ stage: 'idle', progress: 0, message: '' })
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
        interviewConfig: toInterviewConfigPayload(interviewConfig),
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
        targetDimension: result.targetDimension,
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
    const trimmed = ans.trim()
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length
    if (!trimmed || wordCount < 3 || trimmed.length < 12) return
    if (avatar.isThinking || avatar.isSpeaking) return
    if (interviewClosingReady || pipeline.interviewCompleted) return
    if (countCandidateAnswers(interviewTurns) >= interviewConfig.maxAnswers) return

    const now = Date.now()
    if (
      now - lastAnswerSubmitRef.current.at < 5_000
      && trimmed.toLowerCase() === lastAnswerSubmitRef.current.text.toLowerCase()
    ) {
      return
    }
    lastAnswerSubmitRef.current = { at: now, text: trimmed }

    unlockAudioPlayback()
    setLlmError('')

    const prefetched = prefetchMatchesUtterance(prefetchRef.current, trimmed)
      ? prefetchRef.current
      : null
    prefetchRef.current = null
    resetFollowUpPrefetchState()

    if (avatar.isSpeaking) avatar.stop()

    let followUpResult: FollowUpResult | null = null
    let fixedQuestion: InterviewQuestion | null = null
    let forceClosing = false
    let closingText: string | undefined

    try {
      await avatar.think(async () => {
        const candidateTurn = {
          id: nextTurnId('c-en'),
          speaker: 'candidate' as const,
          language: 'en' as const,
          text: trimmed,
        }
        const updatedTurns = [...interviewTurns, candidateTurn]
        setInterviewTurns(updatedTurns)
        setCandidateAnswerEn('')
        const answerCount = countCandidateAnswers(updatedTurns)

        if (configShouldForceClosing(interviewConfig, answerCount)) {
          forceClosing = true
          return
        }

        const injected = hrInjectedQuestionRef.current
        if (injected?.textEn?.trim()) {
          fixedQuestion = {
            id: `hr-live-${Date.now()}`,
            textEn: injected.textEn.trim(),
            source: 'custom',
          }
          setHrInjectedQuestion(null)
          return
        }

        const fixedNext = interviewConfig.mode !== 'adaptive'
          ? nextFixedQuestion(interviewConfig, updatedTurns)
          : null

        if (fixedNext && interviewConfig.mode !== 'adaptive') {
          fixedQuestion = fixedNext
          return
        }

        if (interviewConfig.mode === 'fixed_only') {
          forceClosing = true
          return
        }

        const followUp = prefetched
          ? await prefetched.promise
          : await generateAvatarFollowUp(trimmed, updatedTurns)
        if (followUp.mode === 'model') setLlmError('')
        followUpResult = followUp

        if (followUp.action === 'closing') {
          forceClosing = true
          closingText = followUp.text
        }
      })

      if (forceClosing) {
        await deliverInterviewClosing(closingText)
        return
      }
      if (fixedQuestion) {
        await deliverConfiguredQuestion(fixedQuestion)
        return
      }
      if (followUpResult) {
        await deliverAvatarFollowUp(followUpResult)
      }
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

  async function deliverConfiguredQuestion(question: InterviewQuestion) {
    const turn: InterviewTurn = {
      id: nextTurnId(question.source === 'jd' ? 'jd' : 'hr'),
      speaker: 'avatar',
      language: 'en',
      text: question.textEn,
      expression: question.source === 'jd' ? 'curious' : 'neutral',
      followUpMeta: {
        mode: 'adapter-fallback',
        questionSource: question.source,
        targetDimension: question.dimension,
      },
    }
    setInterviewTurns((prev) => [...prev, turn])
    const prefetchedTts = avatarMode === 'liveavatar'
      ? null
      : await localAi.synthesize({ text: question.textEn })
    const mode = await avatar.speakTurn(turn, {
      addToTranscript: false,
      prefetchedTts,
      onTranscriptTurn: appendAvatarTurn,
    })
    if (mode) {
      log('System', 'Avatar TTS', `${question.source} question; mode: ${mode}`, 'C4')
    }
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
        targetDimension: followUp.targetDimension,
        questionSource: 'adaptive',
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

  function goToConfirm() {
    confirmAllFields()
    pinC1ToTop()
    setReviewReady(true)
  }

  function submitConfirmedProfile() {
    if (c1Submitting) return
    setC1Submitting(true)
    setPipeline({ profileSubmitted: true })
    syncIntegration('jadarah.profileWrite', 'C1', 'Candidate profile after review')
    log('Candidate', 'Profile submitted', 'Simulated Jadarah profile write-back after candidate review', 'C1')
    window.setTimeout(() => {
      setReviewReady(false)
      setC1Submitting(false)
      setStep('C2')
    }, 900)
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

  const steps = CANDIDATE_STEPS.map((s, index) => {
    const locked =
      (s.id === 'C2' && !pipeline.profileSubmitted) ||
      (s.id === 'C3' && !pipeline.diffAccepted) ||
      (s.id === 'C4' && !pipeline.assessmentSubmitted) ||
      (s.id === 'C5' && !pipeline.interviewCompleted) ||
      (s.id === 'C6' && !pipeline.interviewCompleted)
    const lockNote =
      s.id === 'C2' ? 'Complete your application first' :
      s.id === 'C3' ? 'Confirm your profile first' :
      s.id === 'C4' ? 'Finish the assessment first' :
      s.id === 'C5' || s.id === 'C6' ? 'Complete your interview first' :
      undefined
    const complete =
      s.id === 'C1' ? pipeline.profileSubmitted :
      s.id === 'C2' ? pipeline.diffAccepted :
      s.id === 'C3' ? pipeline.assessmentSubmitted :
      s.id === 'C4' ? pipeline.interviewCompleted :
      s.id === 'C5' ? step === 'C6' || pipeline.finalDecisionMade :
      s.id === 'C6' ? pipeline.finalDecisionMade :
      false
    return {
      ...s,
      order: index + 1,
      locked,
      lockNote: locked ? lockNote : undefined,
      complete,
    }
  })

  function handleFreeMicPartialStable(partial: string) {
    if (avatar.isThinking || avatar.isSpeaking) return
    if (interviewConfig.mode === 'fixed_only') return
    if (interviewConfig.mode !== 'adaptive' && nextFixedQuestion(interviewConfig, interviewTurnsRef.current)) {
      return
    }
    const next = startFollowUpPrefetch(partial, (answer) =>
      generateAvatarFollowUp(answer, interviewTurnsRef.current),
    )
    if (next) prefetchRef.current = next
  }

  function interruptAvatar() {
    if (!avatar.isSpeaking) return
    avatar.stop()
    avatar.setCaption('…')
    avatar.setExpression('curious')
    log('Candidate', 'Avatar interrupted', 'Duplex barge-in — candidate speaking over avatar', 'C4')
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

  const c1InReviewMode = Boolean(parsePreview || profileFromCv)
  const c1Phase: 'upload' | 'review' | 'confirm' = c1Submitting || (reviewReady && profileFromCv && !parsePreview)
    ? 'confirm'
    : c1InReviewMode
      ? 'review'
      : 'upload'
  const c1PhaseIndex = c1Phase === 'upload' ? 0 : c1Phase === 'review' ? 1 : 2
  const c1Subtitle =
    c1Phase === 'confirm'
      ? 'Check the summary, then confirm to write the profile to Jadarah (simulated).'
      : c1Phase === 'review'
        ? 'Review extracted fields against your CV, edit if needed, then continue.'
        : 'Upload your CV — AI extracts fields for human review, then submit to Jadarah (simulated).'

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
            <section className={`stack c1-flow c1-flow-${c1Phase}`}>
              <header className={`section-head c1-section-head is-${c1Phase}`}>
                <h1>Apply and confirm profile</h1>
                <ol className="c1-phase-steps" aria-label="C1 steps">
                  {['Upload', 'Review', 'Submit'].map((label, index) => (
                    <li
                      key={label}
                      className={`${index < c1PhaseIndex ? 'is-done' : ''} ${index === c1PhaseIndex ? 'is-active' : ''}`}
                    >
                      <span className="c1-phase-index">{index < c1PhaseIndex ? '✓' : index + 1}</span>
                      {label}
                    </li>
                  ))}
                </ol>
                <p className="c1-section-subtitle">{c1Subtitle}</p>
              </header>

              {c1Phase === 'upload' && (
                <div
                  className={`card c1-upload-card ${uploadBusy ? 'is-busy' : ''} is-entering`}
                >
                  {renderCvUploadControls()}
                </div>
              )}

              {c1Phase === 'review' && (
                <div className="c1-phase-slot is-entering">
                  {(showCompactUpload || uploadExpanded || uploadBusy) && !parsePreview && (
                    <div className="card c1-upload-card c1-upload-card-inline">
                      {renderCvUploadControls()}
                    </div>
                  )}

                  <div
                    ref={confirmFieldsRef}
                    className="card c1-review-card"
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
                            onClick={goToConfirm}
                          >
                            Continue to submit
                          </button>
                          {submitBlockReason && <p className="muted tiny">{submitBlockReason}</p>}
                          {draftSaved && <p className="ok-text">Draft saved.</p>}
                        </div>
                      )}
                    />
                  </div>
                </div>
              )}

              {c1Phase === 'confirm' && (
                <div className="c1-phase-slot is-entering">
                <section
                  ref={submissionReviewRef}
                  className={`card c1-confirm-card ${c1Submitting ? 'is-submitting' : ''}`}
                >
                  {c1Submitting ? (
                    <div className="c1-confirm-success" role="status" aria-live="polite">
                      <CheckCircle2 size={28} className="ok" aria-hidden />
                      <strong>Profile submitted</strong>
                      <p>Writing to Jadarah (simulated endpoint)…</p>
                    </div>
                  ) : (
                    <>
                      <header className="c1-confirm-head">
                        <div>
                          <h2>Confirm & submit</h2>
                          <p>Final check before the simulated Jadarah profile write-back.</p>
                        </div>
                        <span className="integration-sim-badge">Simulated endpoint</span>
                      </header>
                      <div className="c1-confirm-body">
                        <CvProfilePanel
                          fields={fields}
                          skills={profileSkills}
                          languages={profileLanguages}
                          workHistory={profileWorkHistory}
                          readOnly
                        />
                      </div>
                      <div ref={submissionActionsRef} className="c1-confirm-actions">
                        <button type="button" onClick={() => {
                          setReviewReady(false)
                          window.setTimeout(() => pinC1ToTop(), 0)
                        }}>Back to edit</button>
                        <button type="button" className="primary" onClick={submitConfirmedProfile}>
                          Confirm & submit profile
                        </button>
                      </div>
                    </>
                  )}
                </section>
                </div>
              )}
            </section>
          )}

          {step === 'C2' && (
            <section className="card stack">
              <h1>Profile review</h1>
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
              <h1>Technical assessment</h1>
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
                    setInterviewTurns([])
                    setInterviewStarted(false)
                    setLiveAvatarReady(false)
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
                <h1>AI interview</h1>
                <p>HR-configured questions + adaptive follow-up · {interviewConfigSummary(interviewConfig)}</p>
              </header>
              <div className="interview-config-banner card">
                <strong>Interview blueprint (HR)</strong>
                <p className="muted tiny">{interviewConfigSummary(interviewConfig)}</p>
              </div>
              <div className="interview-steps card">
                <span className={interviewClosingReady || pipeline.interviewCompleted ? 'done' : 'active'}>1. Adaptive Q&amp;A</span>
                <span className={pipeline.interviewCompleted ? 'done' : interviewPhase === 'ready_to_finish' ? 'active' : ''}>2. Submit &amp; scoring</span>
              </div>
              <div className="interview-live-layout">
                <AvatarPanel
                  speaking={avatar.isSpeaking || avatar.uiPhase === 'speaking'}
                  expression={avatar.expression}
                  caption={
                    avatar.caption
                    || (interviewStarted && avatarMode === 'liveavatar' && !liveAvatarReady
                      ? 'Reconnect LiveAvatar to continue'
                      : 'Press Start interview when you are ready')
                  }
                  viseme={avatar.isSpeaking ? avatar.viseme : undefined}
                  avatarMode={avatarMode}
                  liveAvatarSessionActive={interviewStarted && avatarMode === 'liveavatar'}
                />
                <div className="card stack interview-controls">
                  {(avatar.isConnecting || avatar.isThinking) && avatar.statusMessage && (
                    <div className="interview-loading" role="status" aria-live="polite">
                      <span className="interview-loading-spinner" aria-hidden="true" />
                      <span>{avatar.statusMessage}</span>
                    </div>
                  )}
                  {!interviewStarted ? (
                    <>
                      {llmError && avatarMode === 'liveavatar' && (
                        <div className="banner-warn stack" role="alert">
                          <p>{llmError}</p>
                        </div>
                      )}
                    <button type="button" className="primary" disabled={avatar.isBusy} onClick={() => {
                      unlockAudioPlayback()
                      setInterviewDuplexMode(true)
                      resetDuplexSession()
                      setInterviewClosingReady(false)
                      void (async () => {
                        setLlmError('')
                        setInterviewStarted(true)
                        try {
                          const ready = await reconnectLiveAvatarSession()
                          if (!ready) {
                            setInterviewStarted(false)
                            return
                          }
                          const opening = openingQuestion(interviewConfig)
                          const mode = await avatar.speakTurn({
                            id: nextTurnId('g'),
                            speaker: 'avatar',
                            language: 'en',
                            text: opening.textEn,
                            expression: 'neutral',
                            followUpMeta: {
                              mode: 'adapter-fallback',
                              questionSource: opening.source,
                              targetDimension: opening.dimension,
                            },
                          }, { onTranscriptTurn: appendAvatarTurn })
                          if (mode) {
                            log('System', 'Avatar TTS', `opening (${opening.source}); mode: ${mode}`, 'C4')
                          }
                        } catch (error) {
                          const message = formatLiveAvatarError(error instanceof Error ? error.message : 'Interview start failed')
                          setLlmError(message)
                          log('System', 'Interview start failed', message, 'C4')
                          setInterviewStarted(false)
                          setLiveAvatarReady(false)
                        }
                      })()
                    }}><Play size={16} /> Start interview</button>
                    </>
                  ) : (
                    <>
                      {avatarMode === 'liveavatar' && !liveAvatarReady && (
                        <div className="banner-warn stack">
                          <p>{llmError || 'LiveAvatar video disconnected. Reconnect to hear the interviewer, or restart if the session is stuck.'}</p>
                          <div className="row-actions">
                            <button type="button" className="primary" disabled={avatar.isBusy} onClick={() => { void reconnectLiveAvatarSession({ forceRefresh: true }) }}>
                              <RefreshCw size={16} /> Reconnect video
                            </button>
                            <button type="button" disabled={avatar.isBusy} onClick={restartInterview}>
                              <RotateCcw size={16} /> Restart interview
                            </button>
                          </div>
                        </div>
                      )}
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
                            {' · '}duplex — speak when ready; pause ~2s to submit your answer.
                          </p>
                          <FreeMicPanel
                            active={!avatar.isConnecting}
                            llmBusy={avatar.isThinking}
                            avatarSpeaking={avatar.isSpeaking}
                            onBargeIn={interruptAvatar}
                            onPartialStable={handleFreeMicPartialStable}
                            onUtterance={(text) => { void handleCandidateAnswerSubmit(text) }}
                            typedValue={candidateAnswerEn}
                            onTypedChange={setCandidateAnswerEn}
                            typedPlaceholder="Your answer..."
                            typedSubmitLabel={avatar.isThinking ? 'Generating follow-up…' : 'Send typed answer'}
                            onTypedSubmit={() => {
                              const ans = candidateAnswerEn.trim()
                              if (!ans || avatar.isThinking) return
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
            matchLoading && !match ? (
              <section className="card stack">
                <h1>My match score</h1>
                <p className="muted" role="status">Analyzing your CV against the job description…</p>
              </section>
            ) : match ? (
              <CandidateScorePanel
                match={match}
                assessmentScore={assessmentScore}
                interviewTurns={interviewTurns}
                interviewCompleted={pipeline.interviewCompleted}
                jobTitle={FINANCE_JOB.title}
                matchLoading={matchLoading}
                onContinue={() => setStep('C6')}
              />
            ) : (
              <section className="card stack">
                <h1>My match score</h1>
                <p className="muted">Match analysis unavailable — check your connection or retry from C1.</p>
                <button type="button" className="primary" onClick={() => setStep('C6')}>
                  View application status
                </button>
              </section>
            )
          )}

          {step === 'C6' && (
            <section className="card">
              <h1>Application status</h1>
              <ul className="status-list">
                <li className="done">Profile submitted</li>
                <li className="done">Assessment completed ({assessmentScore}%)</li>
                <li className="done">Interview completed</li>
                <li className={pipeline.disqualified ? 'done' : pipeline.shortlisted ? 'done' : 'pending'}>
                  HR shortlist{' '}
                  {pipeline.disqualified
                    ? '— not shortlisted'
                    : pipeline.shortlisted
                      ? '✓'
                      : '— pending recruiter review'}
                </li>
                <li className={pipeline.finalDecisionMade ? 'done' : 'pending'}>
                  Final decision{' '}
                  {pipeline.finalDecisionMade
                    ? pipeline.finalDecisionType === 'hire'
                      ? '✓ Recommended for hire'
                      : '✓ Not selected'
                    : '— not yet'}
                </li>
                {pipeline.disqualified && disqualifiedReason && (
                  <li className="muted tiny">HR note: {disqualifiedReason}</li>
                )}
                {pipeline.finalDecisionMade && finalReason && (
                  <li className="muted tiny">Decision reason: {finalReason}</li>
                )}
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

interface CandidateScorePanelProps {
  match: CandidateMatchWithTips
  assessmentScore: number
  interviewTurns: InterviewTurn[]
  interviewCompleted: boolean
  jobTitle?: string
  matchLoading?: boolean
  onContinue: () => void
}

function CandidateScorePanel({
  match,
  assessmentScore,
  interviewTurns,
  interviewCompleted,
  jobTitle = FINANCE_JOB.title,
  matchLoading = false,
  onContinue,
}: CandidateScorePanelProps) {
  const { pillarWeights: weights, jdWeights } = useScoringWeights()
  const weightedDimensions = useMemo(
    () => applyJdWeights(match.dimensions, jdWeights),
    [match.dimensions, jdWeights],
  )
  const cvScore = useMemo(
    () => computeMatchTotalScore(match.dimensions, jdWeights),
    [match.dimensions, jdWeights],
  )
  const [interviewReport, setInterviewReport] = useState<AssessmentResult | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const assessmentKey = useMemo(
    () => buildAssessmentKey({ assessmentScore, turns: interviewTurns }),
    [assessmentScore, interviewTurns],
  )

  useEffect(() => {
    if (!interviewCompleted || interviewTurns.length === 0) {
      setInterviewReport(null)
      return
    }

    let active = true
    setReportLoading(true)
    cachedLlmAssessment(assessmentKey, () =>
      localAi.generateAssessment({
        turns: interviewTurns,
        assessmentScore,
        matchScore: cvScore,
        jobTitle,
      }),
    )
      .then((report) => {
        if (active) setInterviewReport(report)
      })
      .catch(() => {
        if (active) setInterviewReport(null)
      })
      .finally(() => {
        if (active) setReportLoading(false)
      })

    return () => {
      active = false
    }
  }, [assessmentKey, assessmentScore, cvScore, interviewCompleted, interviewTurns, jobTitle])

  const interviewScore = useMemo(
    () =>
      interviewReport
        ? computeInterviewScoreFromDimensions(interviewReport.dimensions)
        : null,
    [interviewReport],
  )

  const overallScore = useMemo(
    () => computeOverallScore(cvScore, assessmentScore, interviewScore, weights),
    [assessmentScore, cvScore, interviewScore, weights],
  )

  const tips = match.improvementTips?.length
    ? match.improvementTips
    : buildImprovementTips(match)

  const meetsThreshold = overallScore >= 60
  const busy = matchLoading || reportLoading

  return (
    <section className="command-centre stack" aria-busy={busy}>
      <header className="command-centre-head section-head">
        <div>
          <h1>My match score</h1>
          <p className="muted">
            Command centre view for <strong>{jobTitle}</strong> - weighted composite from CV evidence,
            technical assessment, and interview evaluation.
          </p>
        </div>
      </header>

      {busy && (
        <p className="muted" role="status">
          {matchLoading ? 'Analyzing your CV against the job description...' : 'Loading interview evaluation...'}
        </p>
      )}

      <div className="command-centre-hero card">
        <div className="command-centre-score-block">
          <span className="command-centre-score-label">Overall match</span>
          <strong className="command-centre-score-value">{overallScore}</strong>
          <span className={`status-pill ${meetsThreshold ? 'ok' : 'review'}`}>
            {meetsThreshold ? 'Meets role threshold' : 'Below role threshold'}
          </span>
          <span className="command-centre-score-meta tiny muted">
            {match.matchedCount}/{match.totalDimensions} JD dimensions evidenced in CV
          </span>
        </div>
        <div className="command-centre-formula">
          <span className="tiny muted">Score derivation</span>
          <p>
            ({cvScore}% CV x {weightShare(weights.cvMatch, weights)}%) + ({assessmentScore}% assessment x{' '}
            {weightShare(weights.assessment, weights)}%)
            {interviewScore != null ? (
              <>
                {' '}
                + ({interviewScore}% interview x {weightShare(weights.interview, weights)}%)
              </>
            ) : (
              <> - interview pillar pending HR evaluation</>
            )}
          </p>
          <p className="tiny muted">
            Pillar weights follow the recruiter rubric configured in HR portal (read-only here).
          </p>
        </div>
      </div>

      <div className="kpi-row command-centre-kpis">
        <div className="kpi-card command-centre-kpi">
          <Target size={16} aria-hidden />
          <span>CV-JD matching</span>
          <strong>{cvScore}%</strong>
          <em className="tiny muted">+{pillarContribution(cvScore, weights.cvMatch, weights)} pts composite</em>
        </div>
        <div className="kpi-card command-centre-kpi">
          <FileCheck size={16} aria-hidden />
          <span>Technical assessment</span>
          <strong>{assessmentScore}%</strong>
          <em className="tiny muted">+{pillarContribution(assessmentScore, weights.assessment, weights)} pts composite</em>
        </div>
        <div className="kpi-card command-centre-kpi">
          <MessageSquare size={16} aria-hidden />
          <span>Interview evaluation</span>
          <strong>{interviewScore != null ? `${interviewScore}%` : 'Pending'}</strong>
          <em className="tiny muted">
            {interviewScore != null
              ? `+${pillarContribution(interviewScore, weights.interview, weights)} pts composite`
              : interviewCompleted
                ? 'HR review in progress'
                : 'Complete C4 interview first'}
          </em>
        </div>
      </div>

      <div className="command-centre-grid">
        <div className="card command-centre-dimensions">
          <header className="command-centre-panel-head">
            <h3>CV facts and dimension scores</h3>
            <p className="muted tiny">Each row links achievement % to evidence extracted from your CV.</p>
          </header>
          <ul className="command-centre-dim-list">
            {weightedDimensions.map((dim) => {
              const pct = dimensionAchievementPct(dim)
              return (
                <li key={dim.key} className={`command-centre-dim ${dim.matched ? 'matched' : 'gap'}`}>
                  <div className="command-centre-dim-head">
                    <span className="command-centre-dim-label">
                      {dim.label}
                      <span className="tiny muted"> · JD weight {dim.weight}</span>
                    </span>
                    <span className="command-centre-dim-pct">{pct}%</span>
                  </div>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${dim.matched ? 'match' : 'weak'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="command-centre-dim-evidence tiny muted">{dim.evidence}</p>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="stack">
          <div className="card command-centre-tips">
            <header className="command-centre-panel-head">
              <h3>Improvement tips</h3>
              <p className="muted tiny">Actionable suggestions based on gaps in your profile evidence.</p>
            </header>
            <ul className="command-centre-tip-list">
              {tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>

          {interviewReport && (
            <div className="card command-centre-interview">
              <header className="command-centre-panel-head">
                <h3>Interview dimension scores</h3>
                <p className="muted tiny">LLM evaluation from your avatar interview transcript.</p>
              </header>
              <ul className="command-centre-dim-list compact">
                {interviewReport.dimensions.map((dim) => {
                  const pct = dim.maxScore > 0 ? Math.round((dim.score / dim.maxScore) * 100) : dim.score
                  return (
                    <li key={dim.label} className="command-centre-dim matched">
                      <div className="command-centre-dim-head">
                        <span className="command-centre-dim-label">{dim.label}</span>
                        <span className="command-centre-dim-pct">{pct}%</span>
                      </div>
                      <div className="bar-track">
                        <div
                          className={`bar-fill ${pct >= 60 ? 'match' : 'weak'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="command-centre-actions">
        <button type="button" className="primary" onClick={onContinue}>
          View application status <ArrowRight size={16} aria-hidden />
        </button>
      </div>
    </section>
  )
}
