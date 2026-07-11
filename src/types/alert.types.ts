export type AlertType =
  | 'humidity_low'
  | 'humidity_high'
  | 'temperature_out_of_range'
  | 'light_low'
  | 'light_high'
  | 'conductivity_low'
  | 'conductivity_high'
  | 'stale_data'
  | 'sensor_battery_low'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface Alert {
  id: string
  plantId: string
  sensorId: string | null
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  isRead: boolean
  createdAt: string
  lastDetectedAt: string
  resolvedAt: string | null
  measurementId: string | null
}
