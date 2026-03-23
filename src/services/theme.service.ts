import { Preferences } from '@capacitor/preferences'
import { THEME_PREFERENCE_KEY, type ThemeMode } from '@/types/theme.types'

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

const isThemeMode = (value: string | null): value is ThemeMode => value === 'light' || value === 'dark'

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
  const { value } = await Preferences.get({ key: THEME_PREFERENCE_KEY })
  const initialTheme = isThemeMode(value) ? value : getSystemTheme()

  applyThemeToDom(initialTheme)

  return initialTheme
}

export const setThemeMode = async (mode: ThemeMode): Promise<void> => {
  applyThemeToDom(mode)

  await Preferences.set({
    key: THEME_PREFERENCE_KEY,
    value: mode,
  })
}
