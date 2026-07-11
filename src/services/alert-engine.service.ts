import { AlertRepository, MeasurementRepository, PlantRepository, SensorDeviceRepository } from '@/database'
import { getAppSettingsPreference } from '@/services/preferences.service'
import { ensureDefaultThresholdProfiles } from '@/services/threshold-profiles.service'
import type { Alert, AlertSeverity, AlertType } from '@/types/alert.types'
import { getAlertReconciliationDecision } from '@/utils/alert-lifecycle.util'
import { isMeasurementStale } from '@/utils/measurement-freshness.util'
import { evaluatePlantHealth } from '@/utils/plant-health.util'

const plantRepository = new PlantRepository()
const measurementRepository = new MeasurementRepository()
const sensorRepository = new SensorDeviceRepository()
const alertRepository = new AlertRepository()

const BATTERY_WARNING_THRESHOLD = 20
const BATTERY_CRITICAL_THRESHOLD = 10

interface AlertCandidate {
  plantId: string
  sensorId: string
  type: AlertType
  severity: AlertSeverity
  title: string
  message: string
  measurementId: string | null
}

const parseTimestamp = (value: string): number | null => {
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

const buildIssueAlert = (
  plantId: string,
  sensorId: string,
  measurementId: string,
  issue: ReturnType<typeof evaluatePlantHealth>['issues'][number],
): AlertCandidate => {
  const roundedValue = Math.round(issue.value)
  const roundedMin = Math.round(issue.min)
  const roundedMax = Math.round(issue.max)
  const directionText = issue.direction === 'low' ? 'basse' : 'elevee'

  if (issue.key === 'moisture') {
    return {
      plantId,
      sensorId,
      type: issue.direction === 'low' ? 'humidity_low' : 'humidity_high',
      severity: issue.status === 'critical' ? 'critical' : 'warning',
      title: `Humidite ${directionText}`,
      message: `Humidite du sol ${directionText}: ${roundedValue}% (cible ${roundedMin}-${roundedMax}%).`,
      measurementId,
    }
  }

  if (issue.key === 'temperature') {
    return {
      plantId,
      sensorId,
      type: 'temperature_out_of_range',
      severity: issue.status === 'critical' ? 'critical' : 'warning',
      title: 'Temperature hors plage',
      message: `Temperature ${directionText}: ${issue.value.toFixed(1)} C (cible ${issue.min.toFixed(1)}-${issue.max.toFixed(1)} C).`,
      measurementId,
    }
  }

  if (issue.key === 'light') {
    return {
      plantId,
      sensorId,
      type: issue.direction === 'low' ? 'light_low' : 'light_high',
      severity: issue.status === 'critical' ? 'critical' : 'warning',
      title: `Lumiere ${directionText}`,
      message: `Luminosite ${directionText}: ${roundedValue} lx (cible ${roundedMin}-${roundedMax} lx).`,
      measurementId,
    }
  }

  return {
    plantId,
    sensorId,
    type: issue.direction === 'low' ? 'conductivity_low' : 'conductivity_high',
    severity: issue.status === 'critical' ? 'critical' : 'warning',
    title: `Fertilite ${directionText}`,
    message: `Conductivite ${directionText}: ${roundedValue} uS/cm (cible ${roundedMin}-${roundedMax} uS/cm).`,
    measurementId,
  }
}

const buildStaleAlert = (
  plantId: string,
  sensorId: string,
  options: { hasMeasurement: boolean; staleThresholdMinutes: number },
): AlertCandidate => {
  if (!options.hasMeasurement) {
    return {
      plantId,
      sensorId,
      type: 'stale_data',
      severity: 'warning',
      title: 'Donnees obsoletes',
      message: 'Aucune mesure disponible pour cette plante.',
      measurementId: null,
    }
  }

  return {
    plantId,
    sensorId,
    type: 'stale_data',
    severity: 'warning',
    title: 'Donnees obsoletes',
    message: `La derniere mesure depasse le seuil de fraicheur (${options.staleThresholdMinutes} min).`,
    measurementId: null,
  }
}

const buildBatteryAlert = (
  plantId: string,
  sensorId: string,
  batteryLevel: number,
  measurementId: string | null,
): AlertCandidate => {
  const severity: AlertSeverity = batteryLevel <= BATTERY_CRITICAL_THRESHOLD ? 'critical' : 'warning'
  return {
    plantId,
    sensorId,
    type: 'sensor_battery_low',
    severity,
    title: 'Batterie capteur faible',
    message: `Batterie du capteur a ${Math.round(batteryLevel)}%. Pense a remplacer la pile.`,
    measurementId,
  }
}

const createAlertIfNeeded = async (candidate: AlertCandidate): Promise<Alert | null> => {
  const previous = await alertRepository.getOpenByPlantAndType(candidate.plantId, candidate.type)
  const decision = getAlertReconciliationDecision(previous, candidate)

  if (previous !== null && decision === 'replace') {
    await alertRepository.resolve(previous.id)
  } else if (previous !== null) {
    const isEscalation = decision === 'escalate'
    const updated = await alertRepository.updateOpenAlert(previous.id, {
      sensorId: candidate.sensorId,
      severity: candidate.severity,
      title: candidate.title,
      message: candidate.message,
      measurementId: candidate.measurementId,
      markUnread: isEscalation,
    })

    return isEscalation ? updated : null
  }

  return alertRepository.create({
    plantId: candidate.plantId,
    sensorId: candidate.sensorId,
    type: candidate.type,
    severity: candidate.severity,
    title: candidate.title,
    message: candidate.message,
    isRead: false,
    measurementId: candidate.measurementId,
  })
}

export const runAlertEngineForPlant = async (plantId: string): Promise<Alert[]> => {
  const [settings, profiles, plant, sensor] = await Promise.all([
    getAppSettingsPreference(),
    ensureDefaultThresholdProfiles(),
    plantRepository.findById(plantId),
    sensorRepository.findByPlantId(plantId),
  ])

  if (plant === null) {
    return []
  }

  if (sensor === null) {
    await alertRepository.resolveOpenByPlantExceptTypes(plantId, [])
    return []
  }

  const measurement = await measurementRepository.getLatestBySensorId(sensor.id)
  const profile = plant.thresholdProfileId ? profiles.find((item) => item.id === plant.thresholdProfileId) : undefined
  const stale = isMeasurementStale(measurement?.measuredAt, settings.staleDataThresholdMinutes)
  const plantCreatedAtTimestamp = parseTimestamp(plant.createdAt)
  const plantAgeMinutes =
    plantCreatedAtTimestamp === null ? Number.MAX_SAFE_INTEGER : (Date.now() - plantCreatedAtTimestamp) / 60000
  const canAlertMissingMeasurement = plantAgeMinutes >= settings.staleDataThresholdMinutes

  const health = evaluatePlantHealth({
    measurement,
    thresholdProfile: profile,
    isStale: stale,
    staleThresholdMinutes: settings.staleDataThresholdMinutes,
  })

  const candidates: AlertCandidate[] = []

  if (measurement && health.issues.length > 0) {
    for (const issue of health.issues) {
      candidates.push(buildIssueAlert(plantId, sensor.id, measurement.id, issue))
    }
  }

  if (stale && (measurement !== null || canAlertMissingMeasurement)) {
    candidates.push(
      buildStaleAlert(plantId, sensor.id, {
        hasMeasurement: measurement !== null,
        staleThresholdMinutes: settings.staleDataThresholdMinutes,
      }),
    )
  }

  const sensorBatteryLevel = sensor?.batteryLevel ?? null

  if (sensorBatteryLevel !== null && sensorBatteryLevel <= BATTERY_WARNING_THRESHOLD) {
    candidates.push(buildBatteryAlert(plantId, sensor.id, sensorBatteryLevel, measurement?.id ?? null))
  }

  const createdAlerts: Alert[] = []

  for (const candidate of candidates) {
    const created = await createAlertIfNeeded(candidate)

    if (created !== null) {
      createdAlerts.push(created)
    }
  }

  await alertRepository.resolveOpenByPlantExceptTypes(
    plantId,
    candidates.map((candidate) => candidate.type),
  )

  return createdAlerts
}

export const runAlertEngineForAllPlants = async (): Promise<Alert[]> => {
  const plants = await plantRepository.findAll()

  if (plants.length === 0) {
    return []
  }

  const createdAlerts: Alert[] = []

  for (const plant of plants) {
    const createdForPlant = await runAlertEngineForPlant(plant.id)
    createdAlerts.push(...createdForPlant)
  }

  return createdAlerts
}
