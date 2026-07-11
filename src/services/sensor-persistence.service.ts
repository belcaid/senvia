import { runInTransaction } from '@/database/sqlite.service'
import type { Measurement, MeasurementSource } from '@/types/measurement.types'
import type { PlantStatus } from '@/types/plant.types'
import type { SensorModel } from '@/types/sensor-device.types'
import { generateId } from '@/utils/id.util'

interface SensorRow {
  id: string
  plant_id: string | null
  battery_level: number | null
  last_battery_read_at: string | null
}

interface PairSensorInput {
  plantId: string
  deviceIdentifier: string
  deviceName: string
  model: SensorModel
  batteryLevel: number | null
  batteryReadAt: string | null
  measuredAt: string
  temperature: number
  moisture: number
  light: number
  conductivity: number
}

interface PersistMeasurementInput {
  plantId: string
  sensorId: string
  measuredAt: string
  temperature: number
  moisture: number
  light: number
  conductivity: number
  batteryLevel: number | null
  batteryReadAt: string | null
  source: MeasurementSource
  status: PlantStatus
}

export interface PairSensorResult {
  sensorId: string
  measurementId: string
}

export const deleteSensorAndResolveAlerts = async (sensorId: string): Promise<void> => {
  await runInTransaction(async (transaction) => {
    const sensorRows = await transaction.query<SensorRow>(
      'SELECT id, plant_id, battery_level, last_battery_read_at FROM sensor_devices WHERE id = ? LIMIT 1;',
      [sensorId],
    )
    const plantId = sensorRows[0]?.plant_id ?? null
    const resolvedAt = new Date().toISOString()

    if (plantId === null) {
      await transaction.run(
        'UPDATE alerts SET resolved_at = ? WHERE sensor_id = ? AND resolved_at IS NULL;',
        [resolvedAt, sensorId],
      )
    } else {
      await transaction.run(
        `
        UPDATE alerts
        SET resolved_at = ?
        WHERE plant_id = ?
          AND resolved_at IS NULL
          AND (sensor_id = ? OR sensor_id IS NULL);
        `,
        [resolvedAt, plantId, sensorId],
      )
    }

    await transaction.run('DELETE FROM sensor_devices WHERE id = ?;', [sensorId])
  })
}

export const persistSensorPairing = async (input: PairSensorInput): Promise<PairSensorResult> => {
  return runInTransaction(async (transaction) => {
    const existingRows = await transaction.query<SensorRow>(
      'SELECT id, plant_id, battery_level, last_battery_read_at FROM sensor_devices WHERE device_identifier = ? LIMIT 1;',
      [input.deviceIdentifier],
    )
    const existing = existingRows[0] ?? null
    const associatedRows = await transaction.query<SensorRow>(
      'SELECT id, plant_id, battery_level, last_battery_read_at FROM sensor_devices WHERE plant_id = ? LIMIT 1;',
      [input.plantId],
    )
    const previouslyAssociatedSensor = associatedRows[0] ?? null

    if (existing?.plant_id && existing.plant_id !== input.plantId) {
      throw new Error('Ce capteur est deja associe a une autre plante.')
    }

    const sensorId = existing?.id ?? generateId()
    const batteryLevel = input.batteryLevel ?? existing?.battery_level ?? null
    const batteryReadAt = input.batteryReadAt ?? existing?.last_battery_read_at ?? null

    if (previouslyAssociatedSensor !== null && previouslyAssociatedSensor.id !== sensorId) {
      await transaction.run(
        'UPDATE alerts SET resolved_at = ? WHERE plant_id = ? AND resolved_at IS NULL;',
        [new Date().toISOString(), input.plantId],
      )
    }
    await transaction.run(
      'UPDATE sensor_devices SET plant_id = NULL WHERE plant_id = ? AND id <> ?;',
      [input.plantId, sensorId],
    )

    if (existing) {
      await transaction.run(
        `
        UPDATE sensor_devices
        SET plant_id = ?, device_name = ?, model = ?, battery_level = ?,
            last_battery_read_at = ?, last_seen_at = ?
        WHERE id = ?;
        `,
        [
          input.plantId,
          input.deviceName,
          input.model,
          batteryLevel,
          batteryReadAt,
          input.measuredAt,
          sensorId,
        ],
      )
    } else {
      await transaction.run(
        `
        INSERT INTO sensor_devices (
          id, plant_id, device_identifier, device_name, model, firmware_version,
          battery_level, last_battery_read_at, paired_at, last_seen_at
        )
        VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?);
        `,
        [
          sensorId,
          input.plantId,
          input.deviceIdentifier,
          input.deviceName,
          input.model,
          batteryLevel,
          batteryReadAt,
          new Date().toISOString(),
          input.measuredAt,
        ],
      )
    }

    const measurementId = generateId()
    await transaction.run(
      `
      INSERT INTO measurements (
        id, plant_id, sensor_id, measured_at, temperature, moisture,
        light, conductivity, battery_level, source
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        measurementId,
        input.plantId,
        sensorId,
        input.measuredAt,
        input.temperature,
        input.moisture,
        input.light,
        input.conductivity,
        batteryLevel,
        'pairing_validation',
      ],
    )

    await transaction.run(
      'UPDATE plants SET sensor_id = ?, updated_at = ? WHERE id = ?;',
      [sensorId, new Date().toISOString(), input.plantId],
    )

    return { sensorId, measurementId }
  })
}

export const persistSensorMeasurement = async (
  input: PersistMeasurementInput,
): Promise<Measurement> => {
  return runInTransaction(async (transaction) => {
    const measurement: Measurement = {
      id: generateId(),
      plantId: input.plantId,
      sensorId: input.sensorId,
      measuredAt: input.measuredAt,
      temperature: input.temperature,
      moisture: input.moisture,
      light: input.light,
      conductivity: input.conductivity,
      batteryLevel: input.batteryLevel,
      source: input.source,
    }

    await transaction.run(
      `
      INSERT INTO measurements (
        id, plant_id, sensor_id, measured_at, temperature, moisture,
        light, conductivity, battery_level, source
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

    await transaction.run(
      `
      UPDATE sensor_devices
      SET battery_level = COALESCE(?, battery_level),
          last_battery_read_at = COALESCE(?, last_battery_read_at),
          last_seen_at = ?
      WHERE id = ?;
      `,
      [input.batteryLevel, input.batteryReadAt, input.measuredAt, input.sensorId],
    )
    await transaction.run(
      'UPDATE plants SET status = ?, updated_at = ? WHERE id = ?;',
      [input.status, new Date().toISOString(), input.plantId],
    )

    return measurement
  })
}
