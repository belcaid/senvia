import { queryRows, runStatement } from '@/database/sqlite.service'
import { nowIso, toNumberOrNull } from '@/database/repositories/repository.utils'
import type { Measurement, MeasurementSource } from '@/types/measurement.types'
import { generateId } from '@/utils/id.util'

const MEASUREMENT_SOURCES: MeasurementSource[] = [
  'pairing_validation',
  'manual_sync',
  'plant_detail_auto_sync',
  'foreground_refresh',
  'import',
]

interface MeasurementRow {
  id: string
  plant_id: string
  sensor_id: string
  measured_at: string
  temperature: number
  moisture: number
  light: number
  conductivity: number
  battery_level: number | null
  source: string
}

export interface CreateMeasurementInput {
  id?: string
  plantId: string
  sensorId: string
  measuredAt?: string
  temperature: number
  moisture: number
  light: number
  conductivity: number
  batteryLevel?: number | null
  source: MeasurementSource
}

const toMeasurementSource = (value: string): MeasurementSource =>
  MEASUREMENT_SOURCES.includes(value as MeasurementSource) ? (value as MeasurementSource) : 'manual_sync'

const mapMeasurementRow = (row: MeasurementRow): Measurement => ({
  id: row.id,
  plantId: row.plant_id,
  sensorId: row.sensor_id,
  measuredAt: row.measured_at,
  temperature: Number(row.temperature),
  moisture: Number(row.moisture),
  light: Number(row.light),
  conductivity: Number(row.conductivity),
  batteryLevel: toNumberOrNull(row.battery_level),
  source: toMeasurementSource(row.source),
})

export class MeasurementRepository {
  async create(input: CreateMeasurementInput): Promise<Measurement> {
    const measurement: Measurement = {
      id: input.id ?? generateId(),
      plantId: input.plantId,
      sensorId: input.sensorId,
      measuredAt: input.measuredAt ?? nowIso(),
      temperature: input.temperature,
      moisture: input.moisture,
      light: input.light,
      conductivity: input.conductivity,
      batteryLevel: input.batteryLevel ?? null,
      source: input.source,
    }

    await runStatement(
      `
      INSERT INTO measurements (
        id,
        plant_id,
        sensor_id,
        measured_at,
        temperature,
        moisture,
        light,
        conductivity,
        battery_level,
        source
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        measurement.id,
        measurement.plantId,
        measurement.sensorId,
        measurement.measuredAt,
        measurement.temperature,
        measurement.moisture,
        measurement.light,
        measurement.conductivity,
        measurement.batteryLevel,
        measurement.source,
      ],
    )

    return measurement
  }

  async findById(id: string): Promise<Measurement | null> {
    const rows = await queryRows<MeasurementRow>('SELECT * FROM measurements WHERE id = ? LIMIT 1;', [id])

    return rows.length > 0 ? mapMeasurementRow(rows[0]) : null
  }

  async listByPlantId(plantId: string, limit = 200): Promise<Measurement[]> {
    const rows = await queryRows<MeasurementRow>(
      'SELECT * FROM measurements WHERE plant_id = ? ORDER BY measured_at DESC LIMIT ?;',
      [plantId, limit],
    )

    return rows.map(mapMeasurementRow)
  }

  async listByPlantIdSince(plantId: string, sinceIso: string | null, limit = 200): Promise<Measurement[]> {
    if (sinceIso === null) {
      return this.listByPlantId(plantId, limit)
    }

    const rows = await queryRows<MeasurementRow>(
      `
      SELECT *
      FROM measurements
      WHERE plant_id = ?
        AND measured_at >= ?
      ORDER BY measured_at DESC
      LIMIT ?;
      `,
      [plantId, sinceIso, limit],
    )

    return rows.map(mapMeasurementRow)
  }

  async listBySensorId(sensorId: string, limit = 200): Promise<Measurement[]> {
    const rows = await queryRows<MeasurementRow>(
      'SELECT * FROM measurements WHERE sensor_id = ? ORDER BY measured_at DESC LIMIT ?;',
      [sensorId, limit],
    )

    return rows.map(mapMeasurementRow)
  }

  async getLatestByPlantId(plantId: string): Promise<Measurement | null> {
    const rows = await queryRows<MeasurementRow>(
      'SELECT * FROM measurements WHERE plant_id = ? ORDER BY measured_at DESC LIMIT 1;',
      [plantId],
    )

    return rows.length > 0 ? mapMeasurementRow(rows[0]) : null
  }

  async getLatestBySensorId(sensorId: string): Promise<Measurement | null> {
    const rows = await queryRows<MeasurementRow>(
      'SELECT * FROM measurements WHERE sensor_id = ? ORDER BY measured_at DESC LIMIT 1;',
      [sensorId],
    )

    return rows.length > 0 ? mapMeasurementRow(rows[0]) : null
  }

  async delete(id: string): Promise<void> {
    await runStatement('DELETE FROM measurements WHERE id = ?;', [id])
  }

  async deleteByPlantId(plantId: string): Promise<void> {
    await runStatement('DELETE FROM measurements WHERE plant_id = ?;', [plantId])
  }
}
