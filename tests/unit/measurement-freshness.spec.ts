import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  getMeasurementAgeMinutes,
  isMeasurementStale,
} from '@/utils/measurement-freshness.util'

describe('measurement freshness', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-07T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('computes the age in complete minutes', () => {
    expect(getMeasurementAgeMinutes('2026-06-07T11:42:30.000Z')).toBe(17)
  })

  test('marks missing and old measurements as stale', () => {
    expect(isMeasurementStale(null, 30)).toBe(true)
    expect(isMeasurementStale('2026-06-07T11:29:00.000Z', 30)).toBe(true)
    expect(isMeasurementStale('2026-06-07T11:31:00.000Z', 30)).toBe(false)
  })
})
