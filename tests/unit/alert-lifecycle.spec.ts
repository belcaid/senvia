import { describe, expect, test } from 'vitest'
import { getAlertReconciliationDecision } from '@/utils/alert-lifecycle.util'

describe('alert lifecycle reconciliation', () => {
  test('creates the first episode and refreshes an ongoing one', () => {
    expect(
      getAlertReconciliationDecision(null, {
        sensorId: 'sensor-a',
        severity: 'warning',
      }),
    ).toBe('create')

    expect(
      getAlertReconciliationDecision(
        { sensorId: 'sensor-a', severity: 'warning' },
        { sensorId: 'sensor-a', severity: 'warning' },
      ),
    ).toBe('refresh')
  })

  test('escalates an ongoing episode without creating a duplicate', () => {
    expect(
      getAlertReconciliationDecision(
        { sensorId: 'sensor-a', severity: 'warning' },
        { sensorId: 'sensor-a', severity: 'critical' },
      ),
    ).toBe('escalate')
  })

  test('starts a new episode when the sensor has been replaced', () => {
    expect(
      getAlertReconciliationDecision(
        { sensorId: 'sensor-a', severity: 'warning' },
        { sensorId: 'sensor-b', severity: 'warning' },
      ),
    ).toBe('replace')
  })
})
