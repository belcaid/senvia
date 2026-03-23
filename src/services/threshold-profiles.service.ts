import {
  ThresholdProfileRepository,
  type CreateThresholdProfileInput,
} from '@/database/repositories/threshold-profile.repository'
import type { ThresholdProfile } from '@/types/threshold-profile.types'

const thresholdProfileRepository = new ThresholdProfileRepository()

const DEFAULT_THRESHOLD_PROFILES: CreateThresholdProfileInput[] = [
  {
    id: 'profile-indoor-standard',
    name: 'Interieur standard',
    tempMin: 18,
    tempMax: 27,
    moistureMin: 25,
    moistureMax: 60,
    lightMin: 120,
    lightMax: 1500,
    conductivityMin: 300,
    conductivityMax: 1800,
    weights: {
      moisture: 0.4,
      temperature: 0.2,
      light: 0.25,
      conductivity: 0.15,
    },
  },
  {
    id: 'profile-cactus-succulent',
    name: 'Cactus / Succulente',
    tempMin: 16,
    tempMax: 32,
    moistureMin: 10,
    moistureMax: 35,
    lightMin: 400,
    lightMax: 4000,
    conductivityMin: 150,
    conductivityMax: 1200,
    weights: {
      moisture: 0.45,
      temperature: 0.2,
      light: 0.25,
      conductivity: 0.1,
    },
  },
  {
    id: 'profile-foliage-humid',
    name: 'Feuillage humide',
    tempMin: 19,
    tempMax: 29,
    moistureMin: 40,
    moistureMax: 75,
    lightMin: 180,
    lightMax: 2200,
    conductivityMin: 500,
    conductivityMax: 2200,
    weights: {
      moisture: 0.5,
      temperature: 0.2,
      light: 0.2,
      conductivity: 0.1,
    },
  },
]

let ensureDefaultsPromise: Promise<ThresholdProfile[]> | null = null

export const listThresholdProfiles = async (): Promise<ThresholdProfile[]> => {
  return thresholdProfileRepository.findAll()
}

export const ensureDefaultThresholdProfiles = async (): Promise<ThresholdProfile[]> => {
  if (ensureDefaultsPromise !== null) {
    return ensureDefaultsPromise
  }

  ensureDefaultsPromise = (async () => {
    const existingProfiles = await thresholdProfileRepository.findAll()
    const existingById = new Map(existingProfiles.map((profile) => [profile.id, profile]))

    for (const profile of DEFAULT_THRESHOLD_PROFILES) {
      const existing = existingById.get(profile.id ?? '')

      if (!existing) {
        await thresholdProfileRepository.create(profile)
        continue
      }

      await thresholdProfileRepository.update(existing.id, {
        name: profile.name,
        tempMin: profile.tempMin,
        tempMax: profile.tempMax,
        moistureMin: profile.moistureMin,
        moistureMax: profile.moistureMax,
        lightMin: profile.lightMin,
        lightMax: profile.lightMax,
        conductivityMin: profile.conductivityMin,
        conductivityMax: profile.conductivityMax,
        weights: profile.weights ?? null,
      })
    }

    return thresholdProfileRepository.findAll()
  })()

  try {
    return await ensureDefaultsPromise
  } finally {
    ensureDefaultsPromise = null
  }
}
