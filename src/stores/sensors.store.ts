import { defineStore } from 'pinia'
import {
  SensorDeviceRepository,
  type CreateSensorDeviceInput,
  type UpdateSensorDeviceInput,
} from '@/database'
import type { SensorDevice } from '@/types/sensor-device.types'
import { toErrorMessage } from '@/stores/store.utils'

interface SensorsState {
  capteurs: SensorDevice[]
  estChargement: boolean
  erreur: string | null
}

const sensorRepository = new SensorDeviceRepository()

export const useSensorsStore = defineStore('sensors', {
  state: (): SensorsState => ({
    capteurs: [],
    estChargement: false,
    erreur: null,
  }),
  getters: {
    getCapteurParId: (state) => (id: string): SensorDevice | undefined =>
      state.capteurs.find((capteur) => capteur.id === id),
    getCapteurParPlanteId: (state) => (plantId: string): SensorDevice | undefined =>
      state.capteurs.find((capteur) => capteur.plantId === plantId),
  },
  actions: {
    async chargerCapteurs(): Promise<void> {
      this.estChargement = true
      this.erreur = null

      try {
        this.capteurs = await sensorRepository.findAll()
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de charger les capteurs')
      } finally {
        this.estChargement = false
      }
    },
    async ajouterCapteur(input: CreateSensorDeviceInput): Promise<SensorDevice | null> {
      this.erreur = null

      try {
        const capteur = await sensorRepository.create(input)
        this.capteurs = [capteur, ...this.capteurs.filter((item) => item.id !== capteur.id)]
        return capteur
      } catch (error) {
        this.erreur = toErrorMessage(error, "Impossible d'ajouter le capteur")
        return null
      }
    },
    async modifierCapteur(id: string, updates: UpdateSensorDeviceInput): Promise<SensorDevice | null> {
      this.erreur = null

      try {
        const capteur = await sensorRepository.update(id, updates)

        if (capteur !== null) {
          this.capteurs = this.capteurs.map((item) => (item.id === id ? capteur : item))
        }

        return capteur
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de modifier le capteur')
        return null
      }
    },
    async supprimerCapteur(id: string): Promise<void> {
      this.erreur = null

      try {
        await sensorRepository.delete(id)
        this.capteurs = this.capteurs.filter((item) => item.id !== id)
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de supprimer le capteur')
      }
    },
  },
})
