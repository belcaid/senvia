import { getThemeModePreference, setThemeModePreference } from '@/services/preferences.service'
import type { ThemeMode } from '@/types/theme.types'

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

const getSystemTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light'
}

const applyThemeToDom = (mode: ThemeMode): void => {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.setAttribute('data-theme', mode)
  root.style.colorScheme = mode
}

export const initializeTheme = async (): Promise<ThemeMode> => {
  const storedTheme = await getThemeModePreference()
  const initialTheme = storedTheme ?? getSystemTheme()

  applyThemeToDom(initialTheme)

  return initialTheme
}

export const setThemeMode = async (mode: ThemeMode): Promise<void> => {
  applyThemeToDom(mode)

  await setThemeModePreference(mode)
}
