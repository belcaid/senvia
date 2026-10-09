import { describe, expect, it } from 'vitest'
import { isBleRequestCancelled } from '@/services/ble-sensor.service'

describe('Web Bluetooth chooser cancellation', () => {
  it('recognizes the browser requestDevice cancellation message', () => {
    const error = new Error('User cancelled the requestDevice() chooser.')
    error.name = 'NotFoundError'

    expect(isBleRequestCancelled(error)).toBe(true)
  })

  it('does not hide an actual connection failure', () => {
    expect(isBleRequestCancelled(new Error('GATT connection failed'))).toBe(false)
  })
})
