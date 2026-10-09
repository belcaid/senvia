import type { Measurement } from '@/types/measurement.types'
import type { PlantStatus } from '@/types/plant.types'
import type { ThresholdProfile, ThresholdWeights } from '@/types/threshold-profile.types'

type MetricKey = 'temperature' | 'moisture' | 'light' | 'conductivity'
type IssueDirection = 'low' | 'high'
type MetricStatus = 'ok' | 'warning' | 'critical'

interface MetricDefinition {
  key: MetricKey
  label: string
  unit: string
}

export interface MeasurementLike {
  measuredAt: string
  temperature: number
  moisture: number
  light: number
  conductivity: number
}

export interface PlantHealthIssue {
  key: MetricKey
  label: string
  unit: string
  status: MetricStatus
  value: number
  min: number
  max: number
  weight: number
  score: number
  deviationRatio: number
  direction: IssueDirection
}

export interface PlantHealthAssessment {
  status: PlantStatus
  score: number
  issues: PlantHealthIssue[]
  dominantIssue: PlantHealthIssue | null
  explanation: string
}

interface EvaluatePlantHealthOptions {
  measurement: MeasurementLike | Measurement | null
  thresholdProfile: ThresholdProfile | null | undefined
  isStale: boolean
  staleThresholdMinutes: number
}

const METRICS: MetricDefinition[] = [
  { key: 'temperature', label: 'Température', unit: '°C' },
  { key: 'moisture', label: 'Humidité', unit: '%' },
  { key: 'light', label: 'Lumière', unit: 'lx' },
  { key: 'conductivity', label: 'Fertilité', unit: 'µS/cm' },
]

const DEFAULT_WEIGHTS: ThresholdWeights = {
  moisture: 0.4,
  temperature: 0.2,
  light: 0.25,
  conductivity: 0.15,
}

const WARNING_DEVIATION_THRESHOLD = 0.2

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

const formatValue = (value: number): string => {
  if (!Number.isFinite(value)) {
    return String(value)
  }

  if (Math.abs(value) >= 100 || Number.isInteger(value)) {
    return String(Math.round(value))
  }

  return value.toFixed(1)
}

const getMetricRange = (profile: ThresholdProfile, key: MetricKey): { min: number; max: number } => {
  switch (key) {
    case 'temperature':
      return { min: profile.tempMin, max: profile.tempMax }
    case 'moisture':
      return { min: profile.moistureMin, max: profile.moistureMax }
    case 'light':
      return { min: profile.lightMin, max: profile.lightMax }
    case 'conductivity':
    default:
      return { min: profile.conductivityMin, max: profile.conductivityMax }
  }
}

const sanitizeWeights = (weights: ThresholdWeights | null): ThresholdWeights => {
  if (!weights) {
    return { ...DEFAULT_WEIGHTS }
  }

  const candidate: ThresholdWeights = {
    moisture: Number.isFinite(weights.moisture) && weights.moisture > 0 ? weights.moisture : 0,
    temperature: Number.isFinite(weights.temperature) && weights.temperature > 0 ? weights.temperature : 0,
    light: Number.isFinite(weights.light) && weights.light > 0 ? weights.light : 0,
    conductivity: Number.isFinite(weights.conductivity) && weights.conductivity > 0 ? weights.conductivity : 0,
  }

  const total = candidate.moisture + candidate.temperature + candidate.light + candidate.conductivity

  if (total <= 0) {
    return { ...DEFAULT_WEIGHTS }
  }

  return {
    moisture: candidate.moisture / total,
    temperature: candidate.temperature / total,
    light: candidate.light / total,
    conductivity: candidate.conductivity / total,
  }
}

const getWeightByKey = (weights: ThresholdWeights, key: MetricKey): number => {
  switch (key) {
    case 'temperature':
      return weights.temperature
    case 'moisture':
      return weights.moisture
    case 'light':
      return weights.light
    case 'conductivity':
    default:
      return weights.conductivity
  }
}

const evaluateMetric = (
  metric: MetricDefinition,
  value: number,
  min: number,
  max: number,
  weight: number,
): PlantHealthIssue => {
  const range = Math.max(max - min, 1)
  const below = value < min
  const above = value > max

  if (!below && !above) {
    return {
      key: metric.key,
      label: metric.label,
      unit: metric.unit,
      status: 'ok',
      value,
      min,
      max,
      weight,
      score: 0,
      deviationRatio: 0,
      direction: 'low',
    }
  }

  const direction: IssueDirection = below ? 'low' : 'high'
  const deviation = below ? min - value : value - max
  const deviationRatio = deviation / range
  const normalizedDeviation = clamp(deviationRatio, 0, 1)
  const status: MetricStatus = deviationRatio <= WARNING_DEVIATION_THRESHOLD ? 'warning' : 'critical'

  const score =
    status === 'warning'
      ? 20 + normalizedDeviation * 40
      : 60 + normalizedDeviation * 40

  return {
    key: metric.key,
    label: metric.label,
    unit: metric.unit,
    status,
    value,
    min,
    max,
    weight,
    score,
    deviationRatio,
    direction,
  }
}

const buildIssueMessage = (issue: PlantHealthIssue): string => {
  const qualifier = issue.direction === 'low' ? 'trop basse' : 'trop elevee'
  return `${issue.label} ${qualifier} (${formatValue(issue.value)} ${issue.unit}, cible ${formatValue(issue.min)}-${formatValue(issue.max)} ${issue.unit})`
}

export const evaluatePlantHealth = (options: EvaluatePlantHealthOptions): PlantHealthAssessment => {
  const staleThreshold = Math.max(1, Math.floor(options.staleThresholdMinutes))
  const measurement = options.measurement

  if (measurement === null) {
    return {
      status: 'unknown',
      score: 0,
      issues: [],
      dominantIssue: null,
      explanation: 'Aucune mesure disponible pour evaluer cette plante.',
    }
  }

  if (options.isStale) {
    return {
      status: 'stale_data',
      score: 100,
      issues: [],
      dominantIssue: null,
      explanation: `Données obsolètes : la dernière mesure dépasse le seuil de fraîcheur (${staleThreshold} min).`,
    }
  }

  if (!options.thresholdProfile) {
    return {
      status: 'unknown',
      score: 0,
      issues: [],
      dominantIssue: null,
      explanation: 'Aucun profil de seuils associe. Impossible de calculer un statut fiable.',
    }
  }

  const weights = sanitizeWeights(options.thresholdProfile.weights)
  const allEvaluations: PlantHealthIssue[] = []

  for (const metric of METRICS) {
    const value = measurement[metric.key]
    const range = getMetricRange(options.thresholdProfile as ThresholdProfile, metric.key)
    const weight = getWeightByKey(weights, metric.key)

    allEvaluations.push(evaluateMetric(metric, value, range.min, range.max, weight))
  }

  const issues = allEvaluations.filter((item) => item.status !== 'ok')
  const weightedScore = allEvaluations.reduce((acc, item) => acc + item.score * item.weight, 0)
  const globalScore = Math.round(clamp(weightedScore, 0, 100))
  const dominantIssue =
    issues.length > 0
      ? [...issues].sort((a, b) => b.score * b.weight - (a.score * a.weight))[0]
      : null

  const criticalCount = issues.filter((issue) => issue.status === 'critical').length
  const warningCount = issues.filter((issue) => issue.status === 'warning').length

  const status: PlantStatus =
    issues.length === 0
      ? 'healthy'
      : criticalCount >= 1 || globalScore >= 65
        ? 'critical'
        : globalScore >= 30 || warningCount >= 1
          ? 'warning'
          : 'healthy'

  if (issues.length === 0) {
    return {
      status,
      score: globalScore,
      issues,
      dominantIssue,
      explanation: `En sante: toutes les mesures sont dans les plages du profil "${options.thresholdProfile.name}" (score ${globalScore}/100).`,
    }
  }

  if (issues.length === 1 && dominantIssue !== null) {
    return {
      status,
      score: globalScore,
      issues,
      dominantIssue,
      explanation: `${buildIssueMessage(dominantIssue)}. Statut ${status === 'critical' ? 'critique' : 'a surveiller'} (score ${globalScore}/100).`,
    }
  }

  return {
    status,
    score: globalScore,
    issues,
    dominantIssue,
    explanation: `${issues.length} mesures hors seuil (${criticalCount} critique(s), ${warningCount} avertissement(s)). Cause dominante: ${dominantIssue ? buildIssueMessage(dominantIssue) : 'indeterminee'}. Score global ${globalScore}/100.`,
  }
}
