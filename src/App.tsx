import { useCallback, useEffect, useState } from 'react'
import { createAuditEntry } from './lib/audit'
import {
  createSimulatedIntegrationSync,
  formatIntegrationAuditDetail,
} from './lib/simulatedIntegrations'
import {
  clearSession,
  defaultSession,
  loadSession,
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
import { DemoContext, type DemoContextValue } from './context/DemoContext'
import type { PipelineStatus, UserRole } from './types'
import './App.css'

export default function App() {
  const [session, setSession] = useState<DemoSession>(() => loadSession())

  useEffect(() => {
    const timer = window.setTimeout(() => saveSession(session), 300)
    return () => window.clearTimeout(timer)
  }, [session])

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
      {session.role === 'candidate' ? <CandidatePortal /> : <HrPortal />}
    </DemoContext.Provider>
  )
}
