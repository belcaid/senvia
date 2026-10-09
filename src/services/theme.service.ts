import { setThemeModePreference } from '@/services/preferences.service'
import type { ThemeMode } from '@/types/theme.types'

const applyThemeToDom = (mode: ThemeMode): void => {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.setAttribute('data-theme', mode)
  root.style.colorScheme = mode
}

export const initializeTheme = async (): Promise<ThemeMode> => {
  const initialTheme: ThemeMode = 'dark'

  applyThemeToDom(initialTheme)
  await setThemeModePreference(initialTheme)

  return initialTheme
}

export const setThemeMode = async (mode: ThemeMode): Promise<void> => {
  void mode
  const supportedMode: ThemeMode = 'dark'
  applyThemeToDom(supportedMode)

  await setThemeModePreference(supportedMode)
}
