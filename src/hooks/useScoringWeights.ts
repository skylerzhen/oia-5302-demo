import { useEffect, useState } from 'react'
import {
  loadJdDimensionWeights,
  loadPillarWeights,
  SCORING_SYNC_EVENT,
  type JdDimensionWeight,
  type PillarWeights,
} from '../lib/hrScoring'

export function useScoringWeights() {
  const [pillarWeights, setPillarWeights] = useState<PillarWeights>(() => loadPillarWeights())
  const [jdWeights, setJdWeights] = useState<JdDimensionWeight[]>(() => loadJdDimensionWeights())

  useEffect(() => {
    function sync() {
      setPillarWeights(loadPillarWeights())
      setJdWeights(loadJdDimensionWeights())
    }
    function onStorage(event: StorageEvent) {
      if (event.key === 'oia5302-hr-pillar-weights' || event.key === 'oia5302-hr-jd-dimension-weights') sync()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(SCORING_SYNC_EVENT, sync)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(SCORING_SYNC_EVENT, sync)
    }
  }, [])

  return { pillarWeights, jdWeights, setPillarWeights, setJdWeights }
}