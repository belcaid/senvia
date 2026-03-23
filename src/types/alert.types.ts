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
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  isRead: boolean
  createdAt: string
  measurementId: string | null
}
