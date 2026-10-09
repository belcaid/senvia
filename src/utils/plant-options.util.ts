import { earthOutline, flowerOutline, leafOutline, nutritionOutline, roseOutline, sunnyOutline } from 'ionicons/icons'
import type { PlantCategory } from '@/types/plant.types'

export interface PlantCategoryOption {
  value: PlantCategory
  label: string
}

export interface PlantIconOption {
  value: string
  label: string
  icon: string
  tone: string
}

export const PLANT_CATEGORY_OPTIONS: PlantCategoryOption[] = [
  { value: 'indoor', label: 'Intérieur' },
  { value: 'outdoor', label: 'Extérieur' },
  { value: 'balcony', label: 'Balcon' },
  { value: 'garden', label: 'Jardin' },
  { value: 'vegetable_garden', label: 'Potager' },
  { value: 'other', label: 'Autre' },
]

export const PLANT_ICON_OPTIONS: PlantIconOption[] = [
  { value: 'leaf', label: 'Feuillage', icon: leafOutline, tone: '#52ef78' },
  { value: 'flower', label: 'Fleur délicate', icon: flowerOutline, tone: '#e491ff' },
  { value: 'rose', label: 'Plante fleurie', icon: roseOutline, tone: '#ff7597' },
  { value: 'nutrition', label: 'Plante comestible', icon: nutritionOutline, tone: '#89df58' },
  { value: 'sunny', label: 'Plante solaire', icon: sunnyOutline, tone: '#ffc857' },
  { value: 'earth', label: 'Plante de jardin', icon: earthOutline, tone: '#79c9a1' },
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
