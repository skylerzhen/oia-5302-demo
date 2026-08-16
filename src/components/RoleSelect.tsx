import { Briefcase, Download, Globe, Shield, UserRound, WifiOff } from 'lucide-react'
import { useDemo } from '../context/DemoContext'
import type { UserRole } from '../types'

interface RoleSelectProps {
  onSelect: (role: UserRole) => void
}

export function RoleSelect({ onSelect }: RoleSelectProps) {
  const { offline, setOffline, logout } = useDemo()

  return (
    <div className="role-select-screen">
      <div className="role-card-wrap">
        <div className="value-hero">
          <Shield size={28} />
          <h1>OIA AI Recruitment Assistant</h1>
          <p className="value-tagline">Sovereign · Offline-capable · Human final authority</p>
        </div>

        <div className="value-pillars">
          <div><Globe size={18} /> <strong>Data sovereignty</strong><span>On-prem inference in Oman</span></div>
          <div><WifiOff size={18} /> <strong>Offline interview</strong><span>Egress disabled during avatar segment</span></div>
          <div><strong>Assessment</strong><span>Role-specific MCQ + AI avatar interview</span></div>
          <div><strong>HR gate</strong><span>AI recommends — humans decide</span></div>
        </div>

        <button
          type="button"
          className={`network-status landing ${offline ? 'offline' : 'online'}`}
          onClick={() => setOffline(!offline)}
        >
          <span className="network-lamp" />
          {offline ? 'Offline · local inference (demo)' : 'Connected · OIA intranet (click to simulate unplug)'}
        </button>

        <p className="muted">Separate portals — candidates and HR never share the same workflow screen.</p>
        <div className="role-cards">
          <button type="button" className="role-card" onClick={() => onSelect('candidate')}>
            <UserRound size={32} />
            <strong>Candidate portal</strong>
            <span>Jadarah token login · apply · assessment · avatar interview</span>
          </button>
          <button type="button" className="role-card hr" onClick={() => onSelect('hr')}>
            <Briefcase size={32} />
            <strong>HR / Recruiter portal</strong>
            <span>OIA SSO + MFA · matching · shortlist · final decision</span>
          </button>
        </div>
        <p className="tiny muted">
          Demo progress is saved in this browser tab. Reload returns here; pick a portal to continue where you left off.
        </p>
        <a
          className="ghost-btn data-pack-download"
          href="/downloads/oia-5302-cv-data-package.zip"
          download="oia-5302-cv-data-package.zip"
        >
          <Download size={16} aria-hidden />
          Download demo CV data package (ZIP)
        </a>
        <p className="tiny muted data-pack-note">
          Synthetic CVs, JD, and assessment bank · saves to your browser Downloads folder
        </p>
        <button type="button" className="ghost-btn reset-demo-btn" onClick={logout}>
          Reset demo (clear all progress)
        </button>
      </div>
    </div>
  )
}
