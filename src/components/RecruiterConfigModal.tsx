import { X } from 'lucide-react'
import { InterviewSetupPanel } from './InterviewSetupPanel'
import { JdRubricWeightsPanel } from './JdRubricWeightsPanel'
import type { JdDimensionWeight } from '../lib/hrScoring'
import type { InterviewConfig } from '../types'

interface RecruiterConfigModalProps {
  open: boolean
  onClose: () => void
  interviewConfig: InterviewConfig
  onInterviewConfigChange: (config: InterviewConfig) => void
  onInterviewConfigSave?: (config: InterviewConfig) => void
  jdWeights: JdDimensionWeight[]
  onJdWeightsChange: (weights: JdDimensionWeight[]) => void
}

export function RecruiterConfigModal({
  open,
  onClose,
  interviewConfig,
  onInterviewConfigChange,
  onInterviewConfigSave,
  jdWeights,
  onJdWeightsChange,
}: RecruiterConfigModalProps) {
  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal recruiter-config-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recruiter-config-title"
      >
        <header className="recruiter-config-modal-head">
          <div>
            <h2 id="recruiter-config-title">Recruiter configuration</h2>
            <p className="muted tiny">Interview blueprint and JD rubric weights — opens in a panel so H1 stays compact.</p>
          </div>
          <button type="button" className="ghost-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="recruiter-config-modal-body">
          <InterviewSetupPanel
            config={interviewConfig}
            onChange={onInterviewConfigChange}
            onSave={onInterviewConfigSave}
          />
          <JdRubricWeightsPanel weights={jdWeights} onChange={onJdWeightsChange} />
        </div>
      </div>
    </div>
  )
}
