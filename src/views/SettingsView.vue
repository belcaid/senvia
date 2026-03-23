<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Reglages</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-note v-if="settingsStore.erreur" class="feedback" color="danger">{{ settingsStore.erreur }}</ion-note>
      <ion-note v-if="sensorsStore.erreur" class="feedback" color="danger">{{ sensorsStore.erreur }}</ion-note>

      <ion-list inset>
        <ion-list-header>
          <ion-label>Apparence</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-label>Mode sombre</ion-label>
          <ion-toggle slot="end" :checked="isDarkMode" @ionChange="onThemeToggle" />
        </ion-item>
      </ion-list>

      <ion-list inset>
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
      </ion-list>

      <ion-list inset>
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
      </ion-list>

      <ion-list inset>
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
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Capacitor } from '@capacitor/core'
import { usePlantsStore } from '@/stores/plants.store'
import { useSensorsStore } from '@/stores/sensors.store'
import { useSettingsStore } from '@/stores/settings.store'
import { formatDateTime } from '@/utils/date.util'

const appName = 'Senvia'
const appVersion = '0.0.1'
const appPlatform = Capacitor.getPlatform()

const settingsStore = useSettingsStore()
const sensorsStore = useSensorsStore()
const plantsStore = usePlantsStore()

const heureRappel = ref('')

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

const onThemeToggle = (event: CustomEvent<{ checked: boolean }>): void => {
  void settingsStore.sauvegarderParametres({ themeMode: event.detail.checked ? 'dark' : 'light' })
}

const onNotificationsToggle = (event: CustomEvent<{ checked: boolean }>): void => {
  void settingsStore.sauvegarderParametres({ notificationsEnabled: event.detail.checked })
}

const onReminderInput = (event: CustomEvent<{ value?: string | null }>): void => {
  const value = event.detail.value

  if (typeof value === 'string') {
    heureRappel.value = value
    return
  }

  heureRappel.value = value === null || value === undefined ? '' : String(value)
}

const onReminderBlur = (): void => {
  const valeurNettoyee = heureRappel.value.trim()
  void settingsStore.sauvegarderParametres({
    preferredReminderTime: valeurNettoyee === '' ? null : valeurNettoyee,
  })
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

onIonViewWillEnter(() => {
  void chargerReglages()
})
</script>

<style scoped>
.feedback {
  display: block;
  margin: 0.3rem 0.2rem;
}
</style>
