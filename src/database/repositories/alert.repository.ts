import { queryRows, runStatement } from '@/database/sqlite.service'
import { fromSqliteBoolean, nowIso, toNullableString, toSqliteBoolean } from '@/database/repositories/repository.utils'
import type { Alert, AlertSeverity, AlertType } from '@/types/alert.types'
import { generateId } from '@/utils/id.util'

const ALERT_TYPES: AlertType[] = [
  'humidity_low',
  'humidity_high',
  'temperature_out_of_range',
  'light_low',
  'conductivity_low',
  'stale_data',
  'sensor_battery_low',
]

const ALERT_SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical']

interface AlertRow {
  id: string
  plant_id: string
  type: string
  severity: string
  title: string
  message: string
  is_read: number
  created_at: string
  measurement_id: string | null
}

export interface CreateAlertInput {
  id?: string
  plantId: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  isRead?: boolean
  createdAt?: string
  measurementId?: string | null
}

const toAlertType = (value: string): AlertType =>
  ALERT_TYPES.includes(value as AlertType) ? (value as AlertType) : 'stale_data'

const toAlertSeverity = (value: string): AlertSeverity =>
  ALERT_SEVERITIES.includes(value as AlertSeverity) ? (value as AlertSeverity) : 'warning'

const mapAlertRow = (row: AlertRow): Alert => ({
  id: row.id,
  plantId: row.plant_id,
  type: toAlertType(row.type),
  severity: toAlertSeverity(row.severity),
  title: row.title,
  message: row.message,
  isRead: fromSqliteBoolean(row.is_read),
  createdAt: row.created_at,
  measurementId: toNullableString(row.measurement_id),
})

export class AlertRepository {
  async create(input: CreateAlertInput): Promise<Alert> {
    const alert: Alert = {
      id: input.id ?? generateId(),
      plantId: input.plantId,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      isRead: input.isRead ?? false,
      createdAt: input.createdAt ?? nowIso(),
      measurementId: input.measurementId ?? null,
    }

    await runStatement(
      `
      INSERT INTO alerts (
        id,
        plant_id,
        type,
        severity,
        title,
        message,
        is_read,
        created_at,
        measurement_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        alert.id,
        alert.plantId,
        alert.type,
        alert.severity,
        alert.title,
        alert.message,
        toSqliteBoolean(alert.isRead),
        alert.createdAt,
        alert.measurementId,
      ],
    )

    return alert
  }

  async findById(id: string): Promise<Alert | null> {
    const rows = await queryRows<AlertRow>('SELECT * FROM alerts WHERE id = ? LIMIT 1;', [id])

    return rows.length > 0 ? mapAlertRow(rows[0]) : null
  }

  async listAll(limit = 200): Promise<Alert[]> {
    const rows = await queryRows<AlertRow>('SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?;', [limit])

    return rows.map(mapAlertRow)
  }

  async listByPlantId(plantId: string, limit = 200): Promise<Alert[]> {
    const rows = await queryRows<AlertRow>(
      'SELECT * FROM alerts WHERE plant_id = ? ORDER BY created_at DESC LIMIT ?;',
      [plantId, limit],
    )

    return rows.map(mapAlertRow)
  }

  async listUnread(limit = 200): Promise<Alert[]> {
    const rows = await queryRows<AlertRow>(
      'SELECT * FROM alerts WHERE is_read = 0 ORDER BY created_at DESC LIMIT ?;',
      [limit],
    )

    return rows.map(mapAlertRow)
  }

  async markAsRead(id: string, isRead = true): Promise<Alert | null> {
    await runStatement('UPDATE alerts SET is_read = ? WHERE id = ?;', [toSqliteBoolean(isRead), id])

    return this.findById(id)
  }

  async delete(id: string): Promise<void> {
    await runStatement('DELETE FROM alerts WHERE id = ?;', [id])
  }
}
