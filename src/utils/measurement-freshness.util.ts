export const getMeasurementAgeMinutes = (measuredAt: string | null | undefined): number | null => {
  if (!measuredAt) {
    return null
  }

  const date = new Date(measuredAt)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  const ageMs = Date.now() - date.getTime()
  return Math.max(0, Math.floor(ageMs / 60000))
}

export const isMeasurementStale = (
  measuredAt: string | null | undefined,
  staleThresholdMinutes: number,
): boolean => {
  const ageMinutes = getMeasurementAgeMinutes(measuredAt)

  if (ageMinutes === null) {
    return true
  }

  const threshold = Math.max(1, Math.floor(staleThresholdMinutes))
  return ageMinutes > threshold
}
