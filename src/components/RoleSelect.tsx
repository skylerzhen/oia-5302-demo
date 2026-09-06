import { useMemo, useState, type FormEvent } from 'react'
import {
  Briefcase,
  Download,
  Globe,
  KeyRound,
  Lock,
  Map,
  Mail,
  Shield,
  UserRound,
  WifiOff,
} from 'lucide-react'
import { useDemo } from '../context/DemoContext'
import type { UserRole } from '../types'

interface RoleSelectProps {
  onSelect: (role: UserRole) => void
}

type AuthPhase = 'portal-pick' | 'sign-in' | 'mfa'

function createMfaCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function RoleSelect({ onSelect }: RoleSelectProps) {
  const { offline, setOffline, logout } = useDemo()
  const [phase, setPhase] = useState<AuthPhase>('portal-pick')
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null)
  const [expectedMfaCode, setExpectedMfaCode] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [mfaError, setMfaError] = useState('')

  const signInCopy = useMemo(() => {
    if (pendingRole === 'hr') {
      return {
        title: 'OIA SSO sign-in',
        subtitle: 'Screen 01 - Recruiter identity (mock)',
        identifierLabel: 'Work email',
        identifierValue: 'recruiter@oia.gov.om',
        secretLabel: 'Password',
        secretValue: 'demo-sso-only',
        submitLabel: 'Continue to MFA',
      }
    }
    if (pendingRole === 'journey') {
      return {
        title: 'UIS acceptance sign-in',
        subtitle: 'Screen 01 - Journey test channel (mock)',
        identifierLabel: 'Tester ID',
        identifierValue: 'uis-acceptance',
        secretLabel: 'Access key',
        secretValue: 'journey-test',
        submitLabel: 'Continue to MFA',
      }
    }
    return {
      title: 'Jadarah token sign-in',
      subtitle: 'Screen 01 - Candidate identity (mock)',
      identifierLabel: 'National ID / Jadarah token',
      identifierValue: '12345678',
      secretLabel: 'One-time portal PIN',
      secretValue: '******',
      submitLabel: 'Continue to MFA',
    }
  }, [pendingRole])

  function beginAuth(role: UserRole) {
    setPendingRole(role)
    setExpectedMfaCode('')
    setMfaCode('')
    setMfaError('')
    setPhase('sign-in')
  }

  function submitSignIn(event: FormEvent) {
    event.preventDefault()
    setExpectedMfaCode(createMfaCode())
    setMfaCode('')
    setMfaError('')
    setPhase('mfa')
  }

  function submitMfa(event: FormEvent) {
    event.preventDefault()
    if (!pendingRole) return
    if (mfaCode.trim() === expectedMfaCode) {
      onSelect(pendingRole)
      return
    }
    setMfaError('Verification code does not match. Check your authenticator app or request a new code.')
  }

  function fillDemoMfa() {
    setMfaCode(expectedMfaCode)
    setMfaError('')
  }

  function resendMfaCode() {
    setExpectedMfaCode(createMfaCode())
    setMfaCode('')
    setMfaError('')
  }

  return (
    <div className="portal-auth-screen">
      <aside className="portal-auth-brand">
        <Shield size={32} aria-hidden />
        <h1>OIA AI Recruitment</h1>
        <p>Sovereign deployment prototype - RFQ 5302</p>
        <ul className="portal-auth-brand-list">
          <li><Globe size={16} aria-hidden /> Data residency in Oman</li>
          <li><WifiOff size={16} aria-hidden /> Offline-capable interview segment</li>
          <li><Lock size={16} aria-hidden /> Human final authority on hire/reject</li>
        </ul>
      </aside>

      <main className="portal-auth-main">
        {phase === 'portal-pick' && (
          <div className="portal-auth-card">
            <header className="portal-auth-head">
              <span className="portal-auth-screen-id">Entry</span>
              <h2>Choose your portal</h2>
              <p className="muted">Three channels - candidates, HR, and UIS journey testing share one application record.</p>
            </header>

            <button
              type="button"
              className={`network-status landing ${offline ? 'offline' : 'online'}`}
              onClick={() => setOffline(!offline)}
            >
              <span className="network-lamp" />
              {offline ? 'Simulated offline - egress blocked' : 'Connected - cloud demo (toggle offline)'}
            </button>

            <div className="role-cards role-cards-three">
              <button type="button" className="role-card" onClick={() => beginAuth('candidate')}>
                <UserRound size={28} aria-hidden />
                <strong>Candidate portal</strong>
                <span>Jadarah token - apply, assessment, avatar interview</span>
              </button>
              <button type="button" className="role-card hr" onClick={() => beginAuth('hr')}>
                <Briefcase size={28} aria-hidden />
                <strong>HR / Recruiter portal</strong>
                <span>OIA SSO + MFA - queues, review, final decision</span>
              </button>
              <button type="button" className="role-card journey" onClick={() => beginAuth('journey')}>
                <Map size={28} aria-hidden />
                <strong>Journey test channel</strong>
                <span>12-step navigator - dual-portal, one record</span>
              </button>
            </div>

            <p className="tiny muted">
              Demo progress is saved in this browser and shared across tabs.
            </p>
            <a
              className="portal-auth-link"
              href="/downloads/oia-5302-cv-data-package.zip"
              download="oia-5302-cv-data-package.zip"
            >
              <Download size={16} aria-hidden />
              Download demo CV data package (ZIP)
            </a>
            <button type="button" className="portal-auth-link-btn" onClick={logout}>
              Reset demo (clear all progress)
            </button>
          </div>
        )}

        {phase === 'sign-in' && pendingRole && (
          <form className="portal-auth-card" onSubmit={submitSignIn}>
            <header className="portal-auth-head">
              <span className="portal-auth-screen-id">01</span>
              <h2>{signInCopy.title}</h2>
              <p className="muted">{signInCopy.subtitle}</p>
            </header>

            <label className="portal-auth-field">
              <span>{signInCopy.identifierLabel}</span>
              <div className="portal-auth-input-row">
                {pendingRole === 'hr' ? <Mail size={16} aria-hidden /> : pendingRole === 'journey' ? <Map size={16} aria-hidden /> : <UserRound size={16} aria-hidden />}
                <input type="text" readOnly value={signInCopy.identifierValue} />
              </div>
            </label>

            <label className="portal-auth-field">
              <span>{signInCopy.secretLabel}</span>
              <div className="portal-auth-input-row">
                <KeyRound size={16} aria-hidden />
                <input type="password" readOnly value={signInCopy.secretValue} />
              </div>
            </label>

            <p className="tiny muted portal-auth-demo-note">
              Mock credentials pre-filled for demo - no real authentication.
            </p>

            <div className="portal-auth-actions">
              <button type="button" className="portal-auth-secondary" onClick={() => setPhase('portal-pick')}>
                Back
              </button>
              <button type="submit" className="primary">{signInCopy.submitLabel}</button>
            </div>
          </form>
        )}

        {phase === 'mfa' && pendingRole && (
          <form className="portal-auth-card" onSubmit={submitMfa}>
            <header className="portal-auth-head">
              <span className="portal-auth-screen-id">02</span>
              <h2>Two-factor verification</h2>
              <p className="muted">
                Enter the 6-digit code from your authenticator app.
              </p>
            </header>

            <div className="portal-auth-mfa-push" aria-live="polite">
              <div className="portal-auth-mfa-push-head">
                <Shield size={16} aria-hidden />
                <span>OIA Authenticator</span>
                <span className="portal-auth-mfa-push-tag">Simulated</span>
              </div>
              <p className="portal-auth-mfa-push-copy">
                Sign-in approval for{' '}
                {pendingRole === 'hr' ? 'recruiter@oia.gov.om' : pendingRole === 'journey' ? 'uis-acceptance' : '12345678'}
              </p>
              <button type="button" className="portal-auth-mfa-push-code" onClick={fillDemoMfa}>
                {expectedMfaCode || '------'}
              </button>
              <p className="tiny muted portal-auth-mfa-push-note">
                Tap the code to copy into the field. In production this would appear only on your registered device.
              </p>
              <button type="button" className="portal-auth-inline-btn portal-auth-mfa-resend" onClick={resendMfaCode}>
                Send new code
              </button>
            </div>

            <label className="portal-auth-field">
              <span>Verification code</span>
              <input
                className="portal-auth-mfa-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => {
                  setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setMfaError('')
                }}
              />
            </label>

            {mfaError && <p className="danger-text tiny">{mfaError}</p>}

            <div className="portal-auth-actions">
              <button type="button" className="portal-auth-secondary" onClick={() => setPhase('sign-in')}>
                Back
              </button>
              <button type="submit" className="primary">Verify and enter portal</button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
