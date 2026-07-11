import { AlertRepository } from '@/database'

const DEFAULT_ALERT_RETENTION_DAYS = 90
const alertRepository = new AlertRepository()

export const pruneAlertHistory = async (
  retentionDays = DEFAULT_ALERT_RETENTION_DAYS,
): Promise<void> => {
  const normalizedDays = Math.max(1, Math.round(retentionDays))
  const cutoff = new Date(Date.now() - normalizedDays * 24 * 60 * 60 * 1000)

  await alertRepository.pruneResolvedReadOlderThan(cutoff.toISOString())
}
