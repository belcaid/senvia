import {
  CREATE_ALERTS_TABLE_SQL,
  CREATE_INDEXES_SQL,
  CREATE_MEASUREMENTS_TABLE_SQL,
  CREATE_PLANTS_TABLE_SQL,
  CREATE_SENSOR_DEVICES_TABLE_SQL,
  CREATE_SENSOR_RELATION_TRIGGERS_SQL,
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
    statements: [CREATE_SENSOR_RELATION_TRIGGERS_SQL],
  },
]
