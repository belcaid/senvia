import { MeasurementRepository, PlantRepository } from '@/database'
import { getAppSettingsPreference } from '@/services/preferences.service'
import { ensureDefaultThresholdProfiles } from '@/services/threshold-profiles.service'
import { isMeasurementStale } from '@/utils/measurement-freshness.util'
import { evaluatePlantHealth } from '@/utils/plant-health.util'

const plantRepository = new PlantRepository()
const measurementRepository = new MeasurementRepository()

export const syncAllPlantStatusesAtStartup = async (): Promise<void> => {
  const [settings, profiles, plants] = await Promise.all([
    getAppSettingsPreference(),
    ensureDefaultThresholdProfiles(),
    plantRepository.findAll(),
  ])

  if (plants.length === 0) {
    return
  }

  const staleThresholdMinutes = settings.staleDataThresholdMinutes
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))

  const latestMeasurements = await Promise.all(
    plants.map(async (plant) => ({
      plantId: plant.id,
      measurement: await measurementRepository.getLatestByPlantId(plant.id),
    })),
  )

  const measurementByPlantId = new Map(latestMeasurements.map((item) => [item.plantId, item.measurement]))

  const updates = plants.flatMap((plant) => {
    const measurement = measurementByPlantId.get(plant.id) ?? null
    const thresholdProfile = plant.thresholdProfileId ? profileById.get(plant.thresholdProfileId) ?? null : null

    const assessment = evaluatePlantHealth({
      measurement,
      thresholdProfile,
      isStale: isMeasurementStale(measurement?.measuredAt, staleThresholdMinutes),
      staleThresholdMinutes,
    })

    if (assessment.status === plant.status) {
      return []
    }

    return [{ plantId: plant.id, status: assessment.status }]
  })

  if (updates.length === 0) {
    return
  }

  await Promise.all(updates.map(async (update) => plantRepository.updateStatus(update.plantId, update.status)))
}
