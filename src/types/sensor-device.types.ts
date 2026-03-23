export type SensorModel = 'flower-care' | 'hhcc' | 'other'

export interface SensorDevice {
  id: string
  plantId: string | null
  deviceIdentifier: string
  deviceName: string
  model: SensorModel
  firmwareVersion: string | null
  batteryLevel: number | null
  lastBatteryReadAt: string | null
  pairedAt: string
  lastSeenAt: string | null
}
