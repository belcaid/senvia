import { queryRows, runStatement } from '@/database/sqlite.service'
import { fromSqliteBoolean, nowIso, toNullableString, toSqliteBoolean } from '@/database/repositories/repository.utils'
import type { Alert, AlertSeverity, AlertType } from '@/types/alert.types'
import { generateId } from '@/utils/id.util'

const ALERT_TYPES: AlertType[] = [
  'humidity_low',
  'humidity_high',
  'temperature_out_of_range',
  'light_low',
  'light_high',
  'conductivity_low',
  'conductivity_high',
  'stale_data',
  'sensor_battery_low',
]

const ALERT_SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical']

interface AlertRow {
  id: string
  plant_id: string
  sensor_id: string | null
  type: string
  severity: string
  title: string
  message: string
  is_read: number
  created_at: string
  last_detected_at: string | null
  resolved_at: string | null
  measurement_id: string | null
}

export interface CreateAlertInput {
  id?: string
  plantId: string
  sensorId?: string | null
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  isRead?: boolean
  createdAt?: string
  lastDetectedAt?: string
  resolvedAt?: string | null
  measurementId?: string | null
}

const toAlertType = (value: string): AlertType =>
  ALERT_TYPES.includes(value as AlertType) ? (value as AlertType) : 'stale_data'

const toAlertSeverity = (value: string): AlertSeverity =>
  ALERT_SEVERITIES.includes(value as AlertSeverity) ? (value as AlertSeverity) : 'warning'

const mapAlertRow = (row: AlertRow): Alert => ({
  id: row.id,
  plantId: row.plant_id,
  sensorId: toNullableString(row.sensor_id),
  type: toAlertType(row.type),
  severity: toAlertSeverity(row.severity),
  title: row.title,
  message: row.message,
  isRead: fromSqliteBoolean(row.is_read),
  createdAt: row.created_at,
  lastDetectedAt: row.last_detected_at ?? row.created_at,
  resolvedAt: toNullableString(row.resolved_at),
  measurementId: toNullableString(row.measurement_id),
})

export class AlertRepository {
  async create(input: CreateAlertInput): Promise<Alert> {
    const createdAt = input.createdAt ?? nowIso()
    const alert: Alert = {
      id: input.id ?? generateId(),
      plantId: input.plantId,
      sensorId: input.sensorId ?? null,
      type: input.type,
      severity: input.severity,
      title: input.title,
      message: input.message,
      isRead: input.isRead ?? false,
      createdAt,
      lastDetectedAt: input.lastDetectedAt ?? createdAt,
      resolvedAt: input.resolvedAt ?? null,
      measurementId: input.measurementId ?? null,
    }

    await runStatement(
      `
      INSERT INTO alerts (
        id,
        plant_id,
        sensor_id,
        type,
        severity,
        title,
        message,
        is_read,
        created_at,
        last_detected_at,
        resolved_at,
        measurement_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        alert.id,
        alert.plantId,
        alert.sensorId,
        alert.type,
        alert.severity,
        alert.title,
        alert.message,
        toSqliteBoolean(alert.isRead),
        alert.createdAt,
        alert.lastDetectedAt,
        alert.resolvedAt,
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

  async getOpenByPlantAndType(plantId: string, type: AlertType): Promise<Alert | null> {
    const rows = await queryRows<AlertRow>(
      `
      SELECT *
      FROM alerts
      WHERE plant_id = ? AND type = ? AND resolved_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1;
      `,
      [plantId, type],
    )

    return rows.length > 0 ? mapAlertRow(rows[0]) : null
  }

  async updateOpenAlert(
    id: string,
    updates: Pick<CreateAlertInput, 'sensorId' | 'severity' | 'title' | 'message' | 'measurementId'> & {
      markUnread: boolean
    },
  ): Promise<Alert | null> {
    await runStatement(
      `
      UPDATE alerts
      SET sensor_id = ?,
          severity = ?,
          title = ?,
          message = ?,
          measurement_id = ?,
          last_detected_at = ?,
          is_read = CASE WHEN ? = 1 THEN 0 ELSE is_read END
      WHERE id = ? AND resolved_at IS NULL;
      `,
      [
        updates.sensorId ?? null,
        updates.severity,
        updates.title,
        updates.message,
        updates.measurementId ?? null,
        nowIso(),
        toSqliteBoolean(updates.markUnread),
        id,
      ],
    )

    return this.findById(id)
  }

  async resolveOpenByPlantExceptTypes(plantId: string, activeTypes: AlertType[]): Promise<void> {
    const resolvedAt = nowIso()

    if (activeTypes.length === 0) {
      await runStatement(
        'UPDATE alerts SET resolved_at = ? WHERE plant_id = ? AND resolved_at IS NULL;',
        [resolvedAt, plantId],
      )
      return
    }

    const placeholders = activeTypes.map(() => '?').join(', ')
    await runStatement(
      `
      UPDATE alerts
      SET resolved_at = ?
      WHERE plant_id = ?
        AND resolved_at IS NULL
        AND type NOT IN (${placeholders});
      `,
      [resolvedAt, plantId, ...activeTypes],
    )
  }

  async resolve(id: string): Promise<void> {
    await runStatement(
      'UPDATE alerts SET resolved_at = ? WHERE id = ? AND resolved_at IS NULL;',
      [nowIso(), id],
    )
  }

  async markAsRead(id: string, isRead = true): Promise<Alert | null> {
    await runStatement('UPDATE alerts SET is_read = ? WHERE id = ?;', [toSqliteBoolean(isRead), id])

    return this.findById(id)
  }

  async markAllAsRead(): Promise<void> {
    await runStatement('UPDATE alerts SET is_read = 1 WHERE is_read = 0;')
  }

  async deleteResolvedRead(): Promise<void> {
    await runStatement('DELETE FROM alerts WHERE resolved_at IS NOT NULL AND is_read = 1;')
  }

  async pruneResolvedReadOlderThan(cutoffIso: string): Promise<void> {
    await runStatement(
      `
      DELETE FROM alerts
      WHERE resolved_at IS NOT NULL
        AND is_read = 1
        AND resolved_at < ?;
      `,
      [cutoffIso],
    )
  }

  async delete(id: string): Promise<void> {
    await runStatement('DELETE FROM alerts WHERE id = ?;', [id])
  }
}
