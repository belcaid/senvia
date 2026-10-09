import { defineStore } from 'pinia'
import { initializeTheme, setThemeMode } from '@/services/theme.service'
import type { ThemeMode } from '@/types/theme.types'

interface ThemeState {
  mode: ThemeMode
  isInitialized: boolean
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    mode: 'dark',
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
        this.mode = 'dark'

        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', 'dark')
          document.documentElement.style.colorScheme = 'dark'
        }

        console.warn('[theme] initialization failed, fallback to dark mode:', error)
      } finally {
        this.isInitialized = true
      }
    },
    async setMode(mode: ThemeMode): Promise<void> {
      await setThemeMode(mode)
      this.mode = 'dark'
      this.isInitialized = true
    },
  },
})
