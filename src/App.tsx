import { useEffect, useState } from 'react'
import { createAuditEntry } from './lib/audit'
import {
  clearSession,
  defaultSession,
  loadSession,
  saveSession,
  type DemoSession,
} from './lib/session'
import { createDemoPipelinePatch } from './lib/demoSeed'
import { enableExternalEgressGuard } from './lib/egressGuard'
import { RoleSelect } from './components/RoleSelect'
import { CandidatePortal } from './components/CandidatePortal'
import { HrPortal } from './components/HrPortal'
import { DemoContext, type DemoContextValue } from './context/DemoContext'
import type { PipelineStatus, UserRole } from './types'
import './App.css'

export default function App() {
  const [session, setSession] = useState<DemoSession>(() => loadSession())

  useEffect(() => {
    saveSession(session)
  }, [session])

  useEffect(() => {
    if (!session.offline) return
    return enableExternalEgressGuard()
  }, [session.offline])

  function patchSession(update: Partial<DemoSession> | ((prev: DemoSession) => Partial<DemoSession>)) {
    setSession((prev) => {
      const next = typeof update === 'function' ? update(prev) : update
      return { ...prev, ...next }
    })
  }

  function log(actor: string, action: string, detail: string, step: string) {
    patchSession((prev) => ({
      auditLog: [...prev.auditLog, createAuditEntry(actor, action, detail, step)],
    }))
  }

  function setPipeline(patch: Partial<PipelineStatus>) {
    patchSession((prev) => ({ pipeline: { ...prev.pipeline, ...patch } }))
  }

  function selectRole(role: UserRole) {
    patchSession((prev) => {
      const readyForHrReview =
        prev.pipeline.interviewCompleted || prev.interviewTurns.length > 0
      const needsHrSeed = role === 'hr' && !readyForHrReview

      if (needsHrSeed) {
        return {
          role,
          ...createDemoPipelinePatch(),
          auditLog: [
            ...prev.auditLog,
            createAuditEntry(
              'System',
              'Demo data loaded',
              'Sample application + interview auto-loaded for HR demo',
              'H1',
            ),
          ],
        }
      }

      if (role === 'candidate') {
        return {
          ...prev,
          role,
          offline: true,
          auditLog: [
            ...prev.auditLog,
            createAuditEntry(
              'Candidate',
              'Session started',
              'Jadarah token validated; offline mode for interview segment',
              'C1',
            ),
          ],
        }
      }

      return { ...prev, role }
    })
  }

  function logout() {
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

  const ctx: DemoContextValue = {
    role: session.role,
    setRole: selectRole,
    offline: session.offline,
    setOffline: (offline) => patchSession({ offline }),
    uiLocale: session.uiLocale,
    setUiLocale: (uiLocale) => patchSession({ uiLocale }),
    toggleUiLocale: () =>
      patchSession((prev) => ({ uiLocale: prev.uiLocale === 'en' ? 'ar' : 'en' })),
    auditLog: session.auditLog,
    log,
    pipeline: session.pipeline,
    setPipeline,
    fields: session.fields,
    setFields: (fields) =>
      patchSession((prev) => ({
        fields: typeof fields === 'function' ? fields(prev.fields) : fields,
      })),
    interviewTurns: session.interviewTurns,
    setInterviewTurns: (turns) =>
      patchSession((prev) => ({
        interviewTurns: typeof turns === 'function' ? turns(prev.interviewTurns) : turns,
      })),
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
    seedDemoForHr,
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
      {session.role === 'candidate' ? <CandidatePortal /> : <HrPortal />}
    </DemoContext.Provider>
  )
}
