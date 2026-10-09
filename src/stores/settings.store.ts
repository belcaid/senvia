import { defineStore } from 'pinia'
import { updateAppSettingsPreference, DEFAULT_APP_SETTINGS, getAppSettingsPreference } from '@/services/preferences.service'
import { syncNotificationPreferences } from '@/services/notifications.service'
import { toErrorMessage } from '@/stores/store.utils'
import type { AppSettings } from '@/types/app-settings.types'

interface SettingsState {
  parametres: AppSettings
  estChargement: boolean
  estSauvegarde: boolean
  erreur: string | null
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    parametres: { ...DEFAULT_APP_SETTINGS },
    estChargement: false,
    estSauvegarde: false,
    erreur: null,
  }),
  actions: {
    async chargerParametres(): Promise<void> {
      this.estChargement = true
      this.erreur = null

      try {
        const parametres = await getAppSettingsPreference()
        this.parametres = parametres
        await syncNotificationPreferences(parametres, { requestPermission: false })
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de charger les parametres')
      } finally {
        this.estChargement = false
      }
    },
    async sauvegarderParametres(patch: Partial<AppSettings>): Promise<AppSettings | null> {
      this.estSauvegarde = true
      this.erreur = null

      try {
        let parametres = await updateAppSettingsPreference(patch)
        const isNotificationSyncOk = await syncNotificationPreferences(parametres, {
          requestPermission: patch.notificationsEnabled === true,
        })

        if (patch.notificationsEnabled === true && !isNotificationSyncOk) {
          parametres = await updateAppSettingsPreference({ notificationsEnabled: false })
          this.erreur =
            "Permission notifications refusee. Active-la dans les reglages Android puis reactive l'option."
        }

        this.parametres = parametres

        return parametres
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de sauvegarder les parametres')
        return null
      } finally {
        this.estSauvegarde = false
      }
    },
  },
})
