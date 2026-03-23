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

      this.mode = await initializeTheme()
      this.isInitialized = true
    },
    async setMode(mode: ThemeMode): Promise<void> {
      await setThemeMode(mode)
      this.mode = mode
      this.isInitialized = true
    },
  },
})
