import { computed } from 'vue'
import { useThemeStore } from '@/stores/theme.store'
import type { ThemeMode } from '@/types/theme.types'

export const useTheme = () => {
  const themeStore = useThemeStore()

  const isDarkMode = computed(() => themeStore.mode === 'dark')

  const setTheme = async (mode: ThemeMode): Promise<void> => {
    await themeStore.setMode(mode)
  }

  const toggleTheme = async (): Promise<void> => {
    await themeStore.setMode(themeStore.mode === 'dark' ? 'light' : 'dark')
  }

  return {
    mode: computed(() => themeStore.mode),
    isDarkMode,
    initTheme: () => themeStore.init(),
    setTheme,
    toggleTheme,
  }
}
