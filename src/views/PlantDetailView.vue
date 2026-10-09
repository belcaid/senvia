<template>
  <ion-page class="plant-detail-page">
    <ion-content class="ion-padding">
      <nav class="detail-navigation senvia-reveal" aria-label="Navigation de la fiche plante">
        <page-back-button fallback-href="/tabs/dashboard" />
        <div v-if="plante" class="detail-navigation__actions">
          <button
            type="button"
            class="detail-navigation__edit"
            aria-label="Modifier la plante"
            @click="isEditModalOpen = true"
          >
            <ion-icon :icon="createOutline" />
          </button>
          <button
            type="button"
            class="detail-navigation__delete"
            aria-label="Supprimer la plante"
            @click="confirmerSuppression"
          >
            <ion-icon :icon="trashOutline" />
          </button>
        </div>
      </nav>

      <ion-note v-if="plantsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">{{ plantsStore.erreur }}</ion-note>
      <ion-note v-if="thresholdProfilesStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ thresholdProfilesStore.erreur }}
      </ion-note>
      <ion-note v-if="measurementsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ measurementsStore.erreur }}
      </ion-note>
      <ion-note v-if="sensorsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ sensorsStore.erreur }}
      </ion-note>
      <ion-note v-if="settingsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ settingsStore.erreur }}
      </ion-note>
      <ion-note v-if="bleStore.erreur" class="senvia-feedback senvia-reveal" color="danger">{{ bleStore.erreur }}</ion-note>

      <template v-if="plante">
        <section class="plant-summary senvia-reveal">
          <ion-icon :icon="iconePlante" class="plant-icon" />
          <div class="plant-summary__content">
            <h1>{{ plante.name }}</h1>
            <p>{{ categorieLabel }} · {{ plante.location }}</p>
            <div class="plant-summary__chips">
              <plant-status-badge :status="analyseSante.status" />
              <ion-chip v-if="donneesObsoletes && mesureActuelle" color="warning" outline>
                <ion-label>Données obsolètes</ion-label>
              </ion-chip>
            </div>
          </div>
        </section>

        <ion-card v-if="!capteurAssocie" class="setup-card senvia-reveal">
          <ion-card-content>
            <div class="setup-card__icon">
              <ion-icon :icon="bluetoothOutline" />
            </div>
            <div class="setup-card__copy">
              <span>Étape 2 sur 2</span>
              <h3>Connectez le capteur</h3>
              <p>Associez le capteur de {{ plante.name }} pour recevoir ses mesures et ses alertes.</p>
            </div>
            <ion-button :router-link="`/plants/${plante.id}/pairing`" expand="block">
              Connecter un capteur
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-card class="detail-card health-card senvia-card senvia-reveal">
          <ion-card-header>
            <ion-card-title>Statut global</ion-card-title>
            <ion-card-subtitle>
              Dernière analyse : {{ formatDateTime(mesureActuelle?.measuredAt, 'Aucune mesure') }}
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <p class="detail-text">{{ explicationStatut }}</p>
            <p class="detail-score">Score de santé · {{ analyseSante.score }}/100</p>
            <ion-button
              v-if="capteurAssocie && !capteurEstDemo"
              expand="block"
              :disabled="isSyncing"
              @click="synchroniserMesures"
            >
              {{ isSyncing ? 'Synchronisation…' : 'Actualiser les mesures' }}
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-card class="detail-card senvia-card senvia-reveal">
          <ion-card-header>
            <ion-card-title>Mesures actuelles</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div v-if="mesureActuelle" class="metrics-grid">
              <p><strong>Température :</strong> {{ mesureActuelle.temperature.toFixed(1) }} °C</p>
              <p><strong>Humidité :</strong> {{ Math.round(mesureActuelle.moisture) }} %</p>
              <p><strong>Lumière :</strong> {{ Math.round(mesureActuelle.light) }} lx</p>
              <p><strong>Fertilité :</strong> {{ Math.round(mesureActuelle.conductivity) }} µS/cm</p>
              <p>
                <strong>Batterie:</strong>
                {{ mesureActuelle.batteryLevel === null ? 'Inconnue' : `${Math.round(mesureActuelle.batteryLevel)} %` }}
              </p>
              <p><strong>Source:</strong> {{ mesureActuelle.source }}</p>
            </div>
            <p v-else class="detail-empty">Aucune mesure enregistree.</p>
          </ion-card-content>
        </ion-card>

        <ion-card v-if="capteurAssocie" class="detail-card sensor-card senvia-card senvia-reveal">
          <ion-card-header>
            <ion-card-title>{{ capteurEstDemo ? 'Aperçu de démonstration' : 'Capteur associé' }}</ion-card-title>
            <ion-card-subtitle>
              {{ capteurEstDemo ? 'Ces mesures sont fictives et servent à découvrir l’application.' : `Dernier contact ${formatDateTime(capteurAssocie.lastSeenAt, 'jamais')}` }}
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="sensor-overview">
              <div class="sensor-overview__status">
                <span class="sensor-overview__dot"><ion-icon :icon="bluetoothOutline" /></span>
                <div>
                  <strong>{{ capteurEstDemo ? 'Capteur de démonstration' : capteurAssocie.deviceName }}</strong>
                  <p v-if="capteurEstDemo">Connectez votre capteur pour obtenir des mesures réelles.</p>
                  <p v-else>Batterie {{ capteurAssocie.batteryLevel === null ? 'inconnue' : `${Math.round(capteurAssocie.batteryLevel)} %` }}</p>
                </div>
              </div>
              <ion-button :router-link="`/plants/${plante.id}/pairing`" fill="outline" size="small">
                {{ capteurEstDemo ? 'Connecter' : 'Gérer' }}
              </ion-button>
            </div>

            <ion-accordion-group class="technical-details">
              <ion-accordion value="technical">
                <ion-item slot="header" lines="none">
                  <ion-label>Détails techniques</ion-label>
                </ion-item>
                <div slot="content" class="technical-details__content">
                  <p>Modèle · {{ capteurAssocie.model }}</p>
                  <p>Identifiant · {{ capteurAssocie.deviceIdentifier }}</p>
                  <ion-button fill="clear" color="danger" size="small" @click="confirmerDissociation">
                    Dissocier le capteur
                  </ion-button>
                </div>
              </ion-accordion>
            </ion-accordion-group>
          </ion-card-content>
        </ion-card>

        <ion-card class="detail-card senvia-card senvia-reveal">
          <ion-card-header>
            <ion-card-title>Historique des mesures</ion-card-title>
            <ion-card-subtitle>{{ historiqueMesures.length }} point(s) sur la periode</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-segment :value="historyRange" @ionChange="onHistoryRangeChange">
              <ion-segment-button value="24h">
                <ion-label>24 h</ion-label>
              </ion-segment-button>
              <ion-segment-button value="7d">
                <ion-label>7 jours</ion-label>
              </ion-segment-button>
              <ion-segment-button value="30d">
                <ion-label>30 jours</ion-label>
              </ion-segment-button>
              <ion-segment-button value="all">
                <ion-label>Tout</ion-label>
              </ion-segment-button>
            </ion-segment>

            <div class="charts-grid">
              <measurement-line-chart
                title="Température"
                unit="C"
                metric="temperature"
                :measurements="historiqueMesures"
                :target-min="profilSeuil?.tempMin ?? null"
                :target-max="profilSeuil?.tempMax ?? null"
              />
              <measurement-line-chart
                title="Humidité du sol"
                unit="%"
                metric="moisture"
                :measurements="historiqueMesures"
                :target-min="profilSeuil?.moistureMin ?? null"
                :target-max="profilSeuil?.moistureMax ?? null"
              />
              <measurement-line-chart
                title="Lumière"
                unit="lx"
                metric="light"
                :measurements="historiqueMesures"
                :target-min="profilSeuil?.lightMin ?? null"
                :target-max="profilSeuil?.lightMax ?? null"
              />
              <measurement-line-chart
                title="Fertilité"
                unit="uS/cm"
                metric="conductivity"
                :measurements="historiqueMesures"
                :target-min="profilSeuil?.conductivityMin ?? null"
                :target-max="profilSeuil?.conductivityMax ?? null"
              />
            </div>
          </ion-card-content>
        </ion-card>

      </template>

      <screen-placeholder
        class="senvia-reveal"
        v-else
        title="Plante introuvable"
        subtitle="Aucune plante correspondant a cet identifiant"
        description="Retourne au dashboard pour creer une nouvelle plante ou selectionner une plante existante."
      >
        <template #actions>
          <ion-button router-link="/tabs/dashboard">Retour Dashboard</ion-button>
        </template>
      </screen-placeholder>
    </ion-content>

    <ion-modal
      :is-open="isEditModalOpen"
      :initial-breakpoint="0.92"
      :breakpoints="[0, 0.92, 1]"
      @didDismiss="isEditModalOpen = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Modifier la plante</ion-title>
          <ion-buttons slot="end">
            <ion-button fill="clear" @click="isEditModalOpen = false">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <plant-form
          v-if="isEditModalOpen"
          :initial-values="valeursFormulaire"
          :threshold-profiles="thresholdProfilesStore.profils"
          :is-submitting="isSubmitting"
          submit-label="Enregistrer les modifications"
          @submit="modifierEtFermer"
        />
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  IonAccordion,
  IonAccordionGroup,
  alertController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonModal,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { bluetoothOutline, closeOutline, createOutline, trashOutline } from 'ionicons/icons'
import { useRoute, useRouter } from 'vue-router'
import MeasurementLineChart from '@/components/MeasurementLineChart.vue'
import PageBackButton from '@/components/PageBackButton.vue'
import PlantForm, { type PlantFormValues } from '@/components/PlantForm.vue'
import PlantStatusBadge from '@/components/PlantStatusBadge.vue'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
import { useGsapReveal } from '@/composables/use-gsap-reveal'
import { showErrorFeedback, showInfoFeedback, showSuccessFeedback, showWarningFeedback } from '@/services/ux-feedback.service'
import { useBleStore } from '@/stores/ble.store'
import { useMeasurementsStore } from '@/stores/measurements.store'
import { usePlantsStore } from '@/stores/plants.store'
import { useSensorsStore } from '@/stores/sensors.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useThresholdProfilesStore } from '@/stores/threshold-profiles.store'
import type { HistoryRange } from '@/types/app-settings.types'
import { formatDateTime } from '@/utils/date.util'
import { isMeasurementStale } from '@/utils/measurement-freshness.util'
import { getCategoryLabel, getPlantIcon } from '@/utils/plant-options.util'
import { evaluatePlantHealth } from '@/utils/plant-health.util'

const route = useRoute()
const router = useRouter()

const bleStore = useBleStore()
const measurementsStore = useMeasurementsStore()
const plantsStore = usePlantsStore()
const sensorsStore = useSensorsStore()
const settingsStore = useSettingsStore()
const thresholdProfilesStore = useThresholdProfilesStore()

const isSubmitting = ref(false)
const isSyncing = ref(false)
const isEditModalOpen = ref(false)
const historyRange = ref<HistoryRange>('7d')

const plantId = computed(() => String(route.params.plantId ?? ''))

const plante = computed(() => plantsStore.getPlanteParId(plantId.value))
const mesureActuelle = computed(() => measurementsStore.derniereMesureParPlante[plantId.value] ?? null)
const historiqueMesures = computed(() => measurementsStore.mesuresParPlante[plantId.value] ?? [])
const capteurAssocie = computed(() => sensorsStore.getCapteurParPlanteId(plantId.value))
const capteurEstDemo = computed(() => capteurAssocie.value?.id.startsWith('s-demo-') ?? false)
const profilSeuil = computed(() => thresholdProfilesStore.getProfilParId(plante.value?.thresholdProfileId ?? null) ?? null)
const staleDataThresholdMinutes = computed(() => settingsStore.parametres.staleDataThresholdMinutes)
const donneesObsoletes = computed(() =>
  isMeasurementStale(mesureActuelle.value?.measuredAt, staleDataThresholdMinutes.value),
)

const analyseSante = computed(() =>
  evaluatePlantHealth({
    measurement: mesureActuelle.value,
    thresholdProfile: profilSeuil.value,
    isStale: donneesObsoletes.value,
    staleThresholdMinutes: staleDataThresholdMinutes.value,
  }),
)

const explicationStatut = computed(() => analyseSante.value.explanation)

const valeursFormulaire = computed<Partial<PlantFormValues> | undefined>(() => {
  if (!plante.value) {
    return undefined
  }

  return {
    nom: plante.value.name,
    categorie: plante.value.category,
    emplacement: plante.value.location,
    icone: plante.value.icon,
    estFavori: plante.value.isFavorite,
    thresholdProfileId: plante.value.thresholdProfileId,
  }
})

const iconePlante = computed(() => getPlantIcon(plante.value?.icon ?? ''))
const categorieLabel = computed(() => (plante.value ? getCategoryLabel(plante.value.category) : ''))

const chargerContexte = async (): Promise<void> => {
  await Promise.all([
    plantsStore.chargerPlantes(),
    thresholdProfilesStore.chargerProfils({ ensureDefaults: true }),
    sensorsStore.chargerCapteurs(),
    settingsStore.chargerParametres(),
  ])

  if (plantId.value.trim() === '') {
    return
  }

  historyRange.value = settingsStore.parametres.preferredHistoryRange
  await measurementsStore.chargerHistoriqueParPeriode(plantId.value, historyRange.value, {
    limit: historyRange.value === 'all' ? 2400 : 800,
  })
  await plantsStore.synchroniserStatutsRecalcules({
    [plantId.value]: analyseSante.value.status,
  })
}

const modifierPlante = async (values: PlantFormValues): Promise<void> => {
  if (!plante.value) {
    return
  }

  isSubmitting.value = true

  try {
    const updated = await plantsStore.modifierPlante(plante.value.id, {
      name: values.nom,
      category: values.categorie,
      location: values.emplacement,
      icon: values.icone,
      isFavorite: values.estFavori,
      thresholdProfileId: values.thresholdProfileId,
    })

    if (updated === null) {
      await showErrorFeedback("Impossible d'enregistrer les modifications.")
      return
    }

    await showSuccessFeedback('Plante mise a jour.')
  } finally {
    isSubmitting.value = false
  }
}

const modifierEtFermer = async (values: PlantFormValues): Promise<void> => {
  await modifierPlante(values)
  if (!plantsStore.erreur) {
    isEditModalOpen.value = false
  }
}

const confirmerSuppression = async (): Promise<void> => {
  if (!plante.value) {
    return
  }

  const confirmation = await alertController.create({
    header: 'Supprimer la plante',
    message: `La plante "${plante.value.name}" sera supprimee definitivement.`,
    buttons: [
      {
        text: 'Annuler',
        role: 'cancel',
      },
      {
        text: 'Supprimer',
        role: 'confirm',
      },
    ],
  })

  await confirmation.present()
  const { role } = await confirmation.onDidDismiss()

  if (role !== 'confirm') {
    return
  }

  const deleted = await plantsStore.supprimerPlante(plante.value.id)

  if (!deleted) {
    await showErrorFeedback('La suppression de la plante a echoue.')
    return
  }

  await showInfoFeedback('Plante supprimee.')
  await router.replace('/tabs/dashboard')
}

const confirmerDissociation = async (): Promise<void> => {
  if (!capteurAssocie.value) {
    return
  }

  const sensorId = capteurAssocie.value.id
  const confirmation = await alertController.create({
    header: 'Dissocier le capteur',
    message: `Les mesures déjà enregistrées seront conservées. Vous pourrez connecter un autre capteur ensuite.`,
    buttons: [
      { text: 'Annuler', role: 'cancel' },
      { text: 'Dissocier', role: 'confirm', cssClass: 'alert-confirm-danger' },
    ],
  })

  await confirmation.present()
  const { role } = await confirmation.onDidDismiss()

  if (role !== 'confirm') {
    return
  }

  await sensorsStore.supprimerCapteur(sensorId)

  if (sensorsStore.erreur) {
    await showErrorFeedback('Impossible de dissocier le capteur.')
    return
  }

  await plantsStore.chargerPlantes()
  await showInfoFeedback('Capteur dissocié. Les anciennes mesures sont conservées.')
}

const isHistoryRange = (value: string): value is HistoryRange =>
  value === '24h' || value === '7d' || value === '30d' || value === 'all'

const onHistoryRangeChange = (event: CustomEvent): void => {
  const value = String((event as CustomEvent<{ value?: string | null }>).detail?.value ?? '')

  if (!isHistoryRange(value) || !plante.value) {
    return
  }

  historyRange.value = value
  void settingsStore.sauvegarderParametres({ preferredHistoryRange: value })
  void measurementsStore.chargerHistoriqueParPeriode(plante.value.id, value, {
    limit: value === 'all' ? 2400 : 800,
  })
}

const synchroniserMesures = async (): Promise<void> => {
  if (!plante.value || !capteurAssocie.value) {
    await showWarningFeedback('Associe un capteur avant de synchroniser.')
    return
  }

  const currentPlant = plante.value
  isSyncing.value = true

  try {
    const measurement = await bleStore.synchroniserPlanteAssociee(
      currentPlant.id,
      'plant_detail_auto_sync',
    )

    if (measurement === null) {
      if (bleStore.interactionAnnulee) {
        return
      }

      await showErrorFeedback(bleStore.erreur ?? 'La synchronisation a echoue.')
      return
    }

    await measurementsStore.chargerHistoriqueParPeriode(currentPlant.id, historyRange.value, {
      limit: historyRange.value === 'all' ? 2400 : 800,
    })
    await showSuccessFeedback('Synchronisation terminee.')
  } catch {
    await showErrorFeedback('La synchronisation a echoue.')
  } finally {
    isSyncing.value = false
  }
}

useGsapReveal({
  rootSelector: '.plant-detail-page',
  itemSelector: '.senvia-reveal',
})

onMounted(() => {
  void chargerContexte()
})

watch(plantId, () => {
  void chargerContexte()
})
</script>

<style scoped>
.plant-detail-page ion-content {
  --padding-top: 0.75rem;
  --padding-bottom: 2rem;
}

.detail-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  max-width: 1100px;
  margin: 0 auto 0.35rem;
  padding: 0.25rem 0;
}

.detail-navigation button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.42rem;
  min-height: 42px;
  border: 1px solid var(--senvia-card-border);
  color: var(--ion-text-color);
  background: var(--senvia-surface);
  font: inherit;
  font-size: 0.84rem;
  font-weight: 680;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.detail-navigation button:active {
  transform: scale(0.97);
}

.detail-navigation__actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.detail-navigation__edit {
  width: 44px;
  padding: 0;
  border-radius: 14px;
}

.detail-navigation__delete {
  width: 44px;
  padding: 0;
  border-radius: 14px;
  border-color: rgba(var(--ion-color-danger-rgb), 0.24) !important;
  color: var(--ion-color-danger) !important;
  background: rgba(var(--ion-color-danger-rgb), 0.08) !important;
}

.detail-navigation ion-icon {
  font-size: 1.05rem;
}

.plant-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  max-width: 720px;
  margin: 0 auto 1.25rem;
  padding: 1rem 0 0.35rem;
  text-align: center;
}

.plant-icon {
  font-size: 2.5rem;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.08);
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.1);
  border-radius: 24px;
  padding: 0.9rem;
}

.plant-summary__content h1 {
  margin: 0;
  font-size: clamp(1.65rem, 5vw, 2.2rem);
  font-weight: 760;
  letter-spacing: -0.035em;
}

.plant-summary__content p {
  margin: 0.3rem 0 0;
  color: var(--senvia-text-muted);
  opacity: 1;
}

.plant-summary__chips {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.55rem;
}

.detail-card {
  margin: 0 0 0.9rem;
  border-radius: 18px;
}

.setup-card {
  margin: 0 0 0.9rem;
  border: 0;
  border-radius: 24px;
  --background: linear-gradient(145deg, #173e27, #22653a);
  color: #f4fff7;
  box-shadow: 0 18px 40px rgba(14, 60, 31, 0.22);
}

.setup-card ion-card-content {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.85rem;
  padding: 1.1rem;
}

.setup-card__icon {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: 16px;
  color: #11351e;
  background: #6df08c;
}

.setup-card__icon ion-icon {
  font-size: 1.45rem;
}

.setup-card__copy span {
  color: #9debb0;
  font-size: 0.7rem;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.setup-card__copy h3,
.setup-card__copy p {
  margin: 0;
}

.setup-card__copy h3 {
  margin-top: 0.15rem;
  color: #fff;
  font-size: 1.08rem;
}

.setup-card__copy p {
  margin-top: 0.3rem;
  color: rgba(244, 255, 247, 0.78);
  font-size: 0.86rem;
  line-height: 1.4;
}

.setup-card ion-button {
  grid-column: 1 / -1;
  margin: 0.15rem 0 0;
  --background: #ffffff;
  --color: #123d21;
}

.detail-card ion-card-content {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.detail-card :deep(ion-card-title),
.detail-card :deep(ion-card-subtitle) {
  color: var(--ion-text-color);
  opacity: 1;
}

.detail-text,
.detail-empty {
  margin: 0;
  color: var(--senvia-text-muted);
}

.detail-score {
  margin: 0;
  font-size: 0.84rem;
  color: var(--senvia-text-muted);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.45rem 0.75rem;
}

.metrics-grid p,
.sensor-grid p {
  margin: 0;
  background: var(--senvia-surface-2);
  border: 1px solid var(--senvia-card-border);
  border-radius: 12px;
  padding: 0.5rem 0.58rem;
  font-size: 0.88rem;
  color: var(--ion-text-color);
}

.metrics-grid p strong,
.sensor-grid p strong {
  color: var(--ion-text-color);
}

.charts-grid {
  margin-top: 0.85rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.65rem;
}

.sensor-overview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.sensor-overview__status {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.sensor-overview__status strong,
.sensor-overview__status p {
  display: block;
  margin: 0;
}

.sensor-overview__status p {
  margin-top: 0.15rem;
  color: var(--senvia-text-muted);
  font-size: 0.8rem;
}

.sensor-overview__dot {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  border-radius: 11px;
  color: var(--ion-color-primary-shade);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
}

.technical-details {
  margin-top: 0.45rem;
}

.technical-details ion-accordion,
.technical-details ion-item {
  --background: transparent;
}

.technical-details__content {
  padding: 0 0.75rem 0.55rem;
  color: var(--senvia-text-muted);
  font-size: 0.78rem;
}

.technical-details__content p {
  margin: 0.28rem 0;
}

:global(:root[data-theme='dark']) .detail-text,
:global(:root[data-theme='dark']) .detail-score,
:global(:root[data-theme='dark']) .plant-summary__content p {
  color: #e1f3e7;
}
</style>
