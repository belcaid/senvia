import { queryRows, runStatement } from '@/database/sqlite.service'
import { nowIso, toNullableString, toNumberOrNull } from '@/database/repositories/repository.utils'
import type { SensorDevice, SensorModel } from '@/types/sensor-device.types'
import { generateId } from '@/utils/id.util'

const SENSOR_MODELS: SensorModel[] = ['flower-care', 'hhcc', 'other']

interface SensorDeviceRow {
  id: string
  plant_id: string | null
  device_identifier: string
  device_name: string
  model: string
  firmware_version: string | null
  battery_level: number | null
  last_battery_read_at: string | null
  paired_at: string
  last_seen_at: string | null
}

export interface CreateSensorDeviceInput {
  id?: string
  plantId?: string | null
  deviceIdentifier: string
  deviceName: string
  model?: SensorModel
  firmwareVersion?: string | null
  batteryLevel?: number | null
  lastBatteryReadAt?: string | null
  pairedAt?: string
  lastSeenAt?: string | null
}

export interface UpdateSensorDeviceInput {
  plantId?: string | null
  deviceName?: string
  model?: SensorModel
  firmwareVersion?: string | null
  batteryLevel?: number | null
  lastBatteryReadAt?: string | null
  lastSeenAt?: string | null
}

const toSensorModel = (value: string): SensorModel =>
  SENSOR_MODELS.includes(value as SensorModel) ? (value as SensorModel) : 'other'

const mapSensorDeviceRow = (row: SensorDeviceRow): SensorDevice => ({
  id: row.id,
  plantId: toNullableString(row.plant_id),
  deviceIdentifier: row.device_identifier,
  deviceName: row.device_name,
  model: toSensorModel(row.model),
  firmwareVersion: toNullableString(row.firmware_version),
  batteryLevel: toNumberOrNull(row.battery_level),
  lastBatteryReadAt: toNullableString(row.last_battery_read_at),
  pairedAt: row.paired_at,
  lastSeenAt: toNullableString(row.last_seen_at),
})

export class SensorDeviceRepository {
  async create(input: CreateSensorDeviceInput): Promise<SensorDevice> {
    const sensorDevice: SensorDevice = {
      id: input.id ?? generateId(),
      plantId: input.plantId ?? null,
      deviceIdentifier: input.deviceIdentifier,
      deviceName: input.deviceName,
      model: input.model ?? 'other',
      firmwareVersion: input.firmwareVersion ?? null,
      batteryLevel: input.batteryLevel ?? null,
      lastBatteryReadAt: input.lastBatteryReadAt ?? null,
      pairedAt: input.pairedAt ?? nowIso(),
      lastSeenAt: input.lastSeenAt ?? null,
    }

    await runStatement(
      `
      INSERT INTO sensor_devices (
        id,
        plant_id,
        device_identifier,
        device_name,
        model,
        firmware_version,
        battery_level,
        last_battery_read_at,
        paired_at,
        last_seen_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        sensorDevice.id,
        sensorDevice.plantId,
        sensorDevice.deviceIdentifier,
        sensorDevice.deviceName,
        sensorDevice.model,
        sensorDevice.firmwareVersion,
        sensorDevice.batteryLevel,
        sensorDevice.lastBatteryReadAt,
        sensorDevice.pairedAt,
        sensorDevice.lastSeenAt,
      ],
    )

    return sensorDevice
  }

  async update(id: string, updates: UpdateSensorDeviceInput): Promise<SensorDevice | null> {
    const entries: Array<[string, unknown]> = []

    if (updates.plantId !== undefined) {
      entries.push(['plant_id', updates.plantId])
    }

    if (updates.deviceName !== undefined) {
      entries.push(['device_name', updates.deviceName])
    }

    if (updates.model !== undefined) {
      entries.push(['model', updates.model])
    }

    if (updates.firmwareVersion !== undefined) {
      entries.push(['firmware_version', updates.firmwareVersion])
    }

    if (updates.batteryLevel !== undefined) {
      entries.push(['battery_level', updates.batteryLevel])
    }

    if (updates.lastBatteryReadAt !== undefined) {
      entries.push(['last_battery_read_at', updates.lastBatteryReadAt])
    }

    if (updates.lastSeenAt !== undefined) {
      entries.push(['last_seen_at', updates.lastSeenAt])
    }

    if (entries.length === 0) {
      return this.findById(id)
    }

    const updateClause = entries.map(([column]) => `${column} = ?`).join(', ')
    const values = entries.map(([, value]) => value)
    values.push(id)

    await runStatement(`UPDATE sensor_devices SET ${updateClause} WHERE id = ?;`, values)

    return this.findById(id)
  }

  async findById(id: string): Promise<SensorDevice | null> {
    const rows = await queryRows<SensorDeviceRow>('SELECT * FROM sensor_devices WHERE id = ? LIMIT 1;', [id])

    return rows.length > 0 ? mapSensorDeviceRow(rows[0]) : null
  }

  async findByPlantId(plantId: string): Promise<SensorDevice | null> {
    const rows = await queryRows<SensorDeviceRow>(
      'SELECT * FROM sensor_devices WHERE plant_id = ? LIMIT 1;',
      [plantId],
    )

    return rows.length > 0 ? mapSensorDeviceRow(rows[0]) : null
  }

  async findByDeviceIdentifier(deviceIdentifier: string): Promise<SensorDevice | null> {
    const rows = await queryRows<SensorDeviceRow>(
      'SELECT * FROM sensor_devices WHERE device_identifier = ? LIMIT 1;',
      [deviceIdentifier],
    )

    return rows.length > 0 ? mapSensorDeviceRow(rows[0]) : null
  }

  async findAll(): Promise<SensorDevice[]> {
    const rows = await queryRows<SensorDeviceRow>('SELECT * FROM sensor_devices ORDER BY paired_at DESC;')

    return rows.map(mapSensorDeviceRow)
  }

  async delete(id: string): Promise<void> {
    await runStatement('DELETE FROM sensor_devices WHERE id = ?;', [id])
  }
}
