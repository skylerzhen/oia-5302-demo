import { useEffect, useMemo, useState } from 'react'
import { Download, UserCheck, UserX, Zap } from 'lucide-react'
import { useDemo } from '../context/DemoContext'
import { EvidenceModal } from './EvidenceModal'
import { SourceDocumentModal } from './SourceDocumentModal'
import { EvaluationReportPanel } from './EvaluationReportPanel'
import { InterviewReviewPanel } from './InterviewReviewPanel'
import { Layout } from './Layout'
import { MatchDashboard } from './MatchDashboard'
import { PRIMARY_CANDIDATE_ID } from '../data/candidates'
import { FINANCE_JOB } from '../data/job'
import { formatAuditTime } from '../lib/audit'
import { HR_STEPS } from '../lib/demo'
import { localAi, type AssessmentResult } from '../lib/localAi'
import { getMatchById, rankCandidates } from '../lib/matching'
import type { HrStepId } from '../types'

export function HrPortal() {
  const {
    auditLog, log, pipeline, setPipeline,
    interviewTurns, assessmentScore,
    shortlistedReason, setShortlistedReason,
    disqualifiedReason, setDisqualifiedReason,
    finalReason, setFinalReason,
    hrStep: step, setHrStep: setStep, logout, seedDemoForHr,
    offline, setOffline, uiLocale, toggleUiLocale,
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

  const matches = useMemo(() => rankCandidates(), [])
  const filtered = matches.filter((m) => {
    if (filters.skill && !m.candidate.skills.some((s) => s.toLowerCase().includes(filters.skill.toLowerCase()))) return false
    if (filters.minYears && m.candidate.yearsExperience < filters.minYears) return false
    if (filters.degree && !m.candidate.education.toLowerCase().includes(filters.degree.toLowerCase())) return false
    return true
  })

  const selected = getMatchById(selectedId) ?? matches[0]
  const readyForInterviewReview = pipeline.interviewCompleted || interviewTurns.length > 0

  useEffect(() => {
    if (!readyForInterviewReview || interviewTurns.length === 0) {
      setInterviewReport(null)
      return
    }

    let active = true
    setAssessmentLoading(true)
    setAssessmentError('')
    localAi.generateAssessment({
      turns: interviewTurns,
      assessmentScore,
      matchScore: selected.totalScore,
      jobTitle: FINANCE_JOB.title,
    })
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
  }, [assessmentScore, interviewTurns, log, readyForInterviewReview, selected.totalScore])

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
    const header = ['Name', 'Score', 'Qualified', 'Matched', 'Years', 'Degree', ...dimensions]
    const rows = filtered.map((match) => [
      match.candidate.name,
      `${match.totalScore}%`,
      match.qualified ? 'Yes' : 'No',
      `${match.matchedCount}/${match.totalDimensions}`,
      match.candidate.yearsExperience,
      match.candidate.education,
      ...match.dimensions.map((dimension) => `${Math.round((dimension.score / dimension.maxScore) * 100)}%`),
    ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
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

  function exportAuditCsv() {
    const header = 'Timestamp,Step,Actor,Action,Detail'
    const rows = auditLog.map((e) =>
      `${formatAuditTime(e.timestamp)},${e.step},${e.actor},${e.action},"${e.detail.replace(/"/g, '""')}"`,
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'audit-report.csv'
    a.click()
    URL.revokeObjectURL(url)
    log('Recruiter', 'Export', 'Full audit report CSV', 'H5')
  }

  const layoutProps = {
    role: 'hr' as const,
    offline,
    onToggleOffline: () => setOffline(!offline),
    uiLocale,
    onToggleLocale: toggleUiLocale,
    activeStep: step,
    steps,
    onStepChange: (s: string) => setStep(s as HrStepId),
    onLogout: logout,
    auditLog,
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
              <p>{FINANCE_JOB.title} · visual ranking · evidence drill-down</p>
            </div>
            {!readyForInterviewReview && (
              <button type="button" className="primary" onClick={seedDemoForHr}>
                <Zap size={16} /> Load demo application
              </button>
            )}
          </header>
          <div className="filters card">
            <input placeholder="Filter: skill (e.g. portfolio)" value={filters.skill} onChange={(e) => setFilters({ ...filters, skill: e.target.value })} />
            <input type="number" placeholder="Min years" value={filters.minYears || ''} onChange={(e) => setFilters({ ...filters, minYears: Number(e.target.value) || 0 })} />
            <input placeholder="Degree keyword" value={filters.degree} onChange={(e) => setFilters({ ...filters, degree: e.target.value })} />
            <button type="button" onClick={exportCsv}><Download size={16} /> Export Excel/CSV</button>
            {exportMsg && <span className="ok-text">{exportMsg}</span>}
          </div>
          <MatchDashboard jobTitle={FINANCE_JOB.title} matches={filtered} selectedId={selectedId} onSelect={setSelectedId} onEvidence={(title, evidence, documentText) => setEvidenceModal({ title, evidence, source: documentText })} onOpenSource={(title, url) => setSourceDoc({ title, url })} />
          <button type="button" className="primary" onClick={() => setStep('H2')}>Continue to shortlist / reject →</button>
        </section>
      )}

      {step === 'H2' && (
        <section className="grid-2">
          <div className="card">
            <h1>H2 · Shortlist {selected.candidate.name}</h1>
            <p>Match score: <strong>{selected.totalScore}%</strong> · {selected.matchedCount}/{selected.totalDimensions} attributes</p>
            <textarea placeholder="Reason for shortlist (required)" value={shortlistedReason} onChange={(e) => setShortlistedReason(e.target.value)} />
            <button type="button" className="primary" disabled={!shortlistedReason.trim()} onClick={() => {
              setPipeline({ shortlisted: true })
              log('Recruiter', 'Shortlisted', `${selected.candidate.name}: ${shortlistedReason}`, 'H2')
              setStep('H3')
            }}>Shortlist candidate</button>
          </div>
          <div className="card">
            <h1>Disqualify weak match</h1>
            <p>Example: Yusuf Al-Rashdi ({getMatchById('cand-yusuf')?.totalScore}%)</p>
            <textarea placeholder="Reason for disqualify (required)" value={disqualifiedReason} onChange={(e) => setDisqualifiedReason(e.target.value)} />
            <button type="button" className="danger" disabled={!disqualifiedReason.trim()} onClick={() => {
              setPipeline({ disqualified: true })
              log('Recruiter', 'Disqualified', `Yusuf Al-Rashdi: ${disqualifiedReason}`, 'H2')
            }}>{pipeline.disqualified ? 'Disqualified · reason recorded' : 'Disqualify (example)'}</button>
          </div>
        </section>
      )}

      {step === 'H3' && (
        <section className="stack">
          <header className="section-head">
            <h1>H3 · Review interview recording</h1>
            <p className="muted">HR-only · avatar replay + bilingual transcript · candidate cannot access.</p>
          </header>
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
        <section className="card stack final-decision-screen">
          <h1>H4 · Final human decision</h1>
          <p>AI provides recommendation only — recruiter holds final authority with mandatory reason.</p>

          <div className="ai-rec-card">
            <span className="ai-label">AI recommendation</span>
            <strong>{interviewReport?.recommendation ?? (assessmentLoading ? 'Generating LLM recommendation…' : 'Complete C4 interview to generate recommendation')}</strong>
            <p>Based on {selected.totalScore}% match · {assessmentScore}% assessment · evidence-linked interview review.</p>
          </div>

          <div className="decision-toggle">
            <button type="button" className={`decision-btn hire ${decisionType === 'hire' ? 'selected' : ''}`} onClick={() => setDecisionType('hire')}>
              <UserCheck size={18} /> Recommend hire
            </button>
            <button type="button" className={`decision-btn reject ${decisionType === 'reject' ? 'selected' : ''}`} onClick={() => setDecisionType('reject')}>
              <UserX size={18} /> Reject
            </button>
          </div>

          <textarea placeholder="Final decision reason (required for audit)" value={finalReason} onChange={(e) => setFinalReason(e.target.value)} />

          <button
            type="button"
            className="primary"
            disabled={!finalReason.trim() || !decisionType}
            onClick={() => {
              setPipeline({ finalDecisionMade: true, finalDecisionType: decisionType })
              log('Recruiter', decisionType === 'hire' ? 'Hire confirmed' : 'Reject confirmed', finalReason, 'H4')
              setStep('H5')
            }}
          >
            <UserCheck size={16} /> Confirm final decision (human gate)
          </button>
        </section>
      )}

      {step === 'H5' && (
        <section className="stack">
          <header className="section-head dashboard-head">
            <div>
              <h1>H5 · Audit &amp; reports</h1>
              <p>Full traceability — timestamp × role × action × detail</p>
            </div>
            <button type="button" onClick={exportAuditCsv}><Download size={16} /> Export audit CSV</button>
          </header>

          <div className="card audit-full-page">
            <table className="data-table audit-table">
              <thead>
                <tr><th>Timestamp</th><th>Step</th><th>Actor</th><th>Action</th><th>Detail</th></tr>
              </thead>
              <tbody>
                {auditLog.map((e) => (
                  <tr key={e.id}>
                    <td>{formatAuditTime(e.timestamp)}</td>
                    <td><code>{e.step}</code></td>
                    <td>{e.actor}</td>
                    <td><strong>{e.action}</strong></td>
                    <td>{e.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="closing-frame card">
            <h2>Demo journey complete</h2>
            <ul className="closing-list">
              <li>Dual portals — candidate privacy &amp; HR control</li>
              <li>Evidence-linked AI — parsing, matching, scoring</li>
              <li>Human-in-the-loop — shortlist + final {pipeline.finalDecisionType === 'hire' ? 'hire' : pipeline.finalDecisionType === 'reject' ? 'reject' : 'decision'}</li>
              <li>Bilingual interview — EN + AR with avatar recording</li>
              <li>Full audit trail — {auditLog.length} events logged</li>
            </ul>
            <p className="muted tiny">Production: live Jadarah · on-prem models · production ASR/TTS · lip-sync avatar</p>
          </div>
        </section>
      )}

      {evidenceModal && <EvidenceModal {...evidenceModal} onClose={() => setEvidenceModal(null)} />}
      {sourceDoc && <SourceDocumentModal {...sourceDoc} onClose={() => setSourceDoc(null)} />}
    </Layout>
  )
}
