import { defineStore } from 'pinia'
import { MeasurementRepository, type CreateMeasurementInput } from '@/database'
import type { HistoryRange } from '@/types/app-settings.types'
import type { Measurement } from '@/types/measurement.types'
import { toErrorMessage } from '@/stores/store.utils'

interface MeasurementsState {
  mesuresParPlante: Record<string, Measurement[]>
  derniereMesureParPlante: Record<string, Measurement | null>
  estChargement: boolean
  erreur: string | null
}

const measurementRepository = new MeasurementRepository()

const toRangeStartIso = (range: HistoryRange): string | null => {
  const now = Date.now()

  switch (range) {
    case '24h':
      return new Date(now - 24 * 60 * 60 * 1000).toISOString()
    case '7d':
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d':
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
    case 'all':
    default:
      return null
  }
}

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
    async chargerHistoriqueParPeriode(
      plantId: string,
      range: HistoryRange,
      options: { limit?: number } = {},
    ): Promise<Measurement[]> {
      this.estChargement = true
      this.erreur = null

      try {
        const limit = options.limit ?? 600
        const sinceIso = toRangeStartIso(range)
        const mesures = await measurementRepository.listByPlantIdSince(plantId, sinceIso, limit)
        this.mesuresParPlante[plantId] = mesures
        this.derniereMesureParPlante[plantId] = mesures.length > 0 ? mesures[0] : null
        return mesures
      } catch (error) {
        this.erreur = toErrorMessage(error, "Impossible de charger l'historique des mesures")
        return []
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
    async chargerDernieresMesures(plantIds: string[]): Promise<void> {
      this.erreur = null

      try {
        const idsUniques = [...new Set(plantIds.filter((id) => id.trim() !== ''))]

        await Promise.all(
          idsUniques.map(async (plantId) => {
            const mesure = await measurementRepository.getLatestByPlantId(plantId)
            this.derniereMesureParPlante[plantId] = mesure
          }),
        )
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de charger les dernieres mesures')
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
