import initSqlJs from 'sql.js'
import { describe, expect, it } from 'vitest'
import { DATABASE_MIGRATIONS } from '@/database/migrations'

describe('database migrations', () => {
  it('create a fresh database and keep the plant-sensor relation consistent', async () => {
    const SQL = await initSqlJs()
    const database = new SQL.Database()

    for (const migration of DATABASE_MIGRATIONS) {
      for (const statement of migration.statements) {
        database.run(statement)
      }
    }

    database.run(`
      INSERT INTO plants (id, name, category, location, icon, is_favorite, status, created_at, updated_at)
      VALUES ('plant-a', 'Plant A', 'indoor', '', 'leaf', 0, 'unknown', '2026-10-09', '2026-10-09');
      INSERT INTO plants (id, name, category, location, icon, is_favorite, status, created_at, updated_at)
      VALUES ('plant-b', 'Plant B', 'indoor', '', 'leaf', 0, 'unknown', '2026-10-09', '2026-10-09');
      INSERT INTO sensor_devices (id, plant_id, device_identifier, device_name, model, paired_at)
      VALUES ('sensor-a', 'plant-a', 'device-a', 'Flower care', 'flower-care', '2026-10-09');
    `)

    database.run("UPDATE sensor_devices SET plant_id = 'plant-b' WHERE id = 'sensor-a';")

    const rows = database.exec('SELECT id, sensor_id FROM plants ORDER BY id;')[0]?.values ?? []
    expect(rows).toEqual([
      ['plant-a', null],
      ['plant-b', 'sensor-a'],
    ])

    database.close()
  })
})
