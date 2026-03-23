import { flaskOutline, flowerOutline, homeOutline, leafOutline, sunnyOutline, waterOutline } from 'ionicons/icons'
import type { PlantCategory } from '@/types/plant.types'

export interface PlantCategoryOption {
  value: PlantCategory
  label: string
}

export interface PlantIconOption {
  value: string
  label: string
  icon: string
}

export const PLANT_CATEGORY_OPTIONS: PlantCategoryOption[] = [
  { value: 'indoor', label: 'Interieur' },
  { value: 'outdoor', label: 'Exterieur' },
  { value: 'balcony', label: 'Balcon' },
  { value: 'garden', label: 'Jardin' },
  { value: 'vegetable_garden', label: 'Potager' },
  { value: 'other', label: 'Autre' },
]

export const PLANT_ICON_OPTIONS: PlantIconOption[] = [
  { value: 'leaf', label: 'Feuille', icon: leafOutline },
  { value: 'flower', label: 'Fleur', icon: flowerOutline },
  { value: 'sunny', label: 'Soleil', icon: sunnyOutline },
  { value: 'water', label: 'Goutte', icon: waterOutline },
  { value: 'home', label: 'Maison', icon: homeOutline },
  { value: 'flask', label: 'Laboratoire', icon: flaskOutline },
]

export const DEFAULT_PLANT_CATEGORY: PlantCategory = 'indoor'
export const DEFAULT_PLANT_ICON = PLANT_ICON_OPTIONS[0].value

export const getCategoryLabel = (category: PlantCategory): string => {
  const found = PLANT_CATEGORY_OPTIONS.find((option) => option.value === category)
  return found?.label ?? 'Autre'
}

export const getPlantIconOption = (iconValue: string): PlantIconOption => {
  const found = PLANT_ICON_OPTIONS.find((option) => option.value === iconValue)
  return found ?? PLANT_ICON_OPTIONS[0]
}

export const getPlantIcon = (iconValue: string): string => getPlantIconOption(iconValue).icon
