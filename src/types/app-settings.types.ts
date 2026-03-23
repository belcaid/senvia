import type { AlertSeverity } from '@/types/alert.types'
import type { ThemeMode } from '@/types/theme.types'

export type HistoryRange = '24h' | '7d' | '30d' | 'all'

export interface AppSettings {
  themeMode: ThemeMode
  notificationsEnabled: boolean
  minimumNotifiedSeverity: AlertSeverity
  preferredReminderTime: string | null
  preferredHistoryRange: HistoryRange
  staleDataThresholdMinutes: number
  batteryReadIntervalHours: number
  autoSyncOnForeground: boolean
}
