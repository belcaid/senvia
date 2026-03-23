export type MeasurementSource =
  | 'pairing_validation'
  | 'manual_sync'
  | 'plant_detail_auto_sync'
  | 'foreground_refresh'
  | 'import'

export interface Measurement {
  id: string
  plantId: string
  sensorId: string
  measuredAt: string
  temperature: number
  moisture: number
  light: number
  conductivity: number
  batteryLevel: number | null
  source: MeasurementSource
}
