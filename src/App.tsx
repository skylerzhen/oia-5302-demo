import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, LogOut, Map, Shield, Zap } from 'lucide-react'
import { createAuditEntry } from './lib/audit'
import { clearLlmRequestCache } from './lib/llmRequestCache'
import {
  createSimulatedIntegrationSync,
  formatIntegrationAuditDetail,
} from './lib/simulatedIntegrations'
import {
  clearSession,
  defaultSession,
  DEMO_SESSION_STORAGE_KEY,
  loadSession,
  parseStoredSession,
  saveSession,
  type DemoSession,
} from './lib/session'
import { createDemoPipelinePatch, createDemoCandidateC4Patch } from './lib/demoSeed'
import { saveInterviewConfig } from './lib/interviewConfig'
import { readDemoJumpTarget } from './lib/demoJump'
import { enableExternalEgressGuard } from './lib/egressGuard'
import { RoleSelect } from './components/RoleSelect'
import { CandidatePortal } from './components/CandidatePortal'
import { HrPortal } from './components/HrPortal'
import { DemoContext, type DemoContextValue, useDemo } from './context/DemoContext'
import type { CandidateStepId, HrStepId, PipelineStatus, ProfileField, UserRole } from './types'
import './App.css'

type JourneyStepStatus = 'pending' | 'active' | 'complete'

interface JourneyTestStep {
  id: string
  order: number
  label: string
  detail: string
  candidateStep?: CandidateStepId
  hrStep?: HrStepId
  surface: 'candidate' | 'hr' | 'both'
}

const JOURNEY_TEST_STEPS: JourneyTestStep[] = [
  { id: 'J01', order: 1, label: 'Apply and upload CV', detail: 'Candidate submits CV for parsing', candidateStep: 'C1', surface: 'candidate' },
  { id: 'J02', order: 2, label: 'Confirm extracted profile', detail: 'Candidate reviews AI extraction', candidateStep: 'C2', surface: 'candidate' },
  { id: 'J03', order: 3, label: 'Review queues and JD config', detail: 'HR ranks pool and sets interview blueprint', hrStep: 'H1', surface: 'hr' },
  { id: 'J04', order: 4, label: 'Technical assessment', detail: 'Role MCQ auto-scored', candidateStep: 'C3', surface: 'candidate' },
  { id: 'J05', order: 5, label: 'AI avatar interview', detail: 'LiveAvatar segment with transcript', candidateStep: 'C4', surface: 'candidate' },
  { id: 'J06', order: 6, label: 'Interview recording review', detail: 'HR replays turns and LLM evaluation', hrStep: 'H3', surface: 'hr' },
  { id: 'J07', order: 7, label: 'Match score and tips', detail: 'Candidate command centre composite', candidateStep: 'C5', surface: 'candidate' },
  { id: 'J08', order: 8, label: 'Shortlist or decline', detail: 'HR gate with written reason', hrStep: 'H2', surface: 'hr' },
  { id: 'J09', order: 9, label: 'Final human decision', detail: 'Weighted composite and hire/reject', hrStep: 'H4', surface: 'hr' },
  { id: 'J10', order: 10, label: 'Application status', detail: 'Candidate sees HR outcome', candidateStep: 'C6', surface: 'candidate' },
  { id: 'J11', order: 11, label: 'Audit and demo complete', detail: 'Recruiter audit trail export', hrStep: 'H5', surface: 'hr' },
  { id: 'J12', order: 12, label: 'Dual-portal verification', detail: 'Same record across Candidate and HR tabs', surface: 'both' },
]

function journeyHasCvData(fields: ProfileField[]) {
  return fields.some((f) => f.value.trim().length > 0)
}

function resolveJourneyStepStatus(
  step: JourneyTestStep,
  pipeline: PipelineStatus,
  fields: ProfileField[],
  interviewTurnCount: number,
  candidateStep: CandidateStepId,
  hrStep: HrStepId,
): JourneyStepStatus {
  const p = pipeline
  const hasCv = journeyHasCvData(fields)

  switch (step.id) {
    case 'J01':
      return hasCv || p.profileSubmitted ? 'complete' : candidateStep === 'C1' ? 'active' : 'pending'
    case 'J02':
      if (p.profileSubmitted) return 'complete'
      return candidateStep === 'C2' ? 'active' : hasCv ? 'active' : 'pending'
    case 'J03':
      if (p.profileSubmitted && hasCv) return 'complete'
      return hrStep === 'H1' ? 'active' : hasCv ? 'active' : 'pending'
    case 'J04':
      if (p.assessmentSubmitted) return 'complete'
      return candidateStep === 'C3' ? 'active' : p.profileSubmitted ? 'active' : 'pending'
    case 'J05':
      if (p.interviewCompleted) return 'complete'
      if (interviewTurnCount > 0 || candidateStep === 'C4') return 'active'
      return p.assessmentSubmitted ? 'active' : 'pending'
    case 'J06':
      if (p.interviewCompleted && interviewTurnCount > 0) return 'complete'
      return hrStep === 'H3' && interviewTurnCount > 0 ? 'active' : interviewTurnCount > 0 ? 'active' : 'pending'
    case 'J07':
      if (p.interviewCompleted && candidateStep === 'C6') return 'complete'
      return candidateStep === 'C5' ? 'active' : p.interviewCompleted ? 'active' : 'pending'
    case 'J08':
      if (p.shortlisted || p.disqualified) return 'complete'
      return hrStep === 'H2' ? 'active' : p.interviewCompleted ? 'active' : 'pending'
    case 'J09':
      if (p.finalDecisionMade) return 'complete'
      return hrStep === 'H4' ? 'active' : p.shortlisted ? 'active' : 'pending'
    case 'J10':
      if (p.finalDecisionMade) return 'complete'
      return candidateStep === 'C6' ? 'active' : p.finalDecisionMade ? 'complete' : 'pending'
    case 'J11':
      return p.finalDecisionMade && hrStep === 'H5' ? 'complete' : p.finalDecisionMade ? 'active' : 'pending'
    case 'J12':
      return p.profileSubmitted && (p.shortlisted || p.disqualified || p.finalDecisionMade)
        ? 'complete'
        : hasCv
          ? 'active'
          : 'pending'
    default:
      return 'pending'
  }
}

function journeyStatusLabel(status: JourneyStepStatus) {
  if (status === 'complete') return 'Complete'
  if (status === 'active') return 'In progress'
  return 'Pending'
}

function journeyStatusClass(status: JourneyStepStatus) {
  if (status === 'complete') return 'ok'
  if (status === 'active') return 'review'
  return 'pending'
}

function JourneyTestChannel() {
  const {
    pipeline,
    fields,
    interviewTurns,
    candidateStep,
    hrStep,
    assessmentScore,
    setRole,
    setCandidateStep,
    setHrStep,
    returnToEntry,
    seedDemoForHr,
    seedDemoForCandidateC4,
    log,
  } = useDemo()

  const hasApplication = pipeline.profileSubmitted || fields.some((f) => f.value.trim().length > 0)

  function openCandidate(step: CandidateStepId) {
    setCandidateStep(step)
    setRole('candidate')
    log('Journey test', 'Open candidate portal', `Jumped to ${step}`, 'Journey')
  }

  function openHr(step: HrStepId) {
    setHrStep(step)
    setRole('hr')
    log('Journey test', 'Open HR portal', `Jumped to ${step}`, 'Journey')
  }

  return (
    <div className="journey-test-screen">
      <aside className="journey-test-brand">
        <Shield size={28} aria-hidden />
        <h1>Journey Test Channel</h1>
        <p>PDF screen 03 - navigation only</p>
        <ul className="journey-test-brand-list">
          <li>One application record</li>
          <li>No third data copy</li>
          <li>Dual-portal UIS acceptance</li>
        </ul>
      </aside>

      <main className="journey-test-main">
        <header className="journey-test-head card">
          <div>
            <span className="portal-auth-screen-id">03 Journey Test</span>
            <h2>12-step acceptance navigator</h2>
            <p className="muted">
              Jump into Candidate or HR at any step. Open a second browser tab on the other portal to verify the same record.
            </p>
          </div>
          <div className="journey-test-head-actions">
            <button type="button" className="portal-auth-secondary" onClick={returnToEntry}>
              <LogOut size={16} aria-hidden /> Exit to portals
            </button>
          </div>
        </header>

        <div className="kpi-row journey-test-kpis">
          <div className="kpi-card">
            <span>Application record</span>
            <strong className="kpi-small">{hasApplication ? 'Live in session' : 'Empty - load demo'}</strong>
          </div>
          <div className="kpi-card">
            <span>Candidate step</span>
            <strong>{candidateStep}</strong>
          </div>
          <div className="kpi-card">
            <span>HR step</span>
            <strong>{hrStep}</strong>
          </div>
          <div className="kpi-card">
            <span>Interview turns</span>
            <strong>{interviewTurns.length}</strong>
          </div>
        </div>

        <div className="journey-test-actions card">
          <p className="muted tiny">Demo seeds write to the same session - not a forked copy.</p>
          <div className="journey-test-action-row">
            <button type="button" className="primary-outline" onClick={seedDemoForHr}>
              <Zap size={16} aria-hidden /> Load demo application (Sara)
            </button>
            <button type="button" className="primary-outline" onClick={seedDemoForCandidateC4}>
              <Zap size={16} aria-hidden /> Jump to C4 interview ready
            </button>
            <button type="button" className="primary" onClick={() => openCandidate('C1')}>
              Open Candidate portal <ArrowRight size={16} aria-hidden />
            </button>
            <button type="button" className="primary" onClick={() => openHr('H1')}>
              Open HR portal <ArrowRight size={16} aria-hidden />
            </button>
          </div>
        </div>

        <div className="card journey-test-table-card">
          <header className="journey-test-table-head">
            <Map size={18} aria-hidden />
            <div>
              <h3>Unified journey steps</h3>
              <p className="muted tiny">Assessment score: {assessmentScore || '-'}% when submitted</p>
            </div>
          </header>
          <div className="journey-test-table-wrap">
            <table className="rank-table journey-test-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Step</th>
                  <th>Surface</th>
                  <th>Status</th>
                  <th>Navigate</th>
                </tr>
              </thead>
              <tbody>
                {JOURNEY_TEST_STEPS.map((step) => {
                  const status = resolveJourneyStepStatus(
                    step,
                    pipeline,
                    fields,
                    interviewTurns.length,
                    candidateStep,
                    hrStep,
                  )
                  return (
                    <tr key={step.id} className={status === 'active' ? 'live-application-row' : ''}>
                      <td><code className="queue-app-id">{step.id}</code></td>
                      <td>
                        <strong>{step.label}</strong>
                        <span className="journey-step-detail">{step.detail}</span>
                      </td>
                      <td>
                        <span className="status-pill mode">{step.surface}</span>
                      </td>
                      <td>
                        <span className={`status-pill ${journeyStatusClass(status)}`}>{journeyStatusLabel(status)}</span>
                      </td>
                      <td>
                        <div className="journey-test-nav-btns">
                          {step.candidateStep && (
                            <button
                              type="button"
                              className="journey-nav-btn"
                              onClick={() => openCandidate(step.candidateStep!)}
                            >
                              {step.candidateStep}
                            </button>
                          )}
                          {step.hrStep && (
                            <button
                              type="button"
                              className="journey-nav-btn"
                              onClick={() => openHr(step.hrStep!)}
                            >
                              {step.hrStep}
                            </button>
                          )}
                          {step.id === 'J12' && (
                            <>
                              <button type="button" className="journey-nav-btn" onClick={() => openCandidate('C6')}>C6</button>
                              <button type="button" className="journey-nav-btn" onClick={() => openHr('H5')}>H5</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<DemoSession>(() => loadSession())

  useEffect(() => {
    const timer = window.setTimeout(() => saveSession(session), 300)
    return () => window.clearTimeout(timer)
  }, [session])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== DEMO_SESSION_STORAGE_KEY || event.newValue == null) return
      try {
        const incoming = parseStoredSession(event.newValue)
        setSession((prev) => ({
          ...incoming,
          role: prev.role,
          offline: prev.offline,
        }))
      } catch {
        // Ignore malformed cross-tab payloads.
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (!session.offline) return
    return enableExternalEgressGuard()
  }, [session.offline])

  const patchSession = useCallback((update: Partial<DemoSession> | ((prev: DemoSession) => Partial<DemoSession>)) => {
    setSession((prev) => {
      const next = typeof update === 'function' ? update(prev) : update
      return { ...prev, ...next }
    })
  }, [])

  const log = useCallback((actor: string, action: string, detail: string, step: string) => {
    patchSession((prev) => ({
      auditLog: [...prev.auditLog, createAuditEntry(actor, action, detail, step)],
    }))
  }, [patchSession])

  const syncIntegration = useCallback((
    key: import('./lib/simulatedIntegrations').SimulatedIntegrationKey,
    step: string,
    detail?: string,
  ) => {
    const event = createSimulatedIntegrationSync(key, step)
    patchSession((prev) => ({
      integrationSyncs: [...prev.integrationSyncs, event],
      auditLog: [
        ...prev.auditLog,
        createAuditEntry(
          'Integration',
          `${event.systemLabel} sync (simulated)`,
          formatIntegrationAuditDetail(event, detail),
          step,
        ),
      ],
    }))
    return event
  }, [patchSession])

  function setPipeline(patch: Partial<PipelineStatus>) {
    patchSession((prev) => ({ pipeline: { ...prev.pipeline, ...patch } }))
  }

  function selectRole(role: UserRole) {
    patchSession((prev) => {
      if (role === 'journey') {
        return {
          ...prev,
          role: 'journey',
          offline: false,
          auditLog: [
            ...prev.auditLog,
            createAuditEntry('Tester', 'Journey channel opened', 'Navigation overlay - single application record', 'Journey'),
          ],
        }
      }

      if (role === 'candidate') {
        const jump = readDemoJumpTarget()
        const hasApplication =
          prev.pipeline.profileSubmitted ||
          prev.fields.some((f) => f.value.trim().length > 0)

        if (jump === 'c4' && !hasApplication) {
          return {
            ...prev,
            role: 'candidate',
            offline: false,
            ...createDemoCandidateC4Patch(),
            auditLog: [
              ...prev.auditLog,
              createAuditEntry(
                'System',
                'Demo shortcut',
                'C1–C3 skipped via ?demo=c4 — ready for avatar interview',
                'C4',
              ),
            ],
          }
        }

        const resumed = hasApplication
        return {
          ...prev,
          role: 'candidate',
          offline: false,
          auditLog: resumed
            ? prev.auditLog
            : [
              ...prev.auditLog,
              createAuditEntry(
                'Candidate',
                'Session started',
                'New application — upload CV to begin',
                'C1',
              ),
            ],
        }
      }

      // HR reads the same session record as the candidate portal — no auto-seed overwrite.
      return { ...prev, role, offline: false }
    })
  }

  function returnToEntry() {
    patchSession({ role: null })
  }

  function logout() {
    clearLlmRequestCache()
    clearSession()
    setSession(defaultSession())
  }

  function seedDemoForHr() {
    patchSession((prev) => ({
      ...createDemoPipelinePatch(),
      auditLog: [
        ...prev.auditLog,
        createAuditEntry('System', 'Demo data loaded', 'Sara Al-Hinai application + interview synced for HR review', 'H1'),
      ],
    }))
  }

  function seedDemoForCandidateC4() {
    patchSession((prev) => ({
      ...createDemoCandidateC4Patch(),
      auditLog: [
        ...prev.auditLog,
        createAuditEntry('System', 'Demo shortcut', 'C1–C3 skipped — jumped to avatar interview', 'C4'),
      ],
    }))
  }

  const ctx: DemoContextValue = {
    role: session.role,
    setRole: selectRole,
    offline: session.offline,
    setOffline: (offline) => patchSession({ offline }),
    auditLog: session.auditLog,
    log,
    integrationSyncs: session.integrationSyncs,
    syncIntegration,
    pipeline: session.pipeline,
    setPipeline,
    fields: session.fields,
    setFields: (fields) =>
      patchSession((prev) => ({
        fields: typeof fields === 'function' ? fields(prev.fields) : fields,
      })),
    profileSkills: session.profileSkills,
    setProfileSkills: (profileSkills) =>
      patchSession((prev) => ({
        profileSkills: typeof profileSkills === 'function' ? profileSkills(prev.profileSkills) : profileSkills,
      })),
    profileLanguages: session.profileLanguages,
    setProfileLanguages: (profileLanguages) =>
      patchSession((prev) => ({
        profileLanguages: typeof profileLanguages === 'function' ? profileLanguages(prev.profileLanguages) : profileLanguages,
      })),
    profileWorkHistory: session.profileWorkHistory,
    setProfileWorkHistory: (profileWorkHistory) =>
      patchSession((prev) => ({
        profileWorkHistory: typeof profileWorkHistory === 'function' ? profileWorkHistory(prev.profileWorkHistory) : profileWorkHistory,
      })),
    interviewTurns: session.interviewTurns,
    setInterviewTurns: (turns) =>
      patchSession((prev) => ({
        interviewTurns: typeof turns === 'function' ? turns(prev.interviewTurns) : turns,
      })),
    interviewConfig: session.interviewConfig,
    setInterviewConfig: (config) =>
      patchSession((prev) => {
        const next = typeof config === 'function' ? config(prev.interviewConfig) : config
        saveInterviewConfig(next)
        return { interviewConfig: next }
      }),
    hrInjectedQuestion: session.hrInjectedQuestion,
    setHrInjectedQuestion: (hrInjectedQuestion) => patchSession({ hrInjectedQuestion }),
    assessmentScore: session.assessmentScore,
    setAssessmentScore: (assessmentScore) => patchSession({ assessmentScore }),
    shortlistedReason: session.shortlistedReason,
    setShortlistedReason: (shortlistedReason) => patchSession({ shortlistedReason }),
    disqualifiedReason: session.disqualifiedReason,
    setDisqualifiedReason: (disqualifiedReason) => patchSession({ disqualifiedReason }),
    finalReason: session.finalReason,
    setFinalReason: (finalReason) => patchSession({ finalReason }),
    candidateStep: session.candidateStep,
    setCandidateStep: (candidateStep) => patchSession({ candidateStep }),
    hrStep: session.hrStep,
    setHrStep: (hrStep) => patchSession({ hrStep }),
    logout,
    returnToEntry,
    seedDemoForHr,
    seedDemoForCandidateC4,
  }

  if (!session.role) {
    return (
      <DemoContext.Provider value={ctx}>
        <RoleSelect onSelect={selectRole} />
      </DemoContext.Provider>
    )
  }

  return (
    <DemoContext.Provider value={ctx}>
      {session.role === 'candidate' && <CandidatePortal />}
      {session.role === 'hr' && <HrPortal />}
      {session.role === 'journey' && <JourneyTestChannel />}
    </DemoContext.Provider>
  )
}
