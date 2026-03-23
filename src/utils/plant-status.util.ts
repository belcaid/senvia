import type { PlantStatus } from '@/types/plant.types'

export const getPlantStatusLabel = (status: PlantStatus): string => {
  switch (status) {
    case 'healthy':
      return 'Saine'
    case 'warning':
      return 'Surveillance'
    case 'critical':
      return 'Critique'
    case 'stale_data':
      return 'Donnees anciennes'
    case 'unknown':
    default:
      return 'Inconnu'
  }
}

export const getPlantStatusColor = (status: PlantStatus): 'success' | 'warning' | 'danger' | 'medium' => {
  switch (status) {
    case 'healthy':
      return 'success'
    case 'warning':
      return 'warning'
    case 'critical':
      return 'danger'
    case 'stale_data':
      return 'warning'
    case 'unknown':
    default:
      return 'medium'
  }
}
