import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Play, Upload } from 'lucide-react'
import { useDemo } from '../context/DemoContext'
import { AvatarPanel } from './AvatarPanel'
import { VoiceAnswerInput } from './VoiceAnswerInput'
import { EvidenceModal } from './EvidenceModal'
import { SourceDocumentModal } from './SourceDocumentModal'
import { Layout } from './Layout'
import {
  CV_UPLOAD_SAMPLES,
  CV_V2_DIFF,
  PRIMARY_CANDIDATE_ID,
} from '../data/candidates'
import { FINANCE_JOB } from '../data/job'
import { MCQ_QUESTIONS } from '../data/questions'
import { CANDIDATE_STEPS } from '../lib/demo'
import { localAi } from '../lib/localAi'
import { preloadSpeechVoices, speakInterviewLine } from '../lib/voiceSpeak'
import { controlledViewUrl } from '../lib/controlledDocUrl'
import { applyParsedFields, runCvUploadFlow, type CvUploadProgress } from '../lib/cvUploadFlow'
import {
  buildImprovementTips,
  getInterviewUiPhase,
  getMatchById,
  type InterviewUiPhase,
} from '../lib/matching'
import { scrollElementIntoContent, scrollPageToTop } from '../lib/scrollPageToTop'
import type { CandidateStepId, FieldStatus, InterviewTurn, Viseme } from '../types'

function statusLabel(status: FieldStatus): string {
  if (status === 'parsed') return 'Parsed'
  if (status === 'review') return 'Needs review'
  return 'Missing'
}

export function CandidatePortal() {
  const {
    offline, setOffline, uiLocale, toggleUiLocale, auditLog, log, pipeline, setPipeline,
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
  const [candidateAnswerAr, setCandidateAnswerAr] = useState('')
  const [avatarSpeaking, setAvatarSpeaking] = useState(false)
  const [avatarLanguage, setAvatarLanguage] = useState<'en' | 'ar'>('en')
  const [avatarCaption, setAvatarCaption] = useState('')
  const [avatarExpression, setAvatarExpression] = useState<'neutral' | 'supportive' | 'curious' | 'gesture'>('neutral')
  const [supportivePrompt, setSupportivePrompt] = useState('')
  const [avatarViseme, setAvatarViseme] = useState<Viseme>('rest')
  const [speechStatus, setSpeechStatus] = useState({ tts: 'browser', asr: 'browser', viseme: 'estimated' })
  const [localAiMode, setLocalAiMode] = useState<'model' | 'adapter-fallback' | 'browser' | 'unavailable'>('unavailable')
  const [llmBusy, setLlmBusy] = useState(false)
  const [llmError, setLlmError] = useState('')
  const [scanImported, setScanImported] = useState(false)
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
  const stepTopRef = useRef<HTMLDivElement | null>(null)

  function scrollToElement(element: HTMLElement | null) {
    scrollElementIntoContent(element)
  }

  const match = getMatchById(PRIMARY_CANDIDATE_ID)
  const interviewPhase = getInterviewUiPhase(interviewTurns, pipeline.interviewCompleted)

  useEffect(() => {
    if (step === 'C3' && !examSubmitted && !examStartedAt) setExamStartedAt(Date.now())
  }, [examStartedAt, examSubmitted, step])

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
    preloadSpeechVoices()
    localAi.status()
      .then((status) => {
        setLocalAiMode(status.mode)
        setSpeechStatus({
          tts: status.speech?.ttsProvider ?? (status.services.tts ? 'server' : 'browser'),
          asr: status.speech?.asrProvider ?? 'browser',
          viseme: status.speech?.visemeSource ?? 'estimated',
        })
      })
      .catch(() => setLocalAiMode('unavailable'))
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
    isArabicScan?: boolean
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
          isArabicScan: input.isArabicScan,
        },
        setUploadProgress,
      )
      setUploadedSamples((current) => [...current, input.sampleId])
      setFields((prev) => applyParsedFields(prev, result.fields))
      setScanImported(result.isArabicScan)
      log('System', 'LLM CV parsing invoked', `${result.fileName}; ${result.fileSize} bytes; mode: ${result.mode}`, 'C1')
      if (result.isArabicScan) {
        log('Candidate', 'Arabic scanned CV uploaded', `${result.fileName}; education requires review`, 'C1')
      } else {
        log('Candidate', 'CV uploaded', `${result.fileName}; fields mapped from controlled input`, 'C1')
      }
      scrollToElement(confirmFieldsRef.current)
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
    const isArabicScan = normalized.includes('arabic') || normalized.includes('noor') || normalized.includes('scan')
    const sampleId = isArabicScan ? 'pdf-ar-scan' : normalized.endsWith('.docx') ? 'docx-en' : `local-${file.name}`
    void processCvUpload({ sampleId, label: file.name, file, isArabicScan })
  }

  function candidateProfileInput() {
    return Object.fromEntries(fields.map((field) => [field.key, field.value]))
  }

  async function generateAvatarQuestion(language: 'en' | 'ar', purpose: 'opening' | 'arabic-segment') {
    const result = await localAi.generateQuestion({
      language,
      purpose,
      candidateProfile: candidateProfileInput(),
    })
    setLocalAiMode(result.mode)
    return result.text
  }

  async function generateAvatarFollowUp(answer: string, language: 'en' | 'ar', priorTurns = interviewTurns) {
    const result = await localAi.followUp({
      answer,
      language,
      priorTurns: priorTurns.map((turn) => ({
        speaker: turn.speaker,
        language: turn.language,
        text: turn.text,
      })),
    })
    setLocalAiMode(result.mode)
    log('System', 'LLM follow-up generated', `Mode: ${result.mode}; evidence: ${result.evidencePhrase}`, 'C4')
    return result.text
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

  async function speakAvatar(turn: InterviewTurn) {
    setInterviewTurns((prev) => [...prev, turn])
    setAvatarLanguage(turn.language)
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
        uiLocale={uiLocale}
        onToggleLocale={toggleUiLocale}
        activeStep={step}
        steps={steps}
        onStepChange={(s) => setStep(s as CandidateStepId)}
        onLogout={logout}
        auditLog={auditLog.filter((e) => e.actor === 'Candidate' || e.actor === 'System')}
      >
          <div ref={stepTopRef} className="step-scroll-anchor" aria-hidden="true" />
          {step === 'C1' && (
            <section className="stack">
              <header className="section-head">
                <h1>C1 · Apply & confirm profile</h1>
                <p>Upload CV → review parsed fields → submit to Jadarah (simulated).</p>
              </header>
              <div className="card grid-2">
                <div>
                  <h3>Upload CV</h3>
                  <p className="muted tiny">Select a controlled sample or a local file. The app reads the document, uploads it to the local parser, then maps extracted fields.</p>
                  {(uploadBusy || uploadProgress.stage === 'done' || uploadProgress.stage === 'error' || uploadError) && (
                    <div className={`upload-progress ${uploadProgress.stage === 'idle' && uploadError ? 'error' : uploadProgress.stage}`}>
                      <div className="upload-progress-head">
                        <strong>
                          {uploadProgress.stage === 'reading' && 'Reading document'}
                          {uploadProgress.stage === 'uploading' && 'Uploading'}
                          {uploadProgress.stage === 'parsing' && 'Parsing'}
                          {uploadProgress.stage === 'mapping' && 'Mapping fields'}
                          {uploadProgress.stage === 'done' && 'Complete'}
                          {(uploadProgress.stage === 'error' || uploadError) && 'Upload failed'}
                        </strong>
                        <span>{uploadProgress.progress}%</span>
                      </div>
                      <div className="upload-progress-bar"><span style={{ width: `${uploadProgress.progress}%` }} /></div>
                      <p className="danger-text">{uploadError || uploadProgress.message}</p>
                    </div>
                  )}
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
                              isArabicScan: sample.id === 'pdf-ar-scan',
                            })
                          }}
                        >
                          <Upload size={16} /> {uploadedSamples.includes(sample.id) ? 'Uploaded' : 'Upload'} {sample.label}
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
                  <label className="local-upload">
                    <span>Upload a local PDF or DOCX</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      disabled={uploadBusy}
                      onChange={(event) => handleLocalCvUpload(event.target.files)}
                    />
                  </label>
                </div>
                <div ref={confirmFieldsRef} className="cv-review-panel">
                  <h3>Confirm extracted fields</h3>
                  {scanImported && (
                    <div className="parse-note">
                      <strong>Arabic scanned PDF · local OCR</strong>
                      <span>Education was extracted with 82% confidence and is marked for candidate review.</span>
                    </div>
                  )}
                  <div className="field-grid">
                    {fields.map((field) => (
                      <label key={field.key} className={`field-row ${field.status}`}>
                        <div className="field-head">
                          <strong>{uiLocale === 'ar' ? field.labelAr : field.label}</strong>
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
                  {!canSubmitProfile && uploadedSamples.length > 0 && (
                    <p className="muted tiny">Upload CV, fill missing fields (or click Confirm all fields), then submit.</p>
                  )}
                  {draftSaved && <p className="ok-text">Draft saved.</p>}
                </div>
              </div>
              {reviewReady && (
                <section ref={submissionReviewRef} className="card submission-review">
                  <header className="section-head">
                    <div>
                      <h2>Review & submit</h2>
                      <p>Final candidate confirmation before the simulated Jadarah write-back.</p>
                    </div>
                  </header>
                  <dl>
                    {fields.map((field) => (
                      <div key={field.key}>
                        <dt>{uiLocale === 'ar' ? field.labelAr : field.label}</dt>
                        <dd>{field.value || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="actions">
                    <button type="button" onClick={() => setReviewReady(false)}>Back to edit</button>
                    <button type="button" className="primary" onClick={() => {
                      setPipeline({ profileSubmitted: true })
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
                log('Candidate', 'Diff accepted', 'Profile updated from new CV', 'C2')
                setStep('C3')
              }}>Accept & continue to assessment</button>
            </section>
          )}

          {step === 'C3' && (
            <section className="card stack">
              <h1>C3 · Assessment exam</h1>
              <p className="muted">Bilingual MCQ · role-specific · auto-scored on submit.</p>
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
                      <p className="mcq-ar" dir="rtl">{q.promptAr}</p>
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
                      log('Candidate', 'Assessment submitted', `Score ${score}% · accuracy ${score}% · duration ${durationSec}s · benchmark 70%`, 'C3')
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
                    setCandidateAnswerAr('')
                    setAvatarCaption('')
                    setAvatarSpeaking(false)
                    setPipeline({ assessmentSubmitted: true, interviewCompleted: false })
                    setOffline(true)
                    log('System', 'Offline interview policy enabled', 'External browser egress blocked for avatar interview segment', 'C4')
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
                <p>Candidate-only session · HR reviews recording separately · LLM: <strong>{localAiMode}</strong> · TTS: <strong>{speechStatus.tts}</strong> · ASR: <strong>{speechStatus.asr}</strong> · Lip-sync: <strong>{speechStatus.viseme}</strong></p>
              </header>
              <div className="interview-steps card">
                <span className={interviewPhase !== 'idle' ? 'done' : 'active'}>1. English Q&amp;A</span>
                <span className={interviewPhase === 'arabic_answer' || interviewPhase === 'ready_to_finish' ? 'done' : interviewPhase === 'english_done' ? 'active' : ''}>2. Arabic segment</span>
                <span className={pipeline.interviewCompleted ? 'done' : ''}>3. Submit</span>
              </div>
              <div className="grid-2">
                <AvatarPanel
                  speaking={avatarSpeaking}
                  language={avatarLanguage}
                  expression={avatarExpression}
                  caption={avatarCaption || 'Start when ready'}
                  viseme={avatarSpeaking ? avatarViseme : undefined}
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
                      void runLlmInterviewAction(async () => {
                        const openingQuestion = await generateAvatarQuestion('en', 'opening')
                        setInterviewStarted(true)
                        await speakAvatar({ id: nextTurnId('g'), speaker: 'avatar', language: 'en', text: openingQuestion, expression: 'gesture' })
                      })
                    }}><Play size={16} /> {llmBusy ? 'Generating opening question…' : 'Start interview'}</button>
                  ) : (
                    <>
                      <div className="transcript">
                        {interviewTurns.map((t) => (
                          <div key={t.id} className={`turn ${t.speaker}`} dir={t.language === 'ar' ? 'rtl' : 'ltr'}>
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
                          <p className="muted tiny">Step 1/3 · Answer in English (microphone or typing), then continue to the Arabic segment.</p>
                          <VoiceAnswerInput
                            key="c4-english-answer"
                            language="en"
                            value={candidateAnswerEn}
                            onChange={setCandidateAnswerEn}
                            disabled={avatarSpeaking || llmBusy}
                            placeholder="Your answer (English)..."
                            submitLabel={llmBusy ? 'Generating follow-up…' : 'Send English answer'}
                            submitDisabled={llmBusy}
                            onSubmit={() => {
                              const ans = candidateAnswerEn.trim()
                              void runLlmInterviewAction(async () => {
                                const candidateTurn = { id: nextTurnId('c-en'), speaker: 'candidate' as const, language: 'en' as const, text: ans }
                                const updatedTurns = [...interviewTurns, candidateTurn]
                                setInterviewTurns(updatedTurns)
                                setCandidateAnswerEn('')
                                const followUp = await generateAvatarFollowUp(ans, 'en', updatedTurns)
                                await speakAvatar({ id: nextTurnId('fu'), speaker: 'avatar', language: 'en', text: followUp, expression: 'curious' })
                              })
                            }}
                          />
                          <button type="button" onClick={requestSupportivePause} disabled={avatarSpeaking}>
                            I need a moment (3-second supportive response)
                          </button>
                          {supportivePrompt && <p className="muted tiny">{supportivePrompt}</p>}
                        </div>
                      )}

                      {interviewPhase === 'english_done' && (
                        <div className="stack">
                          <p className="ok-text">English segment complete. Continue to the required Arabic question.</p>
                          <button type="button" className="primary" disabled={avatarSpeaking || llmBusy} onClick={() => {
                            void runLlmInterviewAction(async () => {
                              const arabicQuestion = await generateAvatarQuestion('ar', 'arabic-segment')
                              await speakAvatar({ id: nextTurnId('ar-q'), speaker: 'avatar', language: 'ar', text: arabicQuestion, expression: 'neutral' })
                            })
                          }}>{llmBusy ? 'Generating Arabic question…' : 'Continue to Arabic segment →'}</button>
                        </div>
                      )}

                      {interviewPhase === 'arabic_answer' && (
                        <div className="stack">
                          <p className="muted tiny">Step 2/3 · Answer in Arabic to finish the interview.</p>
                          <VoiceAnswerInput
                            key="c4-arabic-answer"
                            language="ar"
                            value={candidateAnswerAr}
                            onChange={setCandidateAnswerAr}
                            disabled={avatarSpeaking || llmBusy}
                            placeholder="إجابتكم بالعربية..."
                            submitLabel={llmBusy ? 'Generating follow-up…' : 'Send Arabic answer'}
                            submitDisabled={llmBusy}
                            onSubmit={() => {
                              const ans = candidateAnswerAr.trim()
                              void runLlmInterviewAction(async () => {
                                const candidateTurn = { id: nextTurnId('c-ar'), speaker: 'candidate' as const, language: 'ar' as const, text: ans }
                                const updatedTurns = [...interviewTurns, candidateTurn]
                                setInterviewTurns(updatedTurns)
                                setCandidateAnswerAr('')
                                const followUp = await generateAvatarFollowUp(ans, 'ar', updatedTurns)
                                await speakAvatar({ id: nextTurnId('fu-ar'), speaker: 'avatar', language: 'ar', text: followUp, expression: 'supportive' })
                              })
                            }}
                          />
                        </div>
                      )}

                      {interviewPhase === 'ready_to_finish' && !pipeline.interviewCompleted && (
                        <div className="stack">
                          <p className="ok-text">Both language segments recorded. Submit to unlock C5 and sync with HR review.</p>
                          <button type="button" className="primary" onClick={() => {
                            setPipeline({ interviewCompleted: true })
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

          {step === 'C5' && match && (
            <section className="card stack">
              <h1>C5 · My match score & tips</h1>
              <p>Match: <strong>{match.totalScore}%</strong> for {FINANCE_JOB.title}</p>
              <p className="muted">Assessment: {assessmentScore}% · Interview submitted — awaiting HR decision.</p>
              <ul>{buildImprovementTips(match).map((t) => <li key={t}>{t}</li>)}</ul>
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

function interviewLoadingMessage(
  interviewStarted: boolean,
  phase: InterviewUiPhase,
  turnCount: number,
): string {
  if (!interviewStarted || turnCount === 0) return 'Generating opening question…'
  if (phase === 'english_done') return 'Generating Arabic question…'
  if (phase === 'english_answer' || phase === 'arabic_answer') return 'Generating follow-up question…'
  return 'AI is preparing the next step…'
}
