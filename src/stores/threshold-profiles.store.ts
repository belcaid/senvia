import { defineStore } from 'pinia'
import { ensureDefaultThresholdProfiles, listThresholdProfiles } from '@/services/threshold-profiles.service'
import { toErrorMessage } from '@/stores/store.utils'
import type { ThresholdProfile } from '@/types/threshold-profile.types'

interface ThresholdProfilesState {
  profils: ThresholdProfile[]
  estChargement: boolean
  erreur: string | null
}

export const useThresholdProfilesStore = defineStore('thresholdProfiles', {
  state: (): ThresholdProfilesState => ({
    profils: [],
    estChargement: false,
    erreur: null,
  }),
  getters: {
    getProfilParId: (state) => (id: string | null): ThresholdProfile | undefined => {
      if (id === null) {
        return undefined
      }

      return state.profils.find((profil) => profil.id === id)
    },
  },
  actions: {
    async chargerProfils(options: { ensureDefaults?: boolean } = {}): Promise<void> {
      this.estChargement = true
      this.erreur = null

      try {
        const ensureDefaults = options.ensureDefaults ?? true
        this.profils = ensureDefaults ? await ensureDefaultThresholdProfiles() : await listThresholdProfiles()
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de charger les profils de seuils')
      } finally {
        this.estChargement = false
      }
    },
  },
})
