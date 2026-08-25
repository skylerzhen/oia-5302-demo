import { useEffect, useMemo, useState } from 'react'
import { Download, UserCheck, UserX, Zap } from 'lucide-react'
import { useDemo } from '../context/DemoContext'
import { EvidenceModal } from './EvidenceModal'
import { SourceDocumentModal } from './SourceDocumentModal'
import { EvaluationReportPanel } from './EvaluationReportPanel'
import { InterviewReviewPanel } from './InterviewReviewPanel'
import { CandidateJourneyPanel } from './CandidateJourneyPanel'
import { ScoreSummaryPanel } from './ScoreSummaryPanel'
import { CurrentCandidateCard } from './CurrentCandidateCard'
import { Layout } from './Layout'
import { AuditTrailTable } from './AuditTrailTable'
import { MatchDashboard } from './MatchDashboard'
import { PRIMARY_CANDIDATE_ID } from '../data/candidates'
import { FINANCE_JOB } from '../data/job'
import { HR_STEPS } from '../lib/demo'
import { localAi, type AssessmentResult } from '../lib/localAi'
import {
  computeInterviewScoreFromDimensions,
  computeMatchTotalScore,
  computeOverallScore,
  loadJdDimensionWeights,
  loadPillarWeights,
  saveJdDimensionWeights,
  savePillarWeights,
  applyJdWeights,
  type JdDimensionWeight,
  type PillarWeights,
} from '../lib/hrScoring'
import { rankCandidates, type CandidateMatchWithTips } from '../lib/matching'
import { loadLlmMatches } from '../lib/llmMatching'
import { buildAssessmentKey, cachedLlmAssessment } from '../lib/llmRequestCache'
import { profileFieldsKey } from '../lib/profileFieldsKey'
import type { HrStepId } from '../types'

export function HrPortal() {
  const {
    log, integrationSyncs, syncIntegration, pipeline, setPipeline,
    interviewTurns, assessmentScore,
    shortlistedReason, setShortlistedReason,
    disqualifiedReason, setDisqualifiedReason,
    finalReason, setFinalReason,
    hrStep: step, setHrStep: setStep, logout, seedDemoForHr,
    offline, setOffline,
    fields, auditLog,
  } = useDemo()

  const [selectedId, setSelectedId] = useState(PRIMARY_CANDIDATE_ID)
  const [filters, setFilters] = useState({ skill: '', minYears: 0, degree: '' })
  const [exportMsg, setExportMsg] = useState('')
  const [evidenceModal, setEvidenceModal] = useState<{ title: string; evidence: string; source?: string } | null>(null)
  const [sourceDoc, setSourceDoc] = useState<{ title: string; url: string } | null>(null)
  const [decisionType, setDecisionType] = useState<'hire' | 'reject' | null>(pipeline.finalDecisionType)
  const [interviewReport, setInterviewReport] = useState<AssessmentResult | null>(null)
  const [assessmentLoading, setAssessmentLoading] = useState(false)
  const [assessmentError, setAssessmentError] = useState('')
  const [matches, setMatches] = useState<CandidateMatchWithTips[]>(() => rankCandidates())
  const [matchLoading, setMatchLoading] = useState(false)
  const [journeyCandidate, setJourneyCandidate] = useState<string | null>(null)
  const [pillarWeights, setPillarWeights] = useState<PillarWeights>(() => loadPillarWeights())
  const [jdWeights, setJdWeights] = useState<JdDimensionWeight[]>(() => loadJdDimensionWeights())

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (filters.skill && !m.candidate.skills.some((s) => s.toLowerCase().includes(filters.skill.toLowerCase()))) return false
      if (filters.minYears && m.candidate.yearsExperience < filters.minYears) return false
      if (filters.degree && !m.candidate.education.toLowerCase().includes(filters.degree.toLowerCase())) return false
      return true
    }).sort((a, b) => computeMatchTotalScore(b.dimensions, jdWeights) - computeMatchTotalScore(a.dimensions, jdWeights))
  }, [matches, filters, jdWeights])

  const selected = filtered.find((m) => m.candidateId === selectedId) ?? filtered[0]
  const cvScore = useMemo(
    () => computeMatchTotalScore(selected?.dimensions ?? [], jdWeights),
    [selected?.dimensions, jdWeights],
  )
  const interviewPillarScore = useMemo(
    () =>
      interviewReport
        ? computeInterviewScoreFromDimensions(interviewReport.dimensions)
        : null,
    [interviewReport],
  )
  const overallWeightedScore = useMemo(
    () =>
      computeOverallScore(
        cvScore,
        assessmentScore,
        interviewPillarScore,
        pillarWeights,
      ),
    [cvScore, assessmentScore, interviewPillarScore, pillarWeights],
  )

  function handlePillarWeightsChange(next: PillarWeights) {
    setPillarWeights(next)
    savePillarWeights(next)
    log(
      'Recruiter',
      'Scoring weights adjusted',
      `CV ${next.cvMatch} · Assessment ${next.assessment} · Interview ${next.interview}`,
      'H4',
    )
  }

  function handleJdWeightsChange(next: JdDimensionWeight[]) {
    setJdWeights(next)
    saveJdDimensionWeights(next)
    log(
      'Recruiter',
      'JD rubric weights adjusted',
      next.map((w) => `${w.key}=${w.weight}`).join(' · '),
      'H1',
    )
  }
  const readyForInterviewReview = pipeline.interviewCompleted || interviewTurns.length > 0
  const fieldsKey = useMemo(() => profileFieldsKey(fields), [fields])
  const assessmentKey = useMemo(
    () => buildAssessmentKey({
      assessmentScore,
      matchScore: cvScore,
      turns: interviewTurns,
    }),
    [assessmentScore, interviewTurns, cvScore],
  )

  useEffect(() => {
    let active = true
    setMatchLoading(true)
    loadLlmMatches(fields)
      .then(({ matches: next, mode }) => {
        if (!active) return
        setMatches(next)
        log('System', 'LLM CV–JD pool ranked', `${next.length} candidates · mode ${mode}`, 'H1')
      })
      .catch((error: Error) => {
        if (!active) return
        setMatches(rankCandidates())
        log('System', 'LLM match pool failed', error.message, 'H1')
      })
      .finally(() => {
        if (active) setMatchLoading(false)
      })

    return () => { active = false }
  }, [fieldsKey])

  useEffect(() => {
    if (!readyForInterviewReview || interviewTurns.length === 0) {
      setInterviewReport(null)
      return
    }

    let active = true
    setAssessmentLoading(true)
    setAssessmentError('')
    cachedLlmAssessment(assessmentKey, () => localAi.generateAssessment({
      turns: interviewTurns,
      assessmentScore,
      matchScore: cvScore,
      jobTitle: FINANCE_JOB.title,
    }))
      .then((report) => {
        if (!active) return
        setInterviewReport(report)
        log('System', 'LLM interview assessment generated', `${report.dimensions.length} dimensions · mode ${report.mode}`, 'H3')
      })
      .catch((error: Error) => {
        if (!active) return
        setAssessmentError(error.message)
        setInterviewReport(null)
        log('System', 'LLM assessment failed', error.message, 'H3')
      })
      .finally(() => {
        if (active) setAssessmentLoading(false)
      })

    return () => { active = false }
  }, [assessmentKey, readyForInterviewReview])

  useEffect(() => {
    if (!readyForInterviewReview) {
      seedDemoForHr()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const steps = HR_STEPS.map((s) => {
    const locked =
      (s.id === 'H3' && !readyForInterviewReview) ||
      (s.id === 'H4' && !readyForInterviewReview) ||
      (s.id === 'H5' && !pipeline.finalDecisionMade)
    const lockNote =
      s.id === 'H3' || s.id === 'H4' ? 'Complete C4 or load demo data' :
      s.id === 'H5' ? 'Confirm decision in H4 first' :
      undefined
    return { ...s, locked, lockNote: locked ? lockNote : undefined }
  })

  function proceedToFinalDecision() {
    if (!pipeline.shortlisted) {
      setStep('H2')
      return
    }
    setStep('H4')
  }

  function exportCsv() {
    const dimensions = matches[0]?.dimensions.map((dimension) => dimension.label) ?? []
    const header = ['Name', 'CV-JD Match %', 'Qualified', 'Matched', 'Years', 'Degree', ...dimensions]
    const rows = filtered.map((match) => {
      const score = computeMatchTotalScore(match.dimensions, jdWeights)
      const weighted = applyJdWeights(match.dimensions, jdWeights)
      return [
      match.candidate.name,
      `${score}%`,
      score >= 60 ? 'Yes' : 'No',
      `${match.matchedCount}/${match.totalDimensions}`,
      match.candidate.yearsExperience,
      match.candidate.education,
      ...weighted.map((dimension) => `${Math.round((dimension.score / dimension.maxScore) * 100)}%`),
    ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')
    })
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'matches.csv'
    a.click()
    URL.revokeObjectURL(url)
    setExportMsg('Exported')
    log('Recruiter', 'Export', 'Match dashboard CSV with dimension scores', 'H1')
  }

  const layoutProps = {
    role: 'hr' as const,
    offline,
    onToggleOffline: () => setOffline(!offline),
    activeStep: step,
    steps,
    onStepChange: (s: string) => setStep(s as HrStepId),
    onLogout: logout,
    integrationSyncs,
  }

  return (
    <Layout {...layoutProps}>
      {!readyForInterviewReview && (
        <div className="banner-warn">
          No interview recording yet. Demo data loads automatically — or click <strong>Load demo application</strong>.
        </div>
      )}

      {step === 'H1' && (
        <section className="stack">
          <header className="section-head dashboard-head">
            <div>
              <h1>H1 · Matching dashboard</h1>
              <p>{FINANCE_JOB.title} · LLM CV–JD rubric · evidence drill-down · candidate pool from simulated Jadarah read (I1)</p>
            </div>
            {!readyForInterviewReview && (
              <button type="button" className="primary" onClick={seedDemoForHr}>
                <Zap size={16} /> Load demo application
              </button>
            )}
          </header>
          {matchLoading && <p className="muted" role="status">LLM is scoring candidates against the job description…</p>}
          <div className="filters card">
            <input placeholder="Filter: skill (e.g. portfolio)" value={filters.skill} onChange={(e) => setFilters({ ...filters, skill: e.target.value })} />
            <input type="number" placeholder="Min years" value={filters.minYears || ''} onChange={(e) => setFilters({ ...filters, minYears: Number(e.target.value) || 0 })} />
            <input placeholder="Degree keyword" value={filters.degree} onChange={(e) => setFilters({ ...filters, degree: e.target.value })} />
            <button type="button" onClick={exportCsv}><Download size={16} /> Export Excel/CSV</button>
            {exportMsg && <span className="ok-text">{exportMsg}</span>}
          </div>
          <MatchDashboard
            jobTitle={FINANCE_JOB.title}
            matches={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            jdWeights={jdWeights}
            onJdWeightsChange={handleJdWeightsChange}
            onEvidence={(title, evidence, documentText) =>
              setEvidenceModal({ title, evidence, source: documentText })
            }
            onOpenSource={(title, url) => setSourceDoc({ title, url })}
            onViewJourney={setJourneyCandidate}
          />
          <button type="button" className="primary" onClick={() => setStep('H2')}>Continue to shortlist / reject →</button>
        </section>
      )}

      {step === 'H2' && (
        <section className="stack">
          <header className="section-head">
            <div>
              <h1>H2 · Shortlist or reject candidate</h1>
              <p>Review the candidate's match score and decide whether to move forward or disqualify</p>
            </div>
          </header>

          <CurrentCandidateCard
            candidate={selected}
            cvMatchScore={cvScore}
            onChangeCandidate={() => setStep('H1')}
          />

          <div className="grid-2">
            <div className="card">
              <h3>Shortlist for interview</h3>
              <p className="muted">Advance {selected.candidate.name} to the interview stage</p>
              <textarea placeholder="Reason for shortlist (required)" value={shortlistedReason} onChange={(e) => setShortlistedReason(e.target.value)} />
              <button type="button" className="primary" disabled={!shortlistedReason.trim()} onClick={() => {
                setPipeline({ shortlisted: true })
                syncIntegration('jadarah.pipelineStatus', 'H2', `Shortlisted · ${selected.candidate.name}`)
                log('Recruiter', 'Shortlisted', `${selected.candidate.name}: ${shortlistedReason}`, 'H2')
                setStep('H3')
              }}>Shortlist candidate</button>
            </div>
            <div className="card">
              <h3>Disqualify candidate</h3>
              <p className="muted">Remove {selected.candidate.name} from the pipeline</p>
              <textarea placeholder="Reason for disqualify (required)" value={disqualifiedReason} onChange={(e) => setDisqualifiedReason(e.target.value)} />
              <button type="button" className="danger" disabled={!disqualifiedReason.trim()} onClick={() => {
                setPipeline({ disqualified: true })
                syncIntegration('jadarah.pipelineStatus', 'H2', `Disqualified · ${selected.candidate.name}`)
                log('Recruiter', 'Disqualified', `${selected.candidate.name}: ${disqualifiedReason}`, 'H2')
              }}>{pipeline.disqualified ? 'Disqualified · reason recorded' : 'Disqualify candidate'}</button>
            </div>
          </div>
        </section>
      )}

      {step === 'H3' && (
        <section className="stack">
          <header className="section-head">
            <div>
              <h1>H3 · Review interview recording</h1>
              <p className="muted">HR-only · avatar replay + transcript · candidate cannot access.</p>
            </div>
          </header>

          <CurrentCandidateCard
            candidate={selected}
            cvMatchScore={cvScore}
            onChangeCandidate={() => setStep('H1')}
          />
          <div className="kpi-row compact">
            <div className="kpi-card"><span>Assessment</span><strong>{assessmentScore || '—'}%</strong></div>
            <div className="kpi-card"><span>Interview turns</span><strong>{interviewTurns.length}</strong></div>
            <div className="kpi-card"><span>Status</span><strong className="kpi-small">{pipeline.shortlisted ? 'Shortlisted' : 'Pending'}</strong></div>
          </div>
          <InterviewReviewPanel turns={interviewTurns} />
          {assessmentLoading && <p className="muted">Generating LLM assessment from interview transcript…</p>}
          {assessmentError && <p className="danger-text">{assessmentError}</p>}
          {interviewReport && <EvaluationReportPanel report={interviewReport} />}
          <button type="button" className="primary" onClick={proceedToFinalDecision}>
            {pipeline.shortlisted ? 'Proceed to final decision →' : 'Go to shortlist decision →'}
          </button>
        </section>
      )}

      {step === 'H4' && (
        <section className="stack final-decision-screen">
          <header className="section-head">
            <div>
              <h1>H4 · Final human decision</h1>
              <p>AI provides recommendation only — recruiter holds final authority. Outcome syncs to simulated Jadarah + Oracle EBS endpoints.</p>
            </div>
          </header>

          <CurrentCandidateCard
            candidate={selected}
            cvMatchScore={cvScore}
            onChangeCandidate={() => setStep('H1')}
          />

          <ScoreSummaryPanel
            match={selected}
            assessmentScore={assessmentScore}
            interviewReport={interviewReport}
            weights={pillarWeights}
            onWeightsChange={handlePillarWeightsChange}
            jdWeights={jdWeights}
            onJdWeightsChange={handleJdWeightsChange}
          />

          <div className="card stack">
            <div className="ai-rec-card">
            <span className="ai-label">AI recommendation</span>
            <strong>{interviewReport?.recommendation ?? (assessmentLoading ? 'Generating LLM recommendation…' : 'Complete C4 interview to generate recommendation')}</strong>
            <p>
              Overall weighted score {overallWeightedScore}% — CV {cvScore}% · Assessment {assessmentScore}%
              {interviewPillarScore != null && <> · Interview {interviewPillarScore}%</>} · evidence-linked review.
            </p>
          </div>

          <div className="decision-toggle">
            <button type="button" className={`decision-btn hire ${decisionType === 'hire' ? 'selected' : ''}`} onClick={() => setDecisionType('hire')}>
              <UserCheck size={18} /> Recommend hire
            </button>
            <button type="button" className={`decision-btn reject ${decisionType === 'reject' ? 'selected' : ''}`} onClick={() => setDecisionType('reject')}>
              <UserX size={18} /> Reject
            </button>
          </div>

          <textarea placeholder="Final decision reason (required)" value={finalReason} onChange={(e) => setFinalReason(e.target.value)} />

          <button
            type="button"
            className="primary"
            disabled={!finalReason.trim() || !decisionType}
            onClick={() => {
              setPipeline({ finalDecisionMade: true, finalDecisionType: decisionType })
              if (decisionType === 'hire') {
                syncIntegration('jadarah.hireOutcome', 'H4', finalReason)
                syncIntegration('oracle.requisitionSync', 'H4', FINANCE_JOB.title)
                syncIntegration('oracle.hirePersonStub', 'H4', selected.candidate.name)
              } else {
                syncIntegration('jadarah.rejectOutcome', 'H4', finalReason)
              }
              log('Recruiter', decisionType === 'hire' ? 'Hire confirmed' : 'Reject confirmed', finalReason, 'H4')
              setStep('H5')
            }}
          >
            <UserCheck size={16} /> Confirm final decision (human gate)
          </button>
          </div>
        </section>
      )}

      {step === 'H5' && (
        <section className="stack">
          <div className="closing-frame card">
            <h1>H5 · Demo journey complete</h1>
            <ul className="closing-list">
              <li>Dual portals — candidate privacy &amp; HR control</li>
              <li>Evidence-linked AI — parsing, matching, scoring</li>
              <li>Human-in-the-loop — shortlist + final {pipeline.finalDecisionType === 'hire' ? 'hire' : pipeline.finalDecisionType === 'reject' ? 'reject' : 'decision'}</li>
              <li>AI avatar interview — recorded for HR review</li>
            </ul>
            <p className="muted tiny">Production: live Jadarah + Oracle EBS · on-prem models · production ASR/TTS · lip-sync avatar</p>
          </div>
          <AuditTrailTable entries={auditLog} />
        </section>
      )}

      {evidenceModal && <EvidenceModal {...evidenceModal} onClose={() => setEvidenceModal(null)} />}
      {sourceDoc && <SourceDocumentModal {...sourceDoc} onClose={() => setSourceDoc(null)} />}
      {journeyCandidate && (
        <CandidateJourneyPanel
          match={matches.find((m) => m.candidateId === journeyCandidate) ?? matches[0]}
          assessmentScore={assessmentScore}
          interviewTurns={interviewTurns}
          interviewReport={interviewReport}
          pipeline={pipeline}
          onClose={() => setJourneyCandidate(null)}
        />
      )}
    </Layout>
  )
}
