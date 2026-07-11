import { defineStore } from 'pinia'
import { AlertRepository } from '@/database'
import type { Alert } from '@/types/alert.types'
import { toErrorMessage } from '@/stores/store.utils'

interface AlertsState {
  alertes: Alert[]
  estChargement: boolean
  erreur: string | null
}

const alertRepository = new AlertRepository()

export const useAlertsStore = defineStore('alerts', {
  state: (): AlertsState => ({
    alertes: [],
    estChargement: false,
    erreur: null,
  }),
  getters: {
    alertesNonLues(state): Alert[] {
      return state.alertes.filter((alerte) => !alerte.isRead)
    },
    nombreAlertesNonLues(state): number {
      return state.alertes.filter((alerte) => !alerte.isRead).length
    },
  },
  actions: {
    async chargerAlertes(limit = 200): Promise<void> {
      this.estChargement = true
      this.erreur = null

      try {
        this.alertes = await alertRepository.listAll(limit)
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de charger les alertes')
      } finally {
        this.estChargement = false
      }
    },
    async marquerAlerteLue(id: string, estLue: boolean): Promise<Alert | null> {
      this.erreur = null

      try {
        const alerte = await alertRepository.markAsRead(id, estLue)

        if (alerte !== null) {
          this.alertes = this.alertes.map((item) => (item.id === id ? alerte : item))
        }

        return alerte
      } catch (error) {
        this.erreur = toErrorMessage(error, "Impossible de modifier l'etat de l'alerte")
        return null
      }
    },
    async marquerToutesLues(): Promise<boolean> {
      this.erreur = null

      try {
        await alertRepository.markAllAsRead()
        this.alertes = this.alertes.map((alerte) => ({ ...alerte, isRead: true }))
        return true
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de marquer toutes les alertes comme lues')
        return false
      }
    },
    async supprimerHistoriqueLu(): Promise<boolean> {
      this.erreur = null

      try {
        await alertRepository.deleteResolvedRead()
        this.alertes = this.alertes.filter((alerte) => alerte.resolvedAt === null || !alerte.isRead)
        return true
      } catch (error) {
        this.erreur = toErrorMessage(error, "Impossible d'effacer l'historique des alertes")
        return false
      }
    },
    async supprimerAlerte(id: string): Promise<boolean> {
      this.erreur = null

      try {
        await alertRepository.delete(id)
        this.alertes = this.alertes.filter((alerte) => alerte.id !== id)
        return true
      } catch (error) {
        this.erreur = toErrorMessage(error, "Impossible de supprimer l'alerte")
        return false
      }
    },
  },
})
