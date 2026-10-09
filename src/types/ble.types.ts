export type BleStateStatus = 'pret' | 'desactive' | 'indisponible' | 'en_scan' | 'connecte' | 'erreur'

export type BleErrorCode =
  | 'sensor_not_found'
  | 'connection_failed'
  | 'bluetooth_disabled'
  | 'permissions_denied'
  | 'timeout'
  | 'invalid_read'
  | 'sensor_already_paired'
  | 'unavailable'
  | 'unknown'

export interface BleMeasurementSnapshot {
  temperature: number
  moisture: number
  light: number
  conductivity: number
  batteryLevel: number | null
  measuredAt: string
  batteryReadAt: string | null
}
