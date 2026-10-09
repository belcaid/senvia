import { describe, expect, test } from 'vitest'
import type { ThresholdProfile } from '@/types/threshold-profile.types'
import { evaluatePlantHealth } from '@/utils/plant-health.util'

const profile: ThresholdProfile = {
  id: 'test-profile',
  name: 'Profil test',
  tempMin: 18,
  tempMax: 28,
  moistureMin: 30,
  moistureMax: 60,
  lightMin: 200,
  lightMax: 2000,
  conductivityMin: 300,
  conductivityMax: 1800,
  weights: null,
}

const healthyMeasurement = {
  measuredAt: new Date().toISOString(),
  temperature: 22,
  moisture: 45,
  light: 800,
  conductivity: 900,
}

describe('evaluatePlantHealth', () => {
  test('returns healthy when every metric is in range', () => {
    const result = evaluatePlantHealth({
      measurement: healthyMeasurement,
      thresholdProfile: profile,
      isStale: false,
      staleThresholdMinutes: 30,
    })

    expect(result.status).toBe('healthy')
    expect(result.score).toBe(100)
    expect(result.issues).toHaveLength(0)
  })

  test('prioritizes stale data over metric evaluation', () => {
    const result = evaluatePlantHealth({
      measurement: healthyMeasurement,
      thresholdProfile: profile,
      isStale: true,
      staleThresholdMinutes: 30,
    })

    expect(result.status).toBe('stale_data')
    expect(result.score).toBeNull()
  })

  test('returns critical for a strongly out-of-range measurement', () => {
    const result = evaluatePlantHealth({
      measurement: {
        ...healthyMeasurement,
        moisture: 0,
      },
      thresholdProfile: profile,
      isStale: false,
      staleThresholdMinutes: 30,
    })

    expect(result.status).toBe('critical')
    expect(result.score).toBeLessThan(100)
    expect(result.dominantIssue?.key).toBe('moisture')
  })
})
