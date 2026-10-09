<template>
  <ion-page class="settings-page">
    <ion-content class="ion-padding">
      <section class="settings-intro senvia-reveal">
        <h1>Réglages</h1>
        <p>Personnalisez seulement ce qui compte au quotidien.</p>
      </section>

      <ion-note v-if="settingsStore.erreur" class="senvia-feedback" color="danger">{{ settingsStore.erreur }}</ion-note>
      <ion-note v-if="sensorsStore.erreur" class="senvia-feedback" color="danger">{{ sensorsStore.erreur }}</ion-note>

      <section class="settings-section senvia-reveal">
        <h2>Préférences</h2>
        <ion-list class="settings-card">
          <ion-item lines="none">
            <ion-label>
              <strong>Actualisation automatique</strong>
              <p>Met les capteurs à jour au retour dans l’application.</p>
            </ion-label>
            <ion-toggle slot="end" :checked="settings.autoSyncOnForeground" @ionChange="onAutoSyncToggle" />
          </ion-item>
        </ion-list>
      </section>

      <section class="settings-section senvia-reveal">
        <h2>Notifications</h2>
        <ion-list class="settings-card">
          <ion-item :lines="settings.notificationsEnabled ? undefined : 'none'">
            <ion-label>
              <strong>Alertes et rappels</strong>
              <p>Soyez prévenu quand une plante demande votre attention.</p>
            </ion-label>
            <ion-toggle slot="end" :checked="settings.notificationsEnabled" @ionChange="onNotificationsToggle" />
          </ion-item>
          <template v-if="settings.notificationsEnabled">
            <ion-item>
              <ion-input
                type="time"
                label="Rappel quotidien"
                label-placement="stacked"
                :value="heureRappel"
                @ionInput="onReminderInput"
                @ionBlur="onReminderBlur"
              />
            </ion-item>
            <ion-item lines="none">
              <ion-select
                :value="settings.minimumNotifiedSeverity"
                interface="popover"
                label="Me prévenir pour"
                label-placement="stacked"
                @ionChange="onMinimumSeverityChange"
              >
                <ion-select-option value="info">Toutes les alertes</ion-select-option>
                <ion-select-option value="warning">Alertes importantes</ion-select-option>
                <ion-select-option value="critical">Urgences uniquement</ion-select-option>
              </ion-select>
            </ion-item>
          </template>
        </ion-list>
      </section>

      <section class="settings-section senvia-reveal">
        <h2>Mes capteurs</h2>
        <div class="sensor-summary-card">
          <div>
            <strong>{{ capteursAssocies.length }}</strong>
            <span>capteur{{ capteursAssocies.length > 1 ? 's' : '' }} associé{{ capteursAssocies.length > 1 ? 's' : '' }}</span>
          </div>
          <p>Les capteurs se gèrent directement depuis la fiche de chaque plante.</p>
          <ion-button
            v-if="capteursSynchronisables.length > 0"
            expand="block"
            :disabled="isSyncingAll"
            @click="synchroniserTousLesCapteurs"
          >
            <ion-spinner v-if="isSyncingAll" slot="start" name="crescent" />
            {{ isSyncingAll ? 'Actualisation en cours…' : 'Actualiser tous les capteurs' }}
          </ion-button>
        </div>
      </section>

      <section class="settings-section senvia-reveal">
        <ion-accordion-group class="advanced-settings">
          <ion-accordion value="advanced">
            <ion-item slot="header" lines="none">
              <ion-label>
                <strong>Réglages avancés</strong>
                <p>Historique, fraîcheur des données et batterie.</p>
              </ion-label>
            </ion-item>
            <ion-list slot="content" class="advanced-settings__content">
              <ion-item>
                <ion-select
                  :value="settings.preferredHistoryRange"
                  interface="popover"
                  label="Historique affiché par défaut"
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
                  label="Considérer les données anciennes après (min)"
                  label-placement="stacked"
                  :value="settings.staleDataThresholdMinutes"
                  @ionChange="onStaleThresholdChange"
                />
              </ion-item>
              <ion-item lines="none">
                <ion-input
                  type="number"
                  min="1"
                  max="168"
                  label="Vérifier la batterie toutes les (h)"
                  label-placement="stacked"
                  :value="settings.batteryReadIntervalHours"
                  @ionChange="onBatteryIntervalChange"
                />
              </ion-item>
            </ion-list>
          </ion-accordion>
        </ion-accordion-group>
      </section>

      <section class="settings-footer senvia-reveal">
        <span>{{ appName }} {{ appVersion }} · {{ appPlatform }}</span>
        <ion-button v-if="isDevelopment" fill="clear" color="medium" :disabled="isReloadingDemo" @click="confirmerRechargementDemo">
          {{ isReloadingDemo ? 'Rechargement…' : 'Réinitialiser les données de démonstration' }}
        </ion-button>
      </section>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  alertController,
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToggle,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Capacitor } from '@capacitor/core'
import { useGsapReveal } from '@/composables/use-gsap-reveal'
import { useBleStore } from '@/stores/ble.store'
import { usePlantsStore } from '@/stores/plants.store'
import { useSensorsStore } from '@/stores/sensors.store'
import { useSettingsStore } from '@/stores/settings.store'
import type { AlertSeverity } from '@/types/alert.types'
import type { HistoryRange } from '@/types/app-settings.types'
import { resetAndSeedDemoData } from '@/services/demo-data.service'
import { showErrorFeedback, showInfoFeedback, showSuccessFeedback } from '@/services/ux-feedback.service'
import packageMetadata from '../../package.json'

const appName = 'Senvia'
const appVersion = packageMetadata.version
const appPlatform = Capacitor.getPlatform()
const isDevelopment = import.meta.env.DEV
const settingsStore = useSettingsStore()
const bleStore = useBleStore()
const sensorsStore = useSensorsStore()
const plantsStore = usePlantsStore()
const heureRappel = ref('')
const isReloadingDemo = ref(false)
const isSyncingAll = ref(false)
const settings = computed(() => settingsStore.parametres)
const capteursAssocies = computed(() => sensorsStore.capteurs.filter((capteur) => capteur.plantId !== null))
const capteursSynchronisables = computed(() => capteursAssocies.value.filter((capteur) => !capteur.id.startsWith('s-demo-')))

watch(() => settings.value.preferredReminderTime, (value) => { heureRappel.value = value ?? '' }, { immediate: true })

const onNotificationsToggle = async (event: CustomEvent<{ checked: boolean }>): Promise<void> => {
  const saved = await settingsStore.sauvegarderParametres({ notificationsEnabled: event.detail.checked })
  if (saved) await showInfoFeedback(saved.notificationsEnabled ? 'Notifications activées.' : 'Notifications désactivées.')
}

const isAlertSeverity = (value: string): value is AlertSeverity => ['info', 'warning', 'critical'].includes(value)
const onMinimumSeverityChange = async (event: CustomEvent<{ value?: string | null }>): Promise<void> => {
  const value = String(event.detail.value ?? '')
  if (isAlertSeverity(value)) await settingsStore.sauvegarderParametres({ minimumNotifiedSeverity: value })
}

const onReminderInput = (event: CustomEvent<{ value?: string | null }>): void => {
  heureRappel.value = event.detail.value ?? ''
}
const onReminderBlur = async (): Promise<void> => {
  const value = heureRappel.value.trim()
  await settingsStore.sauvegarderParametres({ preferredReminderTime: value || null })
}
const onAutoSyncToggle = async (event: CustomEvent<{ checked: boolean }>): Promise<void> => {
  await settingsStore.sauvegarderParametres({ autoSyncOnForeground: event.detail.checked })
}
const isHistoryRange = (value: string): value is HistoryRange => ['24h', '7d', '30d', 'all'].includes(value)
const onHistoryRangeChange = async (event: CustomEvent<{ value?: string | null }>): Promise<void> => {
  const value = String(event.detail.value ?? '')
  if (isHistoryRange(value)) await settingsStore.sauvegarderParametres({ preferredHistoryRange: value })
}
const parseBoundedInteger = (event: CustomEvent<{ value?: string | number | null }>, min: number, max: number): number | null => {
  const value = Number(event.detail.value)
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : null
}
const onStaleThresholdChange = async (event: CustomEvent<{ value?: string | number | null }>): Promise<void> => {
  const value = parseBoundedInteger(event, 5, 1440)
  if (value !== null) await settingsStore.sauvegarderParametres({ staleDataThresholdMinutes: value })
}
const onBatteryIntervalChange = async (event: CustomEvent<{ value?: string | number | null }>): Promise<void> => {
  const value = parseBoundedInteger(event, 1, 168)
  if (value !== null) await settingsStore.sauvegarderParametres({ batteryReadIntervalHours: value })
}
const chargerReglages = async (): Promise<void> => {
  await Promise.all([settingsStore.chargerParametres(), sensorsStore.chargerCapteurs(), plantsStore.chargerPlantes()])
}
const synchroniserTousLesCapteurs = async (): Promise<void> => {
  if (isSyncingAll.value) return
  isSyncingAll.value = true
  let successCount = 0

  try {
    for (const capteur of capteursSynchronisables.value) {
      if (capteur.plantId && await bleStore.synchroniserPlanteAssociee(capteur.plantId, 'manual_sync')) {
        successCount += 1
      }
    }

    await sensorsStore.chargerCapteurs()

    if (successCount === capteursSynchronisables.value.length) {
      await showSuccessFeedback('Tous les capteurs sont à jour.')
    } else if (successCount > 0) {
      await showInfoFeedback(`${successCount} capteur${successCount > 1 ? 's' : ''} actualisé${successCount > 1 ? 's' : ''}.`)
    } else {
      await showErrorFeedback('Aucun capteur n’a pu être actualisé.')
    }
  } finally {
    isSyncingAll.value = false
  }
}
const confirmerRechargementDemo = async (): Promise<void> => {
  const confirmation = await alertController.create({
    header: 'Réinitialiser les données',
    message: 'Les données locales seront remplacées par le jeu de démonstration.',
    buttons: [{ text: 'Annuler', role: 'cancel' }, { text: 'Réinitialiser', role: 'confirm' }],
  })
  await confirmation.present()
  if ((await confirmation.onDidDismiss()).role !== 'confirm') return
  isReloadingDemo.value = true
  try {
    await resetAndSeedDemoData()
    await Promise.all([plantsStore.chargerPlantes(), sensorsStore.chargerCapteurs()])
    await showSuccessFeedback('Données de démonstration restaurées.')
  } catch {
    await showErrorFeedback('La réinitialisation a échoué.')
  } finally {
    isReloadingDemo.value = false
  }
}

onIonViewWillEnter(() => void chargerReglages())
useGsapReveal({ rootSelector: '.settings-page', itemSelector: '.senvia-reveal' })
</script>

<style scoped>
.settings-page ion-content { --padding-bottom: 2rem; }
.settings-intro, .settings-section, .settings-footer { width: 100%; max-width: var(--senvia-focused-content-width); box-sizing: border-box; margin-right: auto; margin-left: 0; }
.settings-intro { margin-top: 0.35rem; margin-bottom: 1.25rem; }
.settings-intro h1 { margin: 0; font-size: clamp(1.7rem, 7vw, 2.25rem); letter-spacing: -0.04em; }
.settings-intro p { margin: 0.35rem 0 0; color: var(--senvia-text-muted); }
.settings-section { margin-bottom: 1.15rem; }
.settings-section > h2 { margin: 0 0 0.45rem 0.25rem; font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--senvia-text-muted); }
.settings-card, .advanced-settings, .sensor-summary-card { overflow: hidden; border: 1px solid var(--senvia-card-border); border-radius: 20px; background: var(--senvia-surface); box-shadow: 0 10px 28px var(--senvia-shadow-color); }
.settings-card ion-item, .advanced-settings ion-item { --background: transparent; --min-height: 66px; }
.settings-card strong, .settings-card p, .advanced-settings strong, .advanced-settings p { display: block; margin: 0; }
.settings-card p, .advanced-settings p { margin-top: 0.18rem; color: var(--senvia-text-muted); font-size: 0.79rem; line-height: 1.35; white-space: normal; }
.sensor-summary-card { padding: 1rem; }
.sensor-summary-card > div { display: flex; align-items: baseline; gap: 0.45rem; }
.sensor-summary-card strong { color: var(--ion-color-primary-shade); font-size: 1.8rem; line-height: 1; }
.sensor-summary-card span { font-weight: 650; }
.sensor-summary-card p { margin: 0.45rem 0 0; color: var(--senvia-text-muted); font-size: 0.82rem; }
.sensor-summary-card ion-button { margin-top: 0.85rem; }
.advanced-settings__content { padding: 0 0.45rem 0.45rem; background: transparent; }
.settings-footer { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; margin-top: 1.8rem; color: var(--senvia-text-muted); font-size: 0.76rem; }
</style>
