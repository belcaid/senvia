import { defineStore } from 'pinia'
import { MeasurementRepository, type CreateMeasurementInput } from '@/database'
import type { Measurement } from '@/types/measurement.types'
import { toErrorMessage } from '@/stores/store.utils'

interface MeasurementsState {
  mesuresParPlante: Record<string, Measurement[]>
  derniereMesureParPlante: Record<string, Measurement | null>
  estChargement: boolean
  erreur: string | null
}

const measurementRepository = new MeasurementRepository()

export const useMeasurementsStore = defineStore('measurements', {
  state: (): MeasurementsState => ({
    mesuresParPlante: {},
    derniereMesureParPlante: {},
    estChargement: false,
    erreur: null,
  }),
  actions: {
    async chargerMesuresParPlante(plantId: string, limit = 200): Promise<void> {
      this.estChargement = true
      this.erreur = null

      try {
        const mesures = await measurementRepository.listByPlantId(plantId, limit)
        this.mesuresParPlante[plantId] = mesures
        this.derniereMesureParPlante[plantId] = mesures.length > 0 ? mesures[0] : null
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de charger les mesures')
      } finally {
        this.estChargement = false
      }
    },
    async chargerDerniereMesure(plantId: string): Promise<void> {
      this.erreur = null

      try {
        const mesure = await measurementRepository.getLatestByPlantId(plantId)
        this.derniereMesureParPlante[plantId] = mesure
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de charger la derniere mesure')
      }
    },
    async ajouterMesure(input: CreateMeasurementInput): Promise<Measurement | null> {
      this.erreur = null

      try {
        const mesure = await measurementRepository.create(input)
        const existantes = this.mesuresParPlante[mesure.plantId] ?? []
        this.mesuresParPlante[mesure.plantId] = [mesure, ...existantes]
        this.derniereMesureParPlante[mesure.plantId] = mesure
        return mesure
      } catch (error) {
        this.erreur = toErrorMessage(error, "Impossible d'ajouter la mesure")
        return null
      }
    },
    viderMesuresPlante(plantId: string): void {
      delete this.mesuresParPlante[plantId]
      delete this.derniereMesureParPlante[plantId]
    },
  },
})
