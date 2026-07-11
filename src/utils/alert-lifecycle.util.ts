import type { AlertSeverity } from '@/types/alert.types'

export type AlertReconciliationDecision = 'create' | 'refresh' | 'escalate' | 'replace'

interface ExistingAlertState {
  sensorId: string | null
  severity: AlertSeverity
}

interface CandidateAlertState {
  sensorId: string
  severity: AlertSeverity
}

const severityRank = (severity: AlertSeverity): number => {
  if (severity === 'critical') {
    return 3
  }

  if (severity === 'warning') {
    return 2
  }

  return 1
}

export const getAlertReconciliationDecision = (
  existing: ExistingAlertState | null,
  candidate: CandidateAlertState,
): AlertReconciliationDecision => {
  if (existing === null) {
    return 'create'
  }

  if (existing.sensorId !== null && existing.sensorId !== candidate.sensorId) {
    return 'replace'
  }

  if (severityRank(candidate.severity) > severityRank(existing.severity)) {
    return 'escalate'
  }

  return 'refresh'
}
