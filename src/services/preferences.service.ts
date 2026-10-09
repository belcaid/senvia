import { Preferences } from '@capacitor/preferences'
import type { AlertSeverity } from '@/types/alert.types'
import type { AppSettings, HistoryRange } from '@/types/app-settings.types'
import { THEME_PREFERENCE_KEY, type ThemeMode } from '@/types/theme.types'

const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled'
const MINIMUM_NOTIFIED_SEVERITY_KEY = 'minimum_notified_severity'
const PREFERRED_REMINDER_TIME_KEY = 'preferred_reminder_time'
const GENERAL_OPTIONS_KEY = 'general_options'

export interface GeneralSettingsOptions {
  preferredHistoryRange: HistoryRange
  staleDataThresholdMinutes: number
  batteryReadIntervalHours: number
  autoSyncOnForeground: boolean
}

export const DEFAULT_GENERAL_SETTINGS_OPTIONS: GeneralSettingsOptions = {
  preferredHistoryRange: '7d',
  staleDataThresholdMinutes: 30,
  batteryReadIntervalHours: 24,
  autoSyncOnForeground: true,
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  themeMode: 'dark',
  notificationsEnabled: false,
  minimumNotifiedSeverity: 'warning',
  preferredReminderTime: '09:00',
  preferredHistoryRange: DEFAULT_GENERAL_SETTINGS_OPTIONS.preferredHistoryRange,
  staleDataThresholdMinutes: DEFAULT_GENERAL_SETTINGS_OPTIONS.staleDataThresholdMinutes,
  batteryReadIntervalHours: DEFAULT_GENERAL_SETTINGS_OPTIONS.batteryReadIntervalHours,
  autoSyncOnForeground: DEFAULT_GENERAL_SETTINGS_OPTIONS.autoSyncOnForeground,
}

const isThemeMode = (value: string | null): value is ThemeMode => value === 'light' || value === 'dark'

const isAlertSeverity = (value: string | null): value is AlertSeverity =>
  value === 'info' || value === 'warning' || value === 'critical'

const isHistoryRange = (value: string | null): value is HistoryRange =>
  value === '24h' || value === '7d' || value === '30d' || value === 'all'

const toBoolean = (value: string | null, fallback: boolean): boolean => {
  if (value === null) {
    return fallback
  }

  return value === 'true'
}

const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

const clampInteger = (value: unknown, fallback: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, Math.round(toNumber(value, fallback))))
}

const parseGeneralSettingsOptions = (value: string | null): GeneralSettingsOptions => {
  if (value === null) {
    return DEFAULT_GENERAL_SETTINGS_OPTIONS
  }

  try {
    const parsed = JSON.parse(value) as Partial<GeneralSettingsOptions>
    const preferredHistoryRange = parsed.preferredHistoryRange

    return {
      preferredHistoryRange:
        typeof preferredHistoryRange === 'string' && isHistoryRange(preferredHistoryRange)
          ? preferredHistoryRange
        : DEFAULT_GENERAL_SETTINGS_OPTIONS.preferredHistoryRange,
      staleDataThresholdMinutes: clampInteger(
        parsed.staleDataThresholdMinutes,
        DEFAULT_GENERAL_SETTINGS_OPTIONS.staleDataThresholdMinutes,
        5,
        1440,
      ),
      batteryReadIntervalHours: clampInteger(
        parsed.batteryReadIntervalHours,
        DEFAULT_GENERAL_SETTINGS_OPTIONS.batteryReadIntervalHours,
        1,
        168,
      ),
      autoSyncOnForeground:
        typeof parsed.autoSyncOnForeground === 'boolean'
          ? parsed.autoSyncOnForeground
          : DEFAULT_GENERAL_SETTINGS_OPTIONS.autoSyncOnForeground,
    }
  } catch {
    return DEFAULT_GENERAL_SETTINGS_OPTIONS
  }
}

export const getThemeModePreference = async (): Promise<ThemeMode | null> => {
  const { value } = await Preferences.get({ key: THEME_PREFERENCE_KEY })

  return isThemeMode(value) ? value : null
}

export const setThemeModePreference = async (mode: ThemeMode): Promise<void> => {
  await Preferences.set({ key: THEME_PREFERENCE_KEY, value: mode })
}

export const getNotificationsEnabledPreference = async (): Promise<boolean> => {
  const { value } = await Preferences.get({ key: NOTIFICATIONS_ENABLED_KEY })

  return toBoolean(value, DEFAULT_APP_SETTINGS.notificationsEnabled)
}

export const setNotificationsEnabledPreference = async (enabled: boolean): Promise<void> => {
  await Preferences.set({
    key: NOTIFICATIONS_ENABLED_KEY,
    value: String(enabled),
  })
}

export const getReminderTimePreference = async (): Promise<string | null> => {
  const { value } = await Preferences.get({ key: PREFERRED_REMINDER_TIME_KEY })

  if (value === null || value.trim() === '') {
    return DEFAULT_APP_SETTINGS.preferredReminderTime
  }

  return value
}

export const setReminderTimePreference = async (time: string | null): Promise<void> => {
  if (time === null || time.trim() === '') {
    await Preferences.remove({ key: PREFERRED_REMINDER_TIME_KEY })
    return
  }

  await Preferences.set({
    key: PREFERRED_REMINDER_TIME_KEY,
    value: time,
  })
}

export const getMinimumNotifiedSeverityPreference = async (): Promise<AlertSeverity> => {
  const { value } = await Preferences.get({ key: MINIMUM_NOTIFIED_SEVERITY_KEY })

  return isAlertSeverity(value) ? value : DEFAULT_APP_SETTINGS.minimumNotifiedSeverity
}

export const setMinimumNotifiedSeverityPreference = async (severity: AlertSeverity): Promise<void> => {
  await Preferences.set({
    key: MINIMUM_NOTIFIED_SEVERITY_KEY,
    value: severity,
  })
}

export const getGeneralOptionsPreference = async (): Promise<GeneralSettingsOptions> => {
  const { value } = await Preferences.get({ key: GENERAL_OPTIONS_KEY })

  return parseGeneralSettingsOptions(value)
}

export const updateGeneralOptionsPreference = async (
  patch: Partial<GeneralSettingsOptions>,
): Promise<GeneralSettingsOptions> => {
  const current = await getGeneralOptionsPreference()
  const merged: GeneralSettingsOptions = {
    ...current,
    ...patch,
    staleDataThresholdMinutes: clampInteger(
      patch.staleDataThresholdMinutes ?? current.staleDataThresholdMinutes,
      DEFAULT_GENERAL_SETTINGS_OPTIONS.staleDataThresholdMinutes,
      5,
      1440,
    ),
    batteryReadIntervalHours: clampInteger(
      patch.batteryReadIntervalHours ?? current.batteryReadIntervalHours,
      DEFAULT_GENERAL_SETTINGS_OPTIONS.batteryReadIntervalHours,
      1,
      168,
    ),
  }

  await Preferences.set({
    key: GENERAL_OPTIONS_KEY,
    value: JSON.stringify(merged),
  })

  return merged
}

export const getAppSettingsPreference = async (): Promise<AppSettings> => {
  const [notificationsEnabled, preferredReminderTime, minimumNotifiedSeverity, generalOptions] =
    await Promise.all([
      getNotificationsEnabledPreference(),
      getReminderTimePreference(),
      getMinimumNotifiedSeverityPreference(),
      getGeneralOptionsPreference(),
    ])

  return {
    themeMode: 'dark',
    notificationsEnabled,
    minimumNotifiedSeverity,
    preferredReminderTime,
    preferredHistoryRange: generalOptions.preferredHistoryRange,
    staleDataThresholdMinutes: generalOptions.staleDataThresholdMinutes,
    batteryReadIntervalHours: generalOptions.batteryReadIntervalHours,
    autoSyncOnForeground: generalOptions.autoSyncOnForeground,
  }
}

export const updateAppSettingsPreference = async (patch: Partial<AppSettings>): Promise<AppSettings> => {
  await setThemeModePreference('dark')

  if (patch.notificationsEnabled !== undefined) {
    await setNotificationsEnabledPreference(patch.notificationsEnabled)
  }

  if (patch.preferredReminderTime !== undefined) {
    await setReminderTimePreference(patch.preferredReminderTime)
  }

  if (patch.minimumNotifiedSeverity !== undefined) {
    await setMinimumNotifiedSeverityPreference(patch.minimumNotifiedSeverity)
  }

  const generalPatch: Partial<GeneralSettingsOptions> = {}

  if (patch.preferredHistoryRange !== undefined) {
    generalPatch.preferredHistoryRange = patch.preferredHistoryRange
  }

  if (patch.staleDataThresholdMinutes !== undefined) {
    generalPatch.staleDataThresholdMinutes = patch.staleDataThresholdMinutes
  }

  if (patch.batteryReadIntervalHours !== undefined) {
    generalPatch.batteryReadIntervalHours = patch.batteryReadIntervalHours
  }

  if (patch.autoSyncOnForeground !== undefined) {
    generalPatch.autoSyncOnForeground = patch.autoSyncOnForeground
  }

  if (Object.keys(generalPatch).length > 0) {
    await updateGeneralOptionsPreference(generalPatch)
  }

  return getAppSettingsPreference()
}
