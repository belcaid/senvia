import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initializeDatabase } from '@/database'
import { pruneAlertHistory } from '@/services/alert-maintenance.service'
import { runAlertEngineForAllPlants } from '@/services/alert-engine.service'
import { ensureDemoData } from '@/services/demo-data.service'
import { registerForegroundSync } from '@/services/foreground-sync.service'
import {
  notifyForAlerts,
  registerNotificationDeepLinks,
  syncNotificationPreferences,
} from '@/services/notifications.service'
import { syncAllPlantStatusesAtStartup } from '@/services/plant-status-sync.service'
import { getAppSettingsPreference } from '@/services/preferences.service'
import { useStartupStore } from '@/stores/startup.store'
import { useThemeStore } from '@/stores/theme.store'

import { IonicVue } from '@ionic/vue'

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css'

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'

/* Theme variables */
import './theme/variables.css'
import './theme/polish.css'

const pinia = createPinia()
const themeStore = useThemeStore(pinia)
const startupStore = useStartupStore(pinia)

const app = createApp(App).use(IonicVue).use(pinia).use(router)

router.isReady().then(async () => {
  await themeStore.init()
  app.mount('#app')

  try {
    await initializeDatabase()
    await ensureDemoData()
    startupStore.markReady()
  } catch (error) {
    startupStore.markFailed()
    console.error('[database] initialization failed:', error)
    return
  }

  try {
    await registerNotificationDeepLinks(router)
    await pruneAlertHistory()
    await registerForegroundSync(pinia)
    await syncAllPlantStatusesAtStartup()
    const settings = await getAppSettingsPreference()
    await syncNotificationPreferences(settings, {
      requestPermission: false,
    })
    const createdAlerts = await runAlertEngineForAllPlants()
    await notifyForAlerts(createdAlerts)
  } catch (error) {
    console.warn('[startup] optional service initialization failed:', error)
  }
})
