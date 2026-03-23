import { queryRows, runStatement } from '@/database/sqlite.service'
import type { ThresholdProfile, ThresholdWeights } from '@/types/threshold-profile.types'
import { generateId } from '@/utils/id.util'

interface ThresholdProfileRow {
  id: string
  name: string
  temp_min: number
  temp_max: number
  moisture_min: number
  moisture_max: number
  light_min: number
  light_max: number
  conductivity_min: number
  conductivity_max: number
  weights_json: string | null
}

export interface CreateThresholdProfileInput {
  id?: string
  name: string
  tempMin: number
  tempMax: number
  moistureMin: number
  moistureMax: number
  lightMin: number
  lightMax: number
  conductivityMin: number
  conductivityMax: number
  weights?: ThresholdWeights | null
}

export interface UpdateThresholdProfileInput {
  name?: string
  tempMin?: number
  tempMax?: number
  moistureMin?: number
  moistureMax?: number
  lightMin?: number
  lightMax?: number
  conductivityMin?: number
  conductivityMax?: number
  weights?: ThresholdWeights | null
}

const parseThresholdWeights = (value: string | null): ThresholdWeights | null => {
  if (value === null) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as Partial<ThresholdWeights>

    if (
      typeof parsed.moisture === 'number' &&
      typeof parsed.temperature === 'number' &&
      typeof parsed.light === 'number' &&
      typeof parsed.conductivity === 'number'
    ) {
      return {
        moisture: parsed.moisture,
        temperature: parsed.temperature,
        light: parsed.light,
        conductivity: parsed.conductivity,
      }
    }
  } catch {
    return null
  }

  return null
}

const mapThresholdProfileRow = (row: ThresholdProfileRow): ThresholdProfile => ({
  id: row.id,
  name: row.name,
  tempMin: Number(row.temp_min),
  tempMax: Number(row.temp_max),
  moistureMin: Number(row.moisture_min),
  moistureMax: Number(row.moisture_max),
  lightMin: Number(row.light_min),
  lightMax: Number(row.light_max),
  conductivityMin: Number(row.conductivity_min),
  conductivityMax: Number(row.conductivity_max),
  weights: parseThresholdWeights(row.weights_json),
})

export class ThresholdProfileRepository {
  async create(input: CreateThresholdProfileInput): Promise<ThresholdProfile> {
    const profile: ThresholdProfile = {
      id: input.id ?? generateId(),
      name: input.name,
      tempMin: input.tempMin,
      tempMax: input.tempMax,
      moistureMin: input.moistureMin,
      moistureMax: input.moistureMax,
      lightMin: input.lightMin,
      lightMax: input.lightMax,
      conductivityMin: input.conductivityMin,
      conductivityMax: input.conductivityMax,
      weights: input.weights ?? null,
    }

    await runStatement(
      `
      INSERT INTO threshold_profiles (
        id,
        name,
        temp_min,
        temp_max,
        moisture_min,
        moisture_max,
        light_min,
        light_max,
        conductivity_min,
        conductivity_max,
        weights_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        profile.id,
        profile.name,
        profile.tempMin,
        profile.tempMax,
        profile.moistureMin,
        profile.moistureMax,
        profile.lightMin,
        profile.lightMax,
        profile.conductivityMin,
        profile.conductivityMax,
        profile.weights !== null ? JSON.stringify(profile.weights) : null,
      ],
    )

    return profile
  }

  async update(id: string, updates: UpdateThresholdProfileInput): Promise<ThresholdProfile | null> {
    const entries: Array<[string, unknown]> = []

    if (updates.name !== undefined) {
      entries.push(['name', updates.name])
    }

    if (updates.tempMin !== undefined) {
      entries.push(['temp_min', updates.tempMin])
    }

    if (updates.tempMax !== undefined) {
      entries.push(['temp_max', updates.tempMax])
    }

    if (updates.moistureMin !== undefined) {
      entries.push(['moisture_min', updates.moistureMin])
    }

    if (updates.moistureMax !== undefined) {
      entries.push(['moisture_max', updates.moistureMax])
    }

    if (updates.lightMin !== undefined) {
      entries.push(['light_min', updates.lightMin])
    }

    if (updates.lightMax !== undefined) {
      entries.push(['light_max', updates.lightMax])
    }

    if (updates.conductivityMin !== undefined) {
      entries.push(['conductivity_min', updates.conductivityMin])
    }

    if (updates.conductivityMax !== undefined) {
      entries.push(['conductivity_max', updates.conductivityMax])
    }

    if (updates.weights !== undefined) {
      entries.push(['weights_json', updates.weights !== null ? JSON.stringify(updates.weights) : null])
    }

    if (entries.length === 0) {
      return this.findById(id)
    }

    const updateClause = entries.map(([column]) => `${column} = ?`).join(', ')
    const values = entries.map(([, value]) => value)
    values.push(id)

    await runStatement(`UPDATE threshold_profiles SET ${updateClause} WHERE id = ?;`, values)

    return this.findById(id)
  }

  async findById(id: string): Promise<ThresholdProfile | null> {
    const rows = await queryRows<ThresholdProfileRow>(
      'SELECT * FROM threshold_profiles WHERE id = ? LIMIT 1;',
      [id],
    )

    return rows.length > 0 ? mapThresholdProfileRow(rows[0]) : null
  }

  async findAll(): Promise<ThresholdProfile[]> {
    const rows = await queryRows<ThresholdProfileRow>('SELECT * FROM threshold_profiles ORDER BY name ASC;')

    return rows.map(mapThresholdProfileRow)
  }

  async delete(id: string): Promise<void> {
    await runStatement('DELETE FROM threshold_profiles WHERE id = ?;', [id])
  }
}
