import { defineStore } from 'pinia'
import { updateAppSettingsPreference, DEFAULT_APP_SETTINGS, getAppSettingsPreference } from '@/services/preferences.service'
import { toErrorMessage } from '@/stores/store.utils'
import { useThemeStore } from '@/stores/theme.store'
import type { AppSettings } from '@/types/app-settings.types'

interface SettingsState {
  parametres: AppSettings
  estChargement: boolean
  estSauvegarde: boolean
  erreur: string | null
}

const applyThemeToDom = (mode: AppSettings['themeMode']): void => {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.setAttribute('data-theme', mode)
  root.style.colorScheme = mode
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
        applyThemeToDom(parametres.themeMode)

        const themeStore = useThemeStore()
        themeStore.$patch({
          mode: parametres.themeMode,
          isInitialized: true,
        })
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
        const parametres = await updateAppSettingsPreference(patch)
        this.parametres = parametres
        applyThemeToDom(parametres.themeMode)

        const themeStore = useThemeStore()
        themeStore.$patch({
          mode: parametres.themeMode,
          isInitialized: true,
        })

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
