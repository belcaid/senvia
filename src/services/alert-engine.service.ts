import { AlertRepository, MeasurementRepository, PlantRepository, SensorDeviceRepository } from '@/database'
import { getAppSettingsPreference } from '@/services/preferences.service'
import { ensureDefaultThresholdProfiles } from '@/services/threshold-profiles.service'
import type { Alert, AlertSeverity, AlertType } from '@/types/alert.types'
import { isMeasurementStale } from '@/utils/measurement-freshness.util'
import { evaluatePlantHealth } from '@/utils/plant-health.util'

const plantRepository = new PlantRepository()
const measurementRepository = new MeasurementRepository()
const sensorRepository = new SensorDeviceRepository()
const alertRepository = new AlertRepository()

const BATTERY_WARNING_THRESHOLD = 20
const BATTERY_CRITICAL_THRESHOLD = 10

const ALERT_REPEAT_MINUTES_BY_TYPE: Record<AlertType, number> = {
  humidity_low: 90,
  humidity_high: 90,
  temperature_out_of_range: 90,
  light_low: 120,
  light_high: 120,
  conductivity_low: 120,
  conductivity_high: 120,
  sensor_battery_low: 12 * 60,
  stale_data: 6 * 60,
}

interface AlertCandidate {
  plantId: string
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

const severityRank = (severity: AlertSeverity): number => {
  switch (severity) {
    case 'critical':
      return 3
    case 'warning':
      return 2
    case 'info':
    default:
      return 1
  }
}

const shouldSkipCandidate = (
  previousAlert: Alert | null,
  candidate: AlertCandidate,
  repeatMinutes: number,
): boolean => {
  if (previousAlert === null) {
    return false
  }

  if (
    previousAlert.measurementId !== null &&
    candidate.measurementId !== null &&
    previousAlert.measurementId === candidate.measurementId &&
    previousAlert.message === candidate.message &&
    previousAlert.severity === candidate.severity
  ) {
    return true
  }

  const previousTimestamp = parseTimestamp(previousAlert.createdAt)

  if (previousTimestamp === null) {
    return false
  }

  const elapsedMinutes = (Date.now() - previousTimestamp) / 60000

  if (elapsedMinutes < repeatMinutes) {
    return severityRank(candidate.severity) <= severityRank(previousAlert.severity)
  }

  return false
}

const buildIssueAlert = (
  plantId: string,
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
      type: issue.direction === 'low' ? 'light_low' : 'light_high',
      severity: issue.status === 'critical' ? 'critical' : 'warning',
      title: `Lumiere ${directionText}`,
      message: `Luminosite ${directionText}: ${roundedValue} lx (cible ${roundedMin}-${roundedMax} lx).`,
      measurementId,
    }
  }

  return {
    plantId,
    type: issue.direction === 'low' ? 'conductivity_low' : 'conductivity_high',
    severity: issue.status === 'critical' ? 'critical' : 'warning',
    title: `Fertilite ${directionText}`,
    message: `Conductivite ${directionText}: ${roundedValue} uS/cm (cible ${roundedMin}-${roundedMax} uS/cm).`,
    measurementId,
  }
}

const buildStaleAlert = (
  plantId: string,
  options: { hasMeasurement: boolean; staleThresholdMinutes: number },
): AlertCandidate => {
  if (!options.hasMeasurement) {
    return {
      plantId,
      type: 'stale_data',
      severity: 'warning',
      title: 'Donnees obsoletes',
      message: 'Aucune mesure disponible pour cette plante.',
      measurementId: null,
    }
  }

  return {
    plantId,
    type: 'stale_data',
    severity: 'warning',
    title: 'Donnees obsoletes',
    message: `La derniere mesure depasse le seuil de fraicheur (${options.staleThresholdMinutes} min).`,
    measurementId: null,
  }
}

const buildBatteryAlert = (plantId: string, batteryLevel: number, measurementId: string | null): AlertCandidate => {
  const severity: AlertSeverity = batteryLevel <= BATTERY_CRITICAL_THRESHOLD ? 'critical' : 'warning'
  return {
    plantId,
    type: 'sensor_battery_low',
    severity,
    title: 'Batterie capteur faible',
    message: `Batterie du capteur a ${Math.round(batteryLevel)}%. Pense a remplacer la pile.`,
    measurementId,
  }
}

const createAlertIfNeeded = async (candidate: AlertCandidate): Promise<Alert | null> => {
  const previous = await alertRepository.getLatestByPlantAndType(candidate.plantId, candidate.type)
  const repeatMinutes = ALERT_REPEAT_MINUTES_BY_TYPE[candidate.type] ?? 120

  if (shouldSkipCandidate(previous, candidate, repeatMinutes)) {
    return null
  }

  return alertRepository.create({
    plantId: candidate.plantId,
    type: candidate.type,
    severity: candidate.severity,
    title: candidate.title,
    message: candidate.message,
    isRead: false,
    measurementId: candidate.measurementId,
  })
}

export const runAlertEngineForPlant = async (plantId: string): Promise<Alert[]> => {
  const [settings, profiles, plant, measurement, sensor] = await Promise.all([
    getAppSettingsPreference(),
    ensureDefaultThresholdProfiles(),
    plantRepository.findById(plantId),
    measurementRepository.getLatestByPlantId(plantId),
    sensorRepository.findByPlantId(plantId),
  ])

  if (plant === null) {
    return []
  }

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
      candidates.push(buildIssueAlert(plantId, measurement.id, issue))
    }
  }

  if (stale && (measurement !== null || canAlertMissingMeasurement)) {
    candidates.push(
      buildStaleAlert(plantId, {
        hasMeasurement: measurement !== null,
        staleThresholdMinutes: settings.staleDataThresholdMinutes,
      }),
    )
  }

  const sensorBatteryLevel = sensor?.batteryLevel ?? null

  if (sensorBatteryLevel !== null && sensorBatteryLevel <= BATTERY_WARNING_THRESHOLD) {
    candidates.push(buildBatteryAlert(plantId, sensorBatteryLevel, measurement?.id ?? null))
  }

  const createdAlerts: Alert[] = []

  for (const candidate of candidates) {
    const created = await createAlertIfNeeded(candidate)

    if (created !== null) {
      createdAlerts.push(created)
    }
  }

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
