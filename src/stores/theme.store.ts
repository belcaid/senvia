import { defineStore } from 'pinia'
import { initializeTheme, setThemeMode } from '@/services/theme.service'
import type { ThemeMode } from '@/types/theme.types'

interface ThemeState {
  mode: ThemeMode
  isInitialized: boolean
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    mode: 'light',
    isInitialized: false,
  }),
  actions: {
    async init(): Promise<void> {
      if (this.isInitialized) {
        return
      }

      try {
        this.mode = await initializeTheme()
      } catch (error) {
        this.mode = 'light'

        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', 'light')
          document.documentElement.style.colorScheme = 'light'
        }

        console.warn('[theme] initialization failed, fallback to light mode:', error)
      } finally {
        this.isInitialized = true
      }
    },
    async setMode(mode: ThemeMode): Promise<void> {
      await setThemeMode(mode)
      this.mode = mode
      this.isInitialized = true
    },
  },
})
