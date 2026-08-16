import { LogOut, Shield } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import type { UserRole } from '../types'
import { NetworkStatus } from './NetworkStatus'
import { IntegrationStatusPanel } from './IntegrationStatusPanel'
import type { IntegrationSyncEvent } from '../types'

interface StepItem {
  id: string
  label: string
  locked?: boolean
  lockNote?: string
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
  const roleLabel = role === 'candidate' ? 'Candidate portal (Jadarah token)' : 'HR portal (OIA SSO + MFA)'
  const contentRef = useRef<HTMLElement>(null)

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
      <header className="topbar">
        <div className="brand">
          <Shield size={22} />
          <div>
            <strong>OIA RFQ 5302</strong>
            <span>{roleLabel}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <NetworkStatus offline={offline} onToggle={onToggleOffline} />
          <button type="button" className="ghost-btn" onClick={onLogout}>
            <LogOut size={16} /> Exit portal
          </button>
        </div>
      </header>

      <div className="main-grid">
        <aside className="sidebar">
          <h3>{role === 'candidate' ? 'My journey' : 'Recruiter tools'}</h3>
          <nav>
            {steps.map((step) => (
              <button
                key={step.id}
                type="button"
                className={`step-link ${activeStep === step.id ? 'active' : ''} ${step.locked ? 'locked' : ''}`}
                onClick={() => !step.locked && onStepChange(step.id)}
                disabled={step.locked}
              >
                <span>{step.id}</span>
                <div>
                  <strong>{step.label}</strong>
                  {step.locked && step.lockNote && <small className="lock-note">{step.lockNote}</small>}
                </div>
              </button>
            ))}
          </nav>

          {demoShortcut && <div className="demo-shortcut-panel">{demoShortcut}</div>}

          <IntegrationStatusPanel events={integrationSyncs} />
        </aside>

        <main ref={contentRef} className="content">{children}</main>
      </div>
    </div>
  )
}
