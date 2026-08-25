import { RotateCcw } from 'lucide-react'
import {
  DEFAULT_JD_DIMENSION_WEIGHTS,
  jdWeightTotal,
  type JdDimensionWeight,
} from '../lib/hrScoring'

interface JdRubricWeightsPanelProps {
  weights: JdDimensionWeight[]
  onChange: (weights: JdDimensionWeight[]) => void
  compact?: boolean
}

export function JdRubricWeightsPanel({ weights, onChange, compact = false }: JdRubricWeightsPanelProps) {
  const total = jdWeightTotal(weights)

  function updateWeight(key: string, raw: string) {
    onChange(
      weights.map((w) =>
        w.key === key
          ? { ...w, weight: Math.min(100, Math.max(0, Number(raw) || 0)) }
          : w,
      ),
    )
  }

  function resetWeights() {
    onChange(DEFAULT_JD_DIMENSION_WEIGHTS.map((w) => ({ ...w })))
  }

  return (
    <div className={`jd-rubric-panel ${compact ? 'compact' : ''}`}>
      <header className="jd-rubric-head">
        <div>
          <h3>JD matching rubric · six dimensions</h3>
          <p className="muted tiny">
            Default weights 20 / 15 / 15 / 15 / 15 / 20 — dimension % × weight, summed and normalized to CV
            match score.
          </p>
        </div>
        <button type="button" className="ghost-btn score-weight-reset" onClick={resetWeights}>
          <RotateCcw size={14} /> Reset JD weights
        </button>
      </header>

      <div className="jd-rubric-grid">
        {weights.map((w) => (
          <label key={w.key} className="jd-rubric-row">
            <span className="jd-rubric-label">{w.label}</span>
            <div className="score-weight-input-row">
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={w.weight}
                onChange={(e) => updateWeight(w.key, e.target.value)}
                aria-label={`${w.label} JD weight`}
              />
              <span className="score-weight-share">pts</span>
            </div>
          </label>
        ))}
      </div>

      <p className={`jd-rubric-total tiny ${total === 100 ? 'ok-text' : 'warn-text'}`}>
        Weight sum: <strong>{total}</strong>
        {total !== 100 && ' · recommended 100 — scores still normalize by actual sum'}
      </p>
    </div>
  )
}
