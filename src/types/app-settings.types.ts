import type { AlertSeverity } from '@/types/alert.types'

export type HistoryRange = '24h' | '7d' | '30d' | 'all'

export interface AppSettings {
  notificationsEnabled: boolean
  minimumNotifiedSeverity: AlertSeverity
  preferredReminderTime: string | null
  preferredHistoryRange: HistoryRange
  staleDataThresholdMinutes: number
  batteryReadIntervalHours: number
  autoSyncOnForeground: boolean
}
