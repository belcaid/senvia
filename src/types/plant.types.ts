export type PlantCategory = 'indoor' | 'outdoor' | 'balcony' | 'garden' | 'vegetable_garden' | 'other'

export type PlantStatus = 'healthy' | 'warning' | 'critical' | 'stale_data' | 'unknown'

export interface Plant {
  id: string
  name: string
  category: PlantCategory
  location: string
  icon: string
  isFavorite: boolean
  sensorId: string | null
  thresholdProfileId: string | null
  status: PlantStatus
  createdAt: string
  updatedAt: string
}
