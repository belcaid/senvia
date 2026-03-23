import { Capacitor } from '@capacitor/core'
import { LocalNotifications, type ActionPerformed } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { getAppSettingsPreference } from '@/services/preferences.service'
import type { Alert, AlertSeverity, AlertType } from '@/types/alert.types'
import type { AppSettings } from '@/types/app-settings.types'
import type { Router } from 'vue-router'

const ALERT_CHANNEL_ID = 'senvia-alerts'
const SYNC_REMINDER_NOTIFICATION_ID = 2_000_000_001
const NOTIFIED_ALERT_IDS_KEY = 'notified_alert_ids_v1'
const MAX_STORED_NOTIFIED_ALERT_IDS = 500
let notificationRoutingRegistered = false

const isAndroid = (): boolean => Capacitor.getPlatform() === 'android'
const isNativePlatform = (): boolean => Capacitor.getPlatform() !== 'web'

const toSeverityRank = (severity: AlertSeverity): number => {
  if (severity === 'critical') {
    return 3
  }

  if (severity === 'warning') {
    return 2
  }

  return 1
}

const shouldNotifyByMinimumSeverity = (alertSeverity: AlertSeverity, minimumSeverity: AlertSeverity): boolean =>
  toSeverityRank(alertSeverity) >= toSeverityRank(minimumSeverity)

const shouldNotifyForType = (type: AlertType, severity: AlertSeverity): boolean =>
  severity === 'critical' || type === 'sensor_battery_low' || type === 'stale_data'

const buildNotificationIdFromAlertId = (alertId: string): number => {
  let hash = 0

  for (let index = 0; index < alertId.length; index += 1) {
    hash = (hash * 31 + alertId.charCodeAt(index)) >>> 0
  }

  return 100_000 + (hash % 1_900_000_000)
}

const parseReminderTime = (value: string | null): { hour: number; minute: number } => {
  if (typeof value !== 'string') {
    return { hour: 9, minute: 0 }
  }

  const trimmed = value.trim()
  const match = /^(\d{2}):(\d{2})$/.exec(trimmed)

  if (!match) {
    return { hour: 9, minute: 0 }
  }

  const hour = Number(match[1])
  const minute = Number(match[2])

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { hour: 9, minute: 0 }
  }

  return { hour, minute }
}

const buildNextReminderDate = (hour: number, minute: number): Date => {
  const now = new Date()
  const at = new Date(now)
  at.setHours(hour, minute, 0, 0)

  if (at.getTime() <= now.getTime()) {
    at.setDate(at.getDate() + 1)
  }

  return at
}

const buildAlertNotificationCopy = (alert: Alert): { title: string; body: string } => {
  if (alert.type === 'sensor_battery_low') {
    return {
      title: 'Batterie capteur faible',
      body: alert.message,
    }
  }

  if (alert.type === 'stale_data') {
    return {
      title: 'Rappel synchronisation',
      body: alert.message,
    }
  }

  if (alert.severity === 'critical') {
    return {
      title: 'Statut critique detecte',
      body: alert.message,
    }
  }

  return {
    title: alert.title,
    body: alert.message,
  }
}

const getNotifiedAlertIds = async (): Promise<string[]> => {
  const { value } = await Preferences.get({ key: NOTIFIED_ALERT_IDS_KEY })

  if (value === null) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
  } catch {
    return []
  }
}

const setNotifiedAlertIds = async (ids: string[]): Promise<void> => {
  const trimmed = ids.slice(-MAX_STORED_NOTIFIED_ALERT_IDS)
  await Preferences.set({
    key: NOTIFIED_ALERT_IDS_KEY,
    value: JSON.stringify(trimmed),
  })
}

const ensureAndroidNotificationChannel = async (): Promise<void> => {
  if (!isAndroid()) {
    return
  }

  await LocalNotifications.createChannel({
    id: ALERT_CHANNEL_ID,
    name: 'Alertes Senvia',
    description: 'Alertes critiques, batterie faible et rappels de synchronisation',
    importance: 4,
    visibility: 1,
    vibration: true,
  })
}

const cancelSyncReminderNotification = async (): Promise<void> => {
  await LocalNotifications.cancel({
    notifications: [{ id: SYNC_REMINDER_NOTIFICATION_ID }],
  })
}

const scheduleSyncReminderNotification = async (preferredReminderTime: string | null): Promise<void> => {
  const { hour, minute } = parseReminderTime(preferredReminderTime)
  const nextReminderAt = buildNextReminderDate(hour, minute)

  await LocalNotifications.schedule({
    notifications: [
      {
        id: SYNC_REMINDER_NOTIFICATION_ID,
        title: 'Rappel de synchronisation',
        body: 'Pense a synchroniser tes capteurs Senvia pour mettre les mesures a jour.',
        channelId: isAndroid() ? ALERT_CHANNEL_ID : undefined,
        schedule: {
          at: nextReminderAt,
          every: 'day',
          allowWhileIdle: true,
        },
        extra: {
          kind: 'sync_reminder',
        },
      },
    ],
  })
}

export const ensureNotificationPermission = async (options: { request?: boolean } = {}): Promise<boolean> => {
  const permissions = await LocalNotifications.checkPermissions()

  if (permissions.display === 'granted') {
    return true
  }

  if (!options.request) {
    return false
  }

  const requestedPermissions = await LocalNotifications.requestPermissions()
  return requestedPermissions.display === 'granted'
}

export const requestAndroidNotificationPermission = async (): Promise<boolean> => {
  if (!isAndroid()) {
    return true
  }

  return ensureNotificationPermission({ request: true })
}

export const syncNotificationPreferences = async (
  settings: AppSettings,
  options: { requestPermission?: boolean } = {},
): Promise<boolean> => {
  try {
    await ensureAndroidNotificationChannel()

    if (!settings.notificationsEnabled) {
      await cancelSyncReminderNotification()
      return true
    }

    const permissionGranted = await ensureNotificationPermission({
      request: options.requestPermission ?? false,
    })

    if (!permissionGranted) {
      await cancelSyncReminderNotification()
      return false
    }

    await cancelSyncReminderNotification()
    await scheduleSyncReminderNotification(settings.preferredReminderTime)
    return true
  } catch (error) {
    console.warn('[notifications] unable to sync settings:', error)
    return false
  }
}

interface NotificationActionExtra {
  kind?: string
  plantId?: string
}

const parseActionExtra = (action: ActionPerformed): NotificationActionExtra => {
  const extra = action.notification.extra as unknown

  if (extra && typeof extra === 'object') {
    const record = extra as Record<string, unknown>

    return {
      kind: typeof record.kind === 'string' ? record.kind : undefined,
      plantId: typeof record.plantId === 'string' ? record.plantId : undefined,
    }
  }

  return {}
}

const routeFromNotificationAction = async (router: Router, action: ActionPerformed): Promise<void> => {
  const extra = parseActionExtra(action)
  const targetPlantId = extra.plantId?.trim()

  if (extra.kind === 'alert' && targetPlantId) {
    await router.push(`/plants/${targetPlantId}`)
    return
  }

  await router.push('/tabs/dashboard')
}

export const registerNotificationDeepLinks = async (router: Router): Promise<void> => {
  if (!isNativePlatform() || notificationRoutingRegistered) {
    return
  }

  await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    void routeFromNotificationAction(router, action).catch((error) => {
      console.warn('[notifications] unable to navigate after notification action:', error)
    })
  })

  notificationRoutingRegistered = true
}

export const notifyForAlerts = async (alerts: Alert[]): Promise<void> => {
  if (alerts.length === 0) {
    return
  }

  try {
    const settings = await getAppSettingsPreference()

    if (!settings.notificationsEnabled) {
      return
    }

    const permissionGranted = await ensureNotificationPermission({ request: false })

    if (!permissionGranted) {
      return
    }

    await ensureAndroidNotificationChannel()

    const alreadyNotifiedIds = new Set(await getNotifiedAlertIds())
    const nextNotifiedIds = [...alreadyNotifiedIds]
    const notificationsToSchedule: Parameters<typeof LocalNotifications.schedule>[0]['notifications'] = []

    for (const alert of alerts) {
      if (alreadyNotifiedIds.has(alert.id)) {
        continue
      }

      if (!shouldNotifyForType(alert.type, alert.severity)) {
        continue
      }

      if (!shouldNotifyByMinimumSeverity(alert.severity, settings.minimumNotifiedSeverity)) {
        continue
      }

      const copy = buildAlertNotificationCopy(alert)
      notificationsToSchedule.push({
        id: buildNotificationIdFromAlertId(alert.id),
        title: copy.title,
        body: copy.body,
        channelId: isAndroid() ? ALERT_CHANNEL_ID : undefined,
        schedule: {
          at: new Date(Date.now() + 250),
        },
        extra: {
          kind: 'alert',
          alertId: alert.id,
          plantId: alert.plantId,
          type: alert.type,
          severity: alert.severity,
        },
      })

      alreadyNotifiedIds.add(alert.id)
      nextNotifiedIds.push(alert.id)
    }

    if (notificationsToSchedule.length === 0) {
      return
    }

    await LocalNotifications.schedule({
      notifications: notificationsToSchedule,
    })
    await setNotifiedAlertIds(nextNotifiedIds)
  } catch (error) {
    console.warn('[notifications] unable to send alert notifications:', error)
  }
}
