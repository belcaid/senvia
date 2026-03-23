import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { initializeDatabase } from '@/database'
import { runAlertEngineForAllPlants } from '@/services/alert-engine.service'
import { ensureDemoData } from '@/services/demo-data.service'
import { syncAllPlantStatusesAtStartup } from '@/services/plant-status-sync.service'
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

const pinia = createPinia()
const themeStore = useThemeStore(pinia)

const app = createApp(App).use(IonicVue).use(pinia).use(router)

router.isReady().then(async () => {
  await themeStore.init()

  try {
    await initializeDatabase()
    await ensureDemoData()
    await syncAllPlantStatusesAtStartup()
    await runAlertEngineForAllPlants()
  } catch (error) {
    console.warn('[database] initialization failed:', error)
  }

  app.mount('#app')
})
