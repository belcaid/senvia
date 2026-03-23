import { queryRows, runStatement } from '@/database/sqlite.service'
import { fromSqliteBoolean, nowIso, toNullableString, toSqliteBoolean } from '@/database/repositories/repository.utils'
import type { Plant, PlantCategory, PlantStatus } from '@/types/plant.types'
import { generateId } from '@/utils/id.util'

const PLANT_CATEGORIES: PlantCategory[] = ['indoor', 'outdoor', 'balcony', 'garden', 'vegetable_garden', 'other']
const PLANT_STATUSES: PlantStatus[] = ['healthy', 'warning', 'critical', 'stale_data', 'unknown']

interface PlantRow {
  id: string
  name: string
  category: string
  location: string
  icon: string
  is_favorite: number
  sensor_id: string | null
  threshold_profile_id: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface CreatePlantInput {
  id?: string
  name: string
  category: PlantCategory
  location: string
  icon: string
  isFavorite?: boolean
  sensorId?: string | null
  thresholdProfileId?: string | null
  status?: PlantStatus
}

export interface UpdatePlantInput {
  name?: string
  category?: PlantCategory
  location?: string
  icon?: string
  isFavorite?: boolean
  sensorId?: string | null
  thresholdProfileId?: string | null
  status?: PlantStatus
}

const toPlantCategory = (value: string): PlantCategory =>
  PLANT_CATEGORIES.includes(value as PlantCategory) ? (value as PlantCategory) : 'other'

const toPlantStatus = (value: string): PlantStatus =>
  PLANT_STATUSES.includes(value as PlantStatus) ? (value as PlantStatus) : 'unknown'

const mapPlantRow = (row: PlantRow): Plant => ({
  id: row.id,
  name: row.name,
  category: toPlantCategory(row.category),
  location: row.location,
  icon: row.icon,
  isFavorite: fromSqliteBoolean(row.is_favorite),
  sensorId: toNullableString(row.sensor_id),
  thresholdProfileId: toNullableString(row.threshold_profile_id),
  status: toPlantStatus(row.status),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

export class PlantRepository {
  async create(input: CreatePlantInput): Promise<Plant> {
    const timestamp = nowIso()
    const plant: Plant = {
      id: input.id ?? generateId(),
      name: input.name,
      category: input.category,
      location: input.location,
      icon: input.icon,
      isFavorite: input.isFavorite ?? false,
      sensorId: input.sensorId ?? null,
      thresholdProfileId: input.thresholdProfileId ?? null,
      status: input.status ?? 'unknown',
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await runStatement(
      `
      INSERT INTO plants (
        id,
        name,
        category,
        location,
        icon,
        is_favorite,
        sensor_id,
        threshold_profile_id,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        plant.id,
        plant.name,
        plant.category,
        plant.location,
        plant.icon,
        toSqliteBoolean(plant.isFavorite),
        plant.sensorId,
        plant.thresholdProfileId,
        plant.status,
        plant.createdAt,
        plant.updatedAt,
      ],
    )

    return plant
  }

  async update(id: string, updates: UpdatePlantInput): Promise<Plant | null> {
    const entries: Array<[string, unknown]> = []

    if (updates.name !== undefined) {
      entries.push(['name', updates.name])
    }

    if (updates.category !== undefined) {
      entries.push(['category', updates.category])
    }

    if (updates.location !== undefined) {
      entries.push(['location', updates.location])
    }

    if (updates.icon !== undefined) {
      entries.push(['icon', updates.icon])
    }

    if (updates.isFavorite !== undefined) {
      entries.push(['is_favorite', toSqliteBoolean(updates.isFavorite)])
    }

    if (updates.sensorId !== undefined) {
      entries.push(['sensor_id', updates.sensorId])
    }

    if (updates.thresholdProfileId !== undefined) {
      entries.push(['threshold_profile_id', updates.thresholdProfileId])
    }

    if (updates.status !== undefined) {
      entries.push(['status', updates.status])
    }

    if (entries.length === 0) {
      return this.findById(id)
    }

    entries.push(['updated_at', nowIso()])

    const updateClause = entries.map(([column]) => `${column} = ?`).join(', ')
    const values = entries.map(([, value]) => value)
    values.push(id)

    await runStatement(`UPDATE plants SET ${updateClause} WHERE id = ?;`, values)

    return this.findById(id)
  }

  async findById(id: string): Promise<Plant | null> {
    const rows = await queryRows<PlantRow>('SELECT * FROM plants WHERE id = ? LIMIT 1;', [id])

    return rows.length > 0 ? mapPlantRow(rows[0]) : null
  }

  async findAll(): Promise<Plant[]> {
    const rows = await queryRows<PlantRow>('SELECT * FROM plants ORDER BY updated_at DESC;')

    return rows.map(mapPlantRow)
  }

  async updateStatus(id: string, status: PlantStatus): Promise<Plant | null> {
    await runStatement('UPDATE plants SET status = ? WHERE id = ?;', [status, id])
    return this.findById(id)
  }

  async findFavorites(): Promise<Plant[]> {
    const rows = await queryRows<PlantRow>(
      'SELECT * FROM plants WHERE is_favorite = 1 ORDER BY updated_at DESC;',
    )

    return rows.map(mapPlantRow)
  }

  async delete(id: string): Promise<void> {
    await runStatement('DELETE FROM plants WHERE id = ?;', [id])
  }
}
