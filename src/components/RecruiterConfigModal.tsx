import { InterviewSetupPanel } from './InterviewSetupPanel'
import { JdRubricWeightsPanel } from './JdRubricWeightsPanel'
import { interviewConfigSummary } from '../lib/interviewConfig'
import { jdWeightTotal, type JdDimensionWeight } from '../lib/hrScoring'
import type { InterviewConfig } from '../types'

interface RecruiterJobSettingsProps {
  interviewConfig: InterviewConfig
  onInterviewConfigChange: (config: InterviewConfig) => void
  onInterviewConfigSave?: (config: InterviewConfig) => void
  jdWeights: JdDimensionWeight[]
  onJdWeightsChange: (weights: JdDimensionWeight[]) => void
  onBackToQueues: () => void
}

export function RecruiterJobSettings({
  interviewConfig,
  onInterviewConfigChange,
  onInterviewConfigSave,
  jdWeights,
  onJdWeightsChange,
  onBackToQueues,
}: RecruiterJobSettingsProps) {
  return (
    <section className="stack job-settings-screen">
      <header className="section-head dashboard-head">
        <div>
          <h1>Job settings</h1>
          <p>
            Interview blueprint and JD matching weights for this vacancy.
            Candidate C4 and the scoring model use the saved blueprint.
          </p>
        </div>
        <button type="button" className="primary-outline" onClick={onBackToQueues}>
          Back to review queues
        </button>
      </header>
      <p className="muted tiny job-settings-summary">
        {interviewConfigSummary(interviewConfig)} · JD weight total {jdWeightTotal(jdWeights)}
      </p>
      <div className="job-settings-grid">
        <InterviewSetupPanel
          config={interviewConfig}
          onChange={onInterviewConfigChange}
          onSave={onInterviewConfigSave}
        />
        <JdRubricWeightsPanel weights={jdWeights} onChange={onJdWeightsChange} />
      </div>
    </section>
  )
}
