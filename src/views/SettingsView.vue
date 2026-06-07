<template>
  <ion-page class="settings-page">
    <ion-header>
      <ion-toolbar>
        <ion-title>Reglages</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-note v-if="settingsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">{{ settingsStore.erreur }}</ion-note>
      <ion-note v-if="sensorsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">{{ sensorsStore.erreur }}</ion-note>

      <ion-list inset class="senvia-reveal">
        <ion-list-header>
          <ion-label>Apparence</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-label>Mode sombre</ion-label>
          <ion-toggle slot="end" :checked="isDarkMode" @ionChange="onThemeToggle" />
        </ion-item>
      </ion-list>

      <ion-list inset class="senvia-reveal">
        <ion-list-header>
          <ion-label>Synchronisation et donnees</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-label>
            <h3>Synchroniser au retour dans l'app</h3>
            <p>Lit successivement les capteurs associes lorsque l'app redevient active.</p>
          </ion-label>
          <ion-toggle
            slot="end"
            :checked="settings.autoSyncOnForeground"
            @ionChange="onAutoSyncToggle"
          />
        </ion-item>
        <ion-item>
          <ion-select
            :value="settings.preferredHistoryRange"
            interface="popover"
            label="Periode d'historique par defaut"
            label-placement="stacked"
            @ionChange="onHistoryRangeChange"
          >
            <ion-select-option value="24h">24 heures</ion-select-option>
            <ion-select-option value="7d">7 jours</ion-select-option>
            <ion-select-option value="30d">30 jours</ion-select-option>
            <ion-select-option value="all">Tout</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-input
            type="number"
            min="5"
            max="1440"
            label="Donnees obsoletes apres (minutes)"
            label-placement="stacked"
            :value="settings.staleDataThresholdMinutes"
            @ionChange="onStaleThresholdChange"
          />
        </ion-item>
        <ion-item>
          <ion-input
            type="number"
            min="1"
            max="168"
            label="Lecture batterie toutes les (heures)"
            label-placement="stacked"
            :value="settings.batteryReadIntervalHours"
            @ionChange="onBatteryIntervalChange"
          />
        </ion-item>
      </ion-list>

      <ion-list inset class="senvia-reveal">
        <ion-list-header>
          <ion-label>Notifications</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-label>Notifications actives</ion-label>
          <ion-toggle
            slot="end"
            :checked="settings.notificationsEnabled"
            @ionChange="onNotificationsToggle"
          />
        </ion-item>
        <ion-item>
          <ion-input
            type="time"
            label="Heure de rappel"
            label-placement="stacked"
            :value="heureRappel"
            :disabled="!settings.notificationsEnabled"
            @ionInput="onReminderInput"
            @ionBlur="onReminderBlur"
          />
        </ion-item>
        <ion-item>
          <ion-select
            :value="settings.minimumNotifiedSeverity"
            interface="popover"
            label="Niveau minimal a notifier"
            label-placement="stacked"
            :disabled="!settings.notificationsEnabled"
            @ionChange="onMinimumSeverityChange"
          >
            <ion-select-option value="info">Info</ion-select-option>
            <ion-select-option value="warning">Warning</ion-select-option>
            <ion-select-option value="critical">Critique</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <ion-list inset class="senvia-reveal">
        <ion-list-header>
          <ion-label>Informations app</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-label>Nom</ion-label>
          <ion-note slot="end">{{ appName }}</ion-note>
        </ion-item>
        <ion-item>
          <ion-label>Version</ion-label>
          <ion-note slot="end">{{ appVersion }}</ion-note>
        </ion-item>
        <ion-item>
          <ion-label>Plateforme</ion-label>
          <ion-note slot="end">{{ appPlatform }}</ion-note>
        </ion-item>
        <ion-item v-if="isDevelopment" lines="none">
          <ion-button
            expand="block"
            fill="outline"
            :disabled="isReloadingDemo"
            @click="confirmerRechargementDemo"
          >
            {{ isReloadingDemo ? 'Rechargement...' : 'Recharger donnees demo' }}
          </ion-button>
        </ion-item>
      </ion-list>

      <ion-list inset class="senvia-reveal">
        <ion-list-header>
          <ion-label>Capteurs associes</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-label>
            <h3>Etat batterie connu</h3>
            <p>{{ batteriesConnues }} / {{ capteursAssocies.length }} capteurs</p>
          </ion-label>
        </ion-item>

        <ion-item v-for="capteur in capteursAssocies" :key="capteur.id">
          <ion-label>
            <h3>{{ capteur.deviceName }}</h3>
            <p>Plante: {{ getPlantName(capteur.plantId) }}</p>
            <p>Dernier contact: {{ formatDateTime(capteur.lastSeenAt, 'Inconnu') }}</p>
          </ion-label>
          <ion-note slot="end">{{ getBatteryLabel(capteur.batteryLevel) }}</ion-note>
        </ion-item>

        <ion-item v-if="capteursAssocies.length === 0">
          <ion-label>Aucun capteur associe.</ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  alertController,
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Capacitor } from '@capacitor/core'
import { useGsapReveal } from '@/composables/use-gsap-reveal'
import { usePlantsStore } from '@/stores/plants.store'
import { useSensorsStore } from '@/stores/sensors.store'
import { useSettingsStore } from '@/stores/settings.store'
import type { AlertSeverity } from '@/types/alert.types'
import type { HistoryRange } from '@/types/app-settings.types'
import { resetAndSeedDemoData } from '@/services/demo-data.service'
import { showErrorFeedback, showInfoFeedback, showSuccessFeedback } from '@/services/ux-feedback.service'
import { formatDateTime } from '@/utils/date.util'
import packageMetadata from '../../package.json'

const appName = 'Senvia'
const appVersion = packageMetadata.version
const appPlatform = Capacitor.getPlatform()
const isDevelopment = import.meta.env.DEV

const settingsStore = useSettingsStore()
const sensorsStore = useSensorsStore()
const plantsStore = usePlantsStore()

const heureRappel = ref('')
const isReloadingDemo = ref(false)

const settings = computed(() => settingsStore.parametres)
const isDarkMode = computed(() => settings.value.themeMode === 'dark')

const capteursAssocies = computed(() => sensorsStore.capteurs.filter((capteur) => capteur.plantId !== null))
const batteriesConnues = computed(
  () => capteursAssocies.value.filter((capteur) => capteur.batteryLevel !== null).length,
)

watch(
  () => settings.value.preferredReminderTime,
  (value) => {
    heureRappel.value = value ?? ''
  },
  { immediate: true },
)

const onThemeToggle = async (event: CustomEvent<{ checked: boolean }>): Promise<void> => {
  const saved = await settingsStore.sauvegarderParametres({ themeMode: event.detail.checked ? 'dark' : 'light' })

  if (saved !== null) {
    await showInfoFeedback(saved.themeMode === 'dark' ? 'Mode sombre active.' : 'Mode clair active.')
  }
}

const onNotificationsToggle = async (event: CustomEvent<{ checked: boolean }>): Promise<void> => {
  const saved = await settingsStore.sauvegarderParametres({ notificationsEnabled: event.detail.checked })

  if (saved !== null) {
    await showInfoFeedback(saved.notificationsEnabled ? 'Notifications activees.' : 'Notifications desactivees.')
  }
}

const isAlertSeverity = (value: string): value is AlertSeverity =>
  value === 'info' || value === 'warning' || value === 'critical'

const onMinimumSeverityChange = async (event: CustomEvent<{ value?: string | null }>): Promise<void> => {
  const value = String(event.detail.value ?? '')

  if (!isAlertSeverity(value)) {
    return
  }

  const saved = await settingsStore.sauvegarderParametres({ minimumNotifiedSeverity: value })

  if (saved !== null) {
    await showInfoFeedback('Niveau minimal de notification mis a jour.')
  }
}

const onReminderInput = (event: CustomEvent<{ value?: string | null }>): void => {
  const value = event.detail.value

  if (typeof value === 'string') {
    heureRappel.value = value
    return
  }

  heureRappel.value = value === null || value === undefined ? '' : String(value)
}

const onReminderBlur = async (): Promise<void> => {
  const valeurNettoyee = heureRappel.value.trim()
  const saved = await settingsStore.sauvegarderParametres({
    preferredReminderTime: valeurNettoyee === '' ? null : valeurNettoyee,
  })

  if (saved !== null) {
    await showInfoFeedback('Heure de rappel enregistree.')
  }
}

const onAutoSyncToggle = async (event: CustomEvent<{ checked: boolean }>): Promise<void> => {
  await settingsStore.sauvegarderParametres({ autoSyncOnForeground: event.detail.checked })
}

const isHistoryRange = (value: string): value is HistoryRange =>
  value === '24h' || value === '7d' || value === '30d' || value === 'all'

const onHistoryRangeChange = async (
  event: CustomEvent<{ value?: string | null }>,
): Promise<void> => {
  const value = String(event.detail.value ?? '')

  if (isHistoryRange(value)) {
    await settingsStore.sauvegarderParametres({ preferredHistoryRange: value })
  }
}

const parseBoundedInteger = (
  event: CustomEvent<{ value?: string | number | null }>,
  min: number,
  max: number,
): number | null => {
  const value = Number(event.detail.value)

  if (!Number.isFinite(value)) {
    return null
  }

  return Math.min(max, Math.max(min, Math.round(value)))
}

const onStaleThresholdChange = async (
  event: CustomEvent<{ value?: string | number | null }>,
): Promise<void> => {
  const value = parseBoundedInteger(event, 5, 1440)

  if (value !== null) {
    await settingsStore.sauvegarderParametres({ staleDataThresholdMinutes: value })
  }
}

const onBatteryIntervalChange = async (
  event: CustomEvent<{ value?: string | number | null }>,
): Promise<void> => {
  const value = parseBoundedInteger(event, 1, 168)

  if (value !== null) {
    await settingsStore.sauvegarderParametres({ batteryReadIntervalHours: value })
  }
}

const getPlantName = (plantId: string | null): string => {
  if (plantId === null) {
    return 'Non associee'
  }

  const plante = plantsStore.getPlanteParId(plantId)
  return plante?.name ?? 'Plante inconnue'
}

const getBatteryLabel = (batteryLevel: number | null): string => {
  if (batteryLevel === null) {
    return 'Batterie inconnue'
  }

  return `${Math.round(batteryLevel)} %`
}

const chargerReglages = async (): Promise<void> => {
  await Promise.all([
    settingsStore.chargerParametres(),
    sensorsStore.chargerCapteurs(),
    plantsStore.chargerPlantes(),
  ])
}

const confirmerRechargementDemo = async (): Promise<void> => {
  const confirmation = await alertController.create({
    header: 'Recharger donnees demo',
    message: 'Cela supprimera les donnees locales actuelles puis recreera le jeu de demo. Continuer ?',
    buttons: [
      { text: 'Annuler', role: 'cancel' },
      { text: 'Recharger', role: 'confirm' },
    ],
  })

  await confirmation.present()
  const { role } = await confirmation.onDidDismiss()

  if (role !== 'confirm') {
    return
  }

  isReloadingDemo.value = true

  try {
    await resetAndSeedDemoData()
    await Promise.all([plantsStore.chargerPlantes(), sensorsStore.chargerCapteurs()])
    await showSuccessFeedback('Donnees demo rechargees.')
  } catch {
    await showErrorFeedback("Le rechargement des donnees demo a echoue.")
  } finally {
    isReloadingDemo.value = false
  }
}

onIonViewWillEnter(() => {
  void chargerReglages()
})

useGsapReveal({
  rootSelector: '.settings-page',
  itemSelector: '.senvia-reveal',
})
</script>
