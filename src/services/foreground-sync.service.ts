import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import type { Pinia } from 'pinia'
import { useBleStore } from '@/stores/ble.store'
import { useSensorsStore } from '@/stores/sensors.store'
import { useSettingsStore } from '@/stores/settings.store'

let isRegistered = false
let syncInProgress = false

const syncAssociatedPlants = async (pinia: Pinia): Promise<void> => {
  if (syncInProgress) {
    return
  }

  syncInProgress = true

  try {
    const settingsStore = useSettingsStore(pinia)
    const sensorsStore = useSensorsStore(pinia)
    const bleStore = useBleStore(pinia)

    await settingsStore.chargerParametres()

    if (!settingsStore.parametres.autoSyncOnForeground) {
      return
    }

    await sensorsStore.chargerCapteurs()
    const plantIds = [
      ...new Set(
        sensorsStore.capteurs
          .map((sensor) => sensor.plantId)
          .filter((plantId): plantId is string => plantId !== null),
      ),
    ]

    for (const plantId of plantIds) {
      await bleStore.synchroniserPlanteAssociee(plantId, 'foreground_refresh')
    }
  } catch (error) {
    console.warn('[foreground-sync] synchronization failed:', error)
  } finally {
    syncInProgress = false
  }
}

export const registerForegroundSync = async (pinia: Pinia): Promise<void> => {
  if (isRegistered || Capacitor.getPlatform() === 'web') {
    return
  }

  await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      void syncAssociatedPlants(pinia)
    }
  })
  isRegistered = true
}
