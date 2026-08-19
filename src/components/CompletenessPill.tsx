import type { CompletenessTier } from '../lib/cvCompleteness'

const TIER_LABEL: Record<CompletenessTier, string> = {
  complete: 'Complete',
  partial: 'Partial',
  incomplete: 'Incomplete',
  unrecognized: 'Unrecognized',
}

const TIER_SEGMENTS: Record<CompletenessTier, number> = {
  complete: 3,
  partial: 2,
  incomplete: 1,
  unrecognized: 0,
}

interface CompletenessPillProps {
  valid: number
  total: number
  tier: CompletenessTier
  compact?: boolean
}

export function CompletenessPill({ valid, total, tier, compact }: CompletenessPillProps) {
  const segments = TIER_SEGMENTS[tier]
  const countLabel = total <= 0
    ? TIER_LABEL.unrecognized
    : `${valid} of ${total} fields extracted`

  return (
    <span className={`completeness-pill tier-${tier}`} title={`${TIER_LABEL[tier]}: ${countLabel}`}>
      {!compact && (
        <span className="completeness-bar" aria-hidden>
          {[0, 1, 2].map((index) => (
            <span key={index} className={index < segments ? 'filled' : ''} />
          ))}
        </span>
      )}
      <span className="completeness-chip">{countLabel}</span>
    </span>
  )
}
