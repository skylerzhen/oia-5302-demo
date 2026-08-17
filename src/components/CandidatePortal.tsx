import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, FileUp, Play, Upload } from 'lucide-react'
import { useDemo } from '../context/DemoContext'
import { AvatarPanel } from './AvatarPanel'
import { VoiceAnswerInput } from './VoiceAnswerInput'
import { EvidenceModal } from './EvidenceModal'
import { SourceDocumentModal } from './SourceDocumentModal'
import { CvParseConfirmModal } from './CvParseConfirmModal'
import { Layout } from './Layout'
import { CV_UPLOAD_SAMPLES, CV_V2_DIFF, emptyProfileFields } from '../data/candidates'
import { resolveSampleProfileId } from '../data/cvParseProfiles'
import { FINANCE_JOB } from '../data/job'
import { MCQ_QUESTIONS, INTERVIEW_PRESET } from '../data/questions'
import { CANDIDATE_STEPS } from '../lib/demo'
import { localAi, type TtsResult } from '../lib/localAi'
import { preloadSpeechVoices, setHeyGenAvatarEnabled, setLiveAvatarEnabled, speakInterviewLine, warmInterviewSpeech } from '../lib/voiceSpeak'
import { ensureLiveAvatarSession, stopLiveAvatarSession } from '../lib/liveavatarPlayer'
import { unlockAudioPlayback } from '../lib/audioUnlock'
import { avatarLipSyncBus } from '../lib/avatarLipSyncBus'
import { controlledViewUrl } from '../lib/controlledDocUrl'
import { applyParsedFields, runCvUploadFlow, type CvUploadProgress } from '../lib/cvUploadFlow'
import type { CvParseFieldResult } from '../data/cvParseProfiles'
import {
  buildImprovementTips,
  buildInterviewFollowUp,
  getInterviewUiPhase,
  type InterviewUiPhase,
} from '../lib/matching'
import { getPrimaryMatch, loadLlmMatches } from '../lib/llmMatching'
import { profileFieldsKey } from '../lib/profileFieldsKey'
import type { CandidateMatchWithTips } from '../lib/matching'
import { scrollElementIntoContent, scrollPageToTop } from '../lib/scrollPageToTop'
import type { CandidateStepId, FieldStatus, InterviewTurn, Viseme } from '../types'

function statusLabel(status: FieldStatus): string {
  if (status === 'parsed') return 'Parsed'
  if (status === 'review') return 'Needs review'
  return 'Missing'
}

export function CandidatePortal() {
  const {
    offline, setOffline, log, integrationSyncs, syncIntegration,
    pipeline, setPipeline,
    fields, setFields, interviewTurns, setInterviewTurns,
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
  const [candidateAnswerEn, setCandidateAnswerEn] = useState('')
  const [avatarSpeaking, setAvatarSpeaking] = useState(false)
  const [avatarCaption, setAvatarCaption] = useState('')
  const [avatarExpression, setAvatarExpression] = useState<'neutral' | 'supportive' | 'curious' | 'gesture'>('neutral')
  const [supportivePrompt, setSupportivePrompt] = useState('')
  const [avatarViseme, setAvatarViseme] = useState<Viseme>('rest')
  const [speechStatus, setSpeechStatus] = useState({ asr: 'browser' })
  const [avatarMode, setAvatarMode] = useState<'2d' | 'heygen' | 'liveavatar'>('2d')
  const [llmBusy, setLlmBusy] = useState(false)
  const [llmError, setLlmError] = useState('')
  const [matchLoading, setMatchLoading] = useState(false)
  const [llmMatch, setLlmMatch] = useState<CandidateMatchWithTips | null>(null)
  const [scanImported, setScanImported] = useState(false)
  const [profileFromCv, setProfileFromCv] = useState(() => fields.some((f) => f.value.trim()))
  const [parsePreview, setParsePreview] = useState<{
    sampleId: string
    fileName: string
    fields: CvParseFieldResult[]
    isScannedPdf: boolean
  } | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [reviewReady, setReviewReady] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadProgress, setUploadProgress] = useState<CvUploadProgress>({ stage: 'idle', progress: 0, message: '' })
  const [evidenceModal, setEvidenceModal] = useState<{ title: string; evidence: string; source?: string } | null>(null)
  const [sourceDoc, setSourceDoc] = useState<{ title: string; url: string } | null>(null)
  const stopAvatarRef = useRef<(() => void) | null>(null)
  const speechAbortRef = useRef<AbortController | null>(null)
  const confirmFieldsRef = useRef<HTMLDivElement | null>(null)
  const submissionReviewRef = useRef<HTMLElement | null>(null)
  const c3SectionRef = useRef<HTMLElement | null>(null)
  const stepTopRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function scrollToElement(element: HTMLElement | null) {
    scrollElementIntoContent(element)
  }

  function stopInterviewSpeech() {
    speechAbortRef.current?.abort()
    speechAbortRef.current = null
    stopAvatarRef.current = null
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    avatarLipSyncBus.reset()
    setAvatarSpeaking(false)
    setAvatarViseme('rest')
  }

  const interviewPhase = getInterviewUiPhase(interviewTurns, pipeline.interviewCompleted)
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
    if (step !== 'C4' || avatarMode !== 'liveavatar') return
    void ensureLiveAvatarSession()
    return () => {
      void stopLiveAvatarSession()
    }
  }, [step, avatarMode])

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
    if (!reviewReady) return
    scrollToElement(submissionReviewRef.current)
  }, [reviewReady])

  async function processCvUpload(input: {
    sampleId: string
    label: string
    filePath?: string
    file?: File
    isScannedPdf?: boolean
  }) {
    if (uploadBusy || uploadedSamples.includes(input.sampleId)) return
    setUploadBusy(true)
    setUploadError('')
    setReviewReady(false)
    setUploadProgress({ stage: 'reading', progress: 0, message: 'Starting upload…' })
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
      setParsePreview({
        sampleId: input.sampleId,
        fileName: result.fileName,
        fields: result.fields,
        isScannedPdf: result.isScannedPdf,
      })
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
    const nextFields = applyParsedFields(emptyProfileFields(), parsePreview.fields)
    setFields(nextFields)
    setScanImported(parsePreview.isScannedPdf)
    setProfileFromCv(true)
    setUploadedSamples((current) => (
      current.includes(parsePreview.sampleId) ? current : [...current, parsePreview.sampleId]
    ))
    log(
      'Candidate',
      parsePreview.isScannedPdf ? 'Scanned CV accepted' : 'CV accepted',
      `${parsePreview.fileName}; profile fields applied after candidate review`,
      'C1',
    )
    setParsePreview(null)
    window.setTimeout(() => scrollToElement(confirmFieldsRef.current), 0)
  }

  function cancelParsePreview() {
    setParsePreview(null)
    setUploadProgress({ stage: 'idle', progress: 0, message: '' })
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)
    handleLocalCvUpload(event.dataTransfer.files)
  }

  async function generateAvatarFollowUp(answer: string, priorTurns = interviewTurns) {
    const candidateTurnCount = priorTurns.filter((turn) => turn.speaker === 'candidate').length
    const trimmedTurns = priorTurns.slice(-4).map((turn) => ({
      speaker: turn.speaker,
      language: turn.language,
      text: turn.text.slice(0, 400),
    }))
    try {
      const result = await Promise.race([
        localAi.followUp({
          answer: answer.slice(0, 1200),
          priorTurns: trimmedTurns,
        }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('LLM follow-up timed out')), 8_000)
        }),
      ])
      log('System', 'LLM follow-up generated', `Mode: ${result.mode}; evidence: ${result.evidencePhrase}`, 'C4')
      return result.text
    } catch (error) {
      const fallback = buildInterviewFollowUp(answer, Math.max(0, candidateTurnCount - 1))
      log('System', 'LLM follow-up fallback', error instanceof Error ? error.message : 'timeout', 'C4')
      return fallback
    }
  }

  async function speakAvatar(turn: InterviewTurn, options?: { addTurn?: boolean; prefetchedTts?: TtsResult | null }) {
    if (options?.addTurn !== false) {
      setInterviewTurns((prev) => [...prev, turn])
    }
    setAvatarCaption(turn.text)
    setAvatarExpression(turn.expression ?? 'neutral')
    setAvatarSpeaking(true)
    setAvatarViseme('rest')

    speechAbortRef.current?.abort()
    const controller = new AbortController()
    speechAbortRef.current = controller
    stopAvatarRef.current = () => controller.abort()

    try {
      const mode = await speakInterviewLine({
        text: turn.text,
        language: turn.language,
        onViseme: setAvatarViseme,
        signal: controller.signal,
        prefetchedTts: options?.prefetchedTts,
      })
      log('System', 'Avatar TTS', `${turn.language}; mode: ${mode}`, 'C4')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'TTS failed'
      log('System', 'Avatar TTS failed', message, 'C4')
    } finally {
      if (speechAbortRef.current === controller) {
        speechAbortRef.current = null
        stopAvatarRef.current = null
      }
      setAvatarSpeaking(false)
      setAvatarViseme('rest')
    }
  }

  async function deliverAvatarFollowUp(followUp: string) {
    const turn: InterviewTurn = {
      id: nextTurnId('fu'),
      speaker: 'avatar',
      language: 'en',
      text: followUp,
      expression: 'curious',
    }
    const ttsPromise = localAi.synthesize({ text: followUp })
    setInterviewTurns((prev) => [...prev, turn])
    setAvatarCaption(followUp)
    setAvatarExpression('curious')
    await speakAvatar(turn, { addTurn: false, prefetchedTts: await ttsPromise })
  }

  async function runLlmInterviewAction(action: () => Promise<void>) {
    setLlmError('')
    setLlmBusy(true)
    try {
      await action()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'LLM request failed'
      setLlmError(message)
      log('System', 'LLM request failed', message, 'C4')
    } finally {
      setLlmBusy(false)
    }
  }

  function nextTurnId(prefix: string) {
    return `${prefix}-${Date.now()}`
  }

  function confirmAllFields() {
    setFields((prev) => prev.map((f) => {
      const value = f.key === 'certification' && !f.value.trim() ? 'CFA Level II (candidate)' : f.value
      return {
        ...f,
        value,
        status: value.trim() ? 'parsed' as const : f.status,
      }
    }))
    log('Candidate', 'Fields confirmed', 'All parsed fields accepted for submission', 'C1')
  }

  const canSubmitProfile =
    profileFromCv &&
    uploadedSamples.length > 0 &&
    fields.every((f) => f.value.trim() && f.status !== 'missing')

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
    if (!avatarSpeaking) return
    stopAvatarRef.current?.()
    setAvatarCaption('I have paused. Please continue when you are ready.')
    setAvatarExpression('supportive')
    setAvatarViseme('rest')
    log('Candidate', 'Avatar interrupted', 'Candidate interrupted the avatar; interview safely paused', 'C4')
  }

  function requestSupportivePause() {
    setSupportivePrompt('Waiting for three seconds before the supportive response…')
    window.setTimeout(() => {
      setAvatarCaption('Take your time. Please share the example when you are ready.')
      setAvatarExpression('supportive')
      setSupportivePrompt('Supportive pause displayed and recorded.')
      log('System', 'Supportive pause', 'Candidate pause of three seconds triggered supportive interview response', 'C4')
    }, 3000)
  }

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
            <section className="stack">
              <header className="section-head">
                <h1>C1 · Apply & confirm profile</h1>
                <p>Upload your CV first — AI extracts fields for you to review, then submit to Jadarah (simulated).</p>
              </header>
              <div className={`card c1-layout ${profileFromCv ? 'grid-2' : 'c1-upload-only'}`}>
                <div className="c1-upload-column">
                  <h3>Upload CV</h3>
                  <p className="muted tiny">Drop a PDF/DOCX here or pick a demo sample. Fields appear only after you confirm the extraction.</p>

                  <div
                    className={`cv-drop-zone ${dragActive ? 'active' : ''} ${uploadBusy ? 'busy' : ''}`}
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
                    <FileUp size={28} aria-hidden />
                    <strong>{dragActive ? 'Drop to upload' : 'Drag & drop your CV here'}</strong>
                    <span>or click to browse · PDF, DOC, DOCX</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      disabled={uploadBusy}
                      onChange={(event) => handleLocalCvUpload(event.target.files)}
                    />
                  </div>

                  {(uploadBusy || uploadProgress.stage === 'done' || uploadProgress.stage === 'error' || uploadError) && (
                    <div className={`upload-progress ${uploadProgress.stage === 'idle' && uploadError ? 'error' : uploadProgress.stage}`}>
                      <div className="upload-progress-head">
                        <strong>
                          {uploadProgress.stage === 'reading' && 'Reading document'}
                          {uploadProgress.stage === 'uploading' && 'Uploading'}
                          {uploadProgress.stage === 'parsing' && 'AI parsing CV'}
                          {uploadProgress.stage === 'mapping' && 'Preparing review'}
                          {uploadProgress.stage === 'done' && 'Ready to review'}
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
                </div>

                {profileFromCv && (
                  <div ref={confirmFieldsRef} className="cv-review-panel">
                    <h3>Your profile</h3>
                    <p className="muted tiny">Edit any field, then submit when everything looks correct.</p>
                    {scanImported && (
                      <div className="parse-note">
                        <strong>Scanned PDF · local OCR</strong>
                        <span>Education was extracted with lower confidence — please verify.</span>
                      </div>
                    )}
                    <div className="field-grid">
                      {fields.map((field) => (
                        <label key={field.key} className={`field-row ${field.status}`}>
                          <div className="field-head">
                            <strong>{field.label}</strong>
                            <span className={`pill ${field.status}`}>{statusLabel(field.status)}</span>
                          </div>
                          <input
                            value={field.value}
                            onChange={(e) => setFields((prev) => prev.map((f) => f.key === field.key ? { ...f, value: e.target.value, status: e.target.value ? 'parsed' : 'missing' } : f))}
                          />
                          <button type="button" className="linkish" onClick={() => setEvidenceModal({ title: field.label, evidence: field.evidence, source: field.source })}>Evidence</button>
                        </label>
                      ))}
                    </div>
                    <div className="actions">
                      <button type="button" onClick={() => { setDraftSaved(true); log('Candidate', 'Draft saved', 'Profile wizard draft', 'C1') }}>Save draft</button>
                      <button type="button" onClick={confirmAllFields}>Confirm all fields</button>
                      <button
                        type="button"
                        className="primary"
                        disabled={!canSubmitProfile}
                        onClick={() => {
                          setReviewReady(true)
                        }}
                      >
                        Review & submit
                      </button>
                    </div>
                    {!canSubmitProfile && (
                      <p className="muted tiny">Fill any missing fields (or click Confirm all fields), then submit.</p>
                    )}
                    {draftSaved && <p className="ok-text">Draft saved.</p>}
                  </div>
                )}
              </div>
              {reviewReady && (
                <section ref={submissionReviewRef} className="card submission-review">
                  <header className="section-head">
                    <div>
                      <h2>Review & submit</h2>
                      <p>Final candidate confirmation before simulated Jadarah profile write-back.</p>
                    </div>
                  </header>
                  <dl>
                    {fields.map((field) => (
                      <div key={field.key}>
                        <dt>{field.label}</dt>
                        <dd>{field.value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="actions">
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
                    setCandidateAnswerEn('')
                    setAvatarCaption('')
                    setAvatarSpeaking(false)
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
                <p>Candidate-only session · HR reviews recording separately · English interview</p>
              </header>
              <div className="interview-steps card">
                <span className={interviewPhase !== 'idle' ? 'done' : 'active'}>1. Interview Q&amp;A</span>
                <span className={pipeline.interviewCompleted ? 'done' : interviewPhase === 'ready_to_finish' ? 'active' : ''}>2. Submit</span>
              </div>
              <div className="grid-2">
                <AvatarPanel
                  speaking={avatarSpeaking}
                  expression={avatarExpression}
                  caption={avatarCaption || 'Start when ready'}
                  viseme={avatarSpeaking ? avatarViseme : undefined}
                  avatarMode={avatarMode}
                />
                <div className="card stack">
                  {llmBusy && (
                    <div className="interview-loading" role="status" aria-live="polite">
                      <span className="interview-loading-spinner" aria-hidden="true" />
                      <span>{interviewLoadingMessage(interviewStarted, interviewPhase, interviewTurns.length)}</span>
                    </div>
                  )}
                  {!interviewStarted ? (
                    <button type="button" className="primary" disabled={llmBusy} onClick={() => {
                      unlockAudioPlayback()
                      void runLlmInterviewAction(async () => {
                        setInterviewStarted(true)
                        const openingQuestion = INTERVIEW_PRESET[0].text
                        await speakAvatar({ id: nextTurnId('g'), speaker: 'avatar', language: 'en', text: openingQuestion, expression: 'neutral' })
                      })
                    }}><Play size={16} /> Start interview</button>
                  ) : (
                    <>
                      <div className="transcript">
                        {interviewTurns.map((t) => (
                          <div key={t.id} className={`turn ${t.speaker}`}>
                            <strong>{t.speaker}</strong><p>{t.text}</p>
                          </div>
                        ))}
                      </div>
                      {llmError && <p className="danger-text">{llmError}</p>}
                      {avatarSpeaking && (
                        <button type="button" className="danger" onClick={interruptAvatar}>
                          Interrupt avatar
                        </button>
                      )}

                      {interviewPhase === 'english_answer' && (
                        <div className="stack">
                          <p className="muted tiny">Answer via microphone or typing, then submit when ready.</p>
                          <VoiceAnswerInput
                            key="c4-english-answer"
                            value={candidateAnswerEn}
                            onChange={setCandidateAnswerEn}
                            disabled={avatarSpeaking || llmBusy}
                            placeholder="Your answer..."
                            submitLabel={llmBusy ? 'Generating follow-up…' : 'Send answer'}
                            submitDisabled={llmBusy}
                            asrProvider={speechStatus.asr}
                            onSubmit={() => {
                              unlockAudioPlayback()
                              const ans = candidateAnswerEn.trim()
                              void (async () => {
                                setLlmError('')
                                setLlmBusy(true)
                                try {
                                  const candidateTurn = { id: nextTurnId('c-en'), speaker: 'candidate' as const, language: 'en' as const, text: ans }
                                  const updatedTurns = [...interviewTurns, candidateTurn]
                                  setInterviewTurns(updatedTurns)
                                  setCandidateAnswerEn('')
                                  const followUp = await generateAvatarFollowUp(ans, updatedTurns)
                                  setLlmBusy(false)
                                  await deliverAvatarFollowUp(followUp)
                                } catch (error) {
                                  const message = error instanceof Error ? error.message : 'LLM request failed'
                                  setLlmError(message)
                                  log('System', 'LLM request failed', message, 'C4')
                                  setLlmBusy(false)
                                }
                              })()
                            }}
                          />
                          <button type="button" onClick={requestSupportivePause} disabled={avatarSpeaking}>
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
                          <p className="ok-text">Interview recorded. Submit to unlock C5 and sync with HR review.</p>
                          <button type="button" className="primary" onClick={() => {
                            stopInterviewSpeech()
                            setPipeline({ interviewCompleted: true })
                            syncIntegration('jadarah.interviewRecord', 'C4', `${interviewTurns.length} turns recorded`)
                            log('Candidate', 'Interview completed', 'Recording saved for HR review', 'C4')
                            setStep('C5')
                          }}>Submit interview &amp; continue →</button>
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
      {parsePreview && (
        <CvParseConfirmModal
          fileName={parsePreview.fileName}
          fields={applyParsedFields(emptyProfileFields(), parsePreview.fields)}
          isScannedPdf={parsePreview.isScannedPdf}
          onConfirm={acceptParsePreview}
          onCancel={cancelParsePreview}
        />
      )}
    </>
  )
}

function interviewLoadingMessage(
  interviewStarted: boolean,
  phase: InterviewUiPhase,
  turnCount: number,
): string {
  if (!interviewStarted || turnCount === 0) return 'Generating opening question…'
  if (phase === 'english_answer') return 'Thinking…'
  return 'AI is preparing the next step…'
}
