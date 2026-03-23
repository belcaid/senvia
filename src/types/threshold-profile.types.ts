export interface ThresholdWeights {
  moisture: number
  temperature: number
  light: number
  conductivity: number
}

export interface ThresholdProfile {
  id: string
  name: string
  tempMin: number
  tempMax: number
  moistureMin: number
  moistureMax: number
  lightMin: number
  lightMax: number
  conductivityMin: number
  conductivityMax: number
  weights: ThresholdWeights | null
}
