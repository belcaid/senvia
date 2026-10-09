import {
  CREATE_ALERTS_TABLE_SQL,
  CREATE_INDEXES_SQL,
  CREATE_MEASUREMENTS_TABLE_SQL,
  CREATE_PLANTS_TABLE_SQL,
  CREATE_SENSOR_RELATION_AFTER_DELETE_TRIGGER_SQL,
  CREATE_SENSOR_RELATION_AFTER_INSERT_TRIGGER_SQL,
  CREATE_SENSOR_RELATION_AFTER_UPDATE_ASSIGN_TRIGGER_SQL,
  CREATE_SENSOR_RELATION_AFTER_UPDATE_CLEANUP_TRIGGER_SQL,
  CREATE_SENSOR_DEVICES_TABLE_SQL,
  CREATE_THRESHOLD_PROFILES_TABLE_SQL,
} from '@/database/schema'

export interface DatabaseMigration {
  version: number
  name: string
  statements: string[]
}

export const DATABASE_MIGRATIONS: DatabaseMigration[] = [
  {
    version: 1,
    name: 'init_schema',
    statements: [
      CREATE_THRESHOLD_PROFILES_TABLE_SQL,
      CREATE_PLANTS_TABLE_SQL,
      CREATE_SENSOR_DEVICES_TABLE_SQL,
      CREATE_MEASUREMENTS_TABLE_SQL,
      CREATE_ALERTS_TABLE_SQL,
      CREATE_INDEXES_SQL,
    ],
  },
  {
    version: 2,
    name: 'enforce_sensor_plant_relation',
    statements: [
      CREATE_SENSOR_RELATION_AFTER_INSERT_TRIGGER_SQL,
      CREATE_SENSOR_RELATION_AFTER_UPDATE_CLEANUP_TRIGGER_SQL,
      CREATE_SENSOR_RELATION_AFTER_UPDATE_ASSIGN_TRIGGER_SQL,
      CREATE_SENSOR_RELATION_AFTER_DELETE_TRIGGER_SQL,
    ],
  },
  {
    version: 3,
    name: 'track_alert_lifecycle',
    statements: [
      'ALTER TABLE alerts ADD COLUMN sensor_id TEXT;',
      'ALTER TABLE alerts ADD COLUMN last_detected_at TEXT;',
      'ALTER TABLE alerts ADD COLUMN resolved_at TEXT;',
      'UPDATE alerts SET last_detected_at = created_at WHERE last_detected_at IS NULL;',
      `
      UPDATE alerts
      SET sensor_id = (
        SELECT measurements.sensor_id
        FROM measurements
        WHERE measurements.id = alerts.measurement_id
      )
      WHERE measurement_id IS NOT NULL AND sensor_id IS NULL;
      `,
      `
      UPDATE alerts
      SET sensor_id = (
        SELECT sensor_devices.id
        FROM sensor_devices
        WHERE sensor_devices.plant_id = alerts.plant_id
        LIMIT 1
      )
      WHERE sensor_id IS NULL;
      `,
      `
      UPDATE alerts
      SET resolved_at = COALESCE(last_detected_at, created_at)
      WHERE EXISTS (
        SELECT 1
        FROM alerts AS newer
        WHERE newer.plant_id = alerts.plant_id
          AND newer.type = alerts.type
          AND (
            newer.created_at > alerts.created_at
            OR (newer.created_at = alerts.created_at AND newer.id > alerts.id)
          )
      );
      `,
      'CREATE INDEX IF NOT EXISTS idx_alerts_resolution ON alerts(resolved_at, last_detected_at DESC);',
      `
      CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_one_open_episode
      ON alerts(plant_id, type)
      WHERE resolved_at IS NULL;
      `,
    ],
  },
  {
    version: 4,
    name: 'repair_sensor_relation_update_trigger',
    statements: [
      'DROP TRIGGER IF EXISTS trg_sensor_relation_after_update;',
      CREATE_SENSOR_RELATION_AFTER_UPDATE_CLEANUP_TRIGGER_SQL,
      CREATE_SENSOR_RELATION_AFTER_UPDATE_ASSIGN_TRIGGER_SQL,
    ],
  },
]
