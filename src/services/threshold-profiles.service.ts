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

    if (existingProfiles.length > 0) {
      return existingProfiles
    }

    for (const profile of DEFAULT_THRESHOLD_PROFILES) {
      await thresholdProfileRepository.create(profile)
    }

    return thresholdProfileRepository.findAll()
  })()

  try {
    return await ensureDefaultsPromise
  } finally {
    ensureDefaultsPromise = null
  }
}
