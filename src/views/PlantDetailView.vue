<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/dashboard" />
        </ion-buttons>
        <ion-title>{{ plante?.name ?? 'Detail plante' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-note v-if="plantsStore.erreur" class="feedback" color="danger">{{ plantsStore.erreur }}</ion-note>
      <ion-note v-if="thresholdProfilesStore.erreur" class="feedback" color="danger">
        {{ thresholdProfilesStore.erreur }}
      </ion-note>
      <ion-note v-if="measurementsStore.erreur" class="feedback" color="danger">
        {{ measurementsStore.erreur }}
      </ion-note>
      <ion-note v-if="sensorsStore.erreur" class="feedback" color="danger">
        {{ sensorsStore.erreur }}
      </ion-note>
      <ion-note v-if="settingsStore.erreur" class="feedback" color="danger">
        {{ settingsStore.erreur }}
      </ion-note>
      <ion-note v-if="bleStore.erreur" class="feedback" color="danger">{{ bleStore.erreur }}</ion-note>

      <template v-if="plante">
        <section class="plant-summary ion-padding">
          <ion-icon :icon="iconePlante" class="plant-icon" />
          <div class="plant-summary__content">
            <h2>{{ plante.name }}</h2>
            <p>{{ categorieLabel }} - {{ plante.location }}</p>
            <div class="plant-summary__chips">
              <ion-chip :color="statutGlobalColor">
                <ion-label>{{ statutGlobalLabel }}</ion-label>
              </ion-chip>
              <ion-chip v-if="donneesObsoletes && mesureActuelle" color="warning" outline>
                <ion-label>Donnees obsoletes</ion-label>
              </ion-chip>
            </div>
          </div>
        </section>

        <ion-card class="detail-card">
          <ion-card-header>
            <ion-card-title>Statut global</ion-card-title>
            <ion-card-subtitle>
              Derniere analyse: {{ formatDateTime(mesureActuelle?.measuredAt, 'Aucune mesure') }}
            </ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <p class="detail-text">{{ explicationStatut }}</p>
            <p class="detail-score">Score global: {{ analyseSante.score }}/100</p>
            <ion-button
              expand="block"
              :disabled="!capteurAssocie || isSyncing"
              @click="synchroniserMesures"
            >
              {{ isSyncing ? 'Synchronisation...' : 'Synchroniser les mesures' }}
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-card class="detail-card">
          <ion-card-header>
            <ion-card-title>Mesures actuelles</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div v-if="mesureActuelle" class="metrics-grid">
              <p><strong>Temperature:</strong> {{ mesureActuelle.temperature.toFixed(1) }} C</p>
              <p><strong>Humidite:</strong> {{ Math.round(mesureActuelle.moisture) }} %</p>
              <p><strong>Lumiere:</strong> {{ Math.round(mesureActuelle.light) }} lx</p>
              <p><strong>Fertilite:</strong> {{ Math.round(mesureActuelle.conductivity) }} uS/cm</p>
              <p>
                <strong>Batterie:</strong>
                {{ mesureActuelle.batteryLevel === null ? 'Inconnue' : `${Math.round(mesureActuelle.batteryLevel)} %` }}
              </p>
              <p><strong>Source:</strong> {{ mesureActuelle.source }}</p>
            </div>
            <p v-else class="detail-empty">Aucune mesure enregistree.</p>
          </ion-card-content>
        </ion-card>

        <ion-card class="detail-card">
          <ion-card-header>
            <ion-card-title>Informations capteur</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div v-if="capteurAssocie" class="sensor-grid">
              <p><strong>Nom:</strong> {{ capteurAssocie.deviceName }}</p>
              <p><strong>Identifiant:</strong> {{ capteurAssocie.deviceIdentifier }}</p>
              <p><strong>Modele:</strong> {{ capteurAssocie.model }}</p>
              <p>
                <strong>Batterie connue:</strong>
                {{ capteurAssocie.batteryLevel === null ? 'Inconnue' : `${Math.round(capteurAssocie.batteryLevel)} %` }}
              </p>
              <p><strong>Derniere lecture batterie:</strong> {{ formatDateTime(capteurAssocie.lastBatteryReadAt) }}</p>
              <p><strong>Dernier contact:</strong> {{ formatDateTime(capteurAssocie.lastSeenAt) }}</p>
            </div>
            <p v-else class="detail-empty">Aucun capteur associe a cette plante.</p>
          </ion-card-content>
        </ion-card>

        <ion-card class="detail-card">
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
                title="Temperature"
                unit="C"
                metric="temperature"
                :measurements="historiqueMesures"
                :target-min="profilSeuil?.tempMin ?? null"
                :target-max="profilSeuil?.tempMax ?? null"
              />
              <measurement-line-chart
                title="Humidite du sol"
                unit="%"
                metric="moisture"
                :measurements="historiqueMesures"
                :target-min="profilSeuil?.moistureMin ?? null"
                :target-max="profilSeuil?.moistureMax ?? null"
              />
              <measurement-line-chart
                title="Lumiere"
                unit="lx"
                metric="light"
                :measurements="historiqueMesures"
                :target-min="profilSeuil?.lightMin ?? null"
                :target-max="profilSeuil?.lightMax ?? null"
              />
              <measurement-line-chart
                title="Fertilite"
                unit="uS/cm"
                metric="conductivity"
                :measurements="historiqueMesures"
                :target-min="profilSeuil?.conductivityMin ?? null"
                :target-max="profilSeuil?.conductivityMax ?? null"
              />
            </div>
          </ion-card-content>
        </ion-card>

        <ion-card class="detail-card">
          <ion-card-header>
            <ion-card-title>Modifier la plante</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <plant-form
              :initial-values="valeursFormulaire"
              :threshold-profiles="thresholdProfilesStore.profils"
              :is-submitting="isSubmitting"
              submit-label="Enregistrer les modifications"
              @submit="modifierPlante"
            />
          </ion-card-content>
        </ion-card>

        <div class="actions ion-padding-horizontal ion-padding-bottom">
          <ion-button color="danger" fill="outline" expand="block" @click="confirmerSuppression">
            Supprimer la plante
          </ion-button>
          <ion-button :router-link="`/plants/${plante.id}/pairing`" expand="block" fill="clear">
            Associer un capteur BLE
          </ion-button>
        </div>
      </template>

      <screen-placeholder
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
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  alertController,
  IonBackButton,
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
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { useRoute, useRouter } from 'vue-router'
import MeasurementLineChart from '@/components/MeasurementLineChart.vue'
import PlantForm, { type PlantFormValues } from '@/components/PlantForm.vue'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
import { runAlertEngineForPlant } from '@/services/alert-engine.service'
import { notifyForAlerts } from '@/services/notifications.service'
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
import { getPlantStatusColor, getPlantStatusLabel } from '@/utils/plant-status.util'

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
const historyRange = ref<HistoryRange>('7d')

const plantId = computed(() => String(route.params.plantId ?? ''))

const plante = computed(() => plantsStore.getPlanteParId(plantId.value))
const mesureActuelle = computed(() => measurementsStore.derniereMesureParPlante[plantId.value] ?? null)
const historiqueMesures = computed(() => measurementsStore.mesuresParPlante[plantId.value] ?? [])
const capteurAssocie = computed(() => sensorsStore.getCapteurParPlanteId(plantId.value))
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

const statutGlobalLabel = computed(() => getPlantStatusLabel(analyseSante.value.status))
const statutGlobalColor = computed(() => getPlantStatusColor(analyseSante.value.status))
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
    await plantsStore.modifierPlante(plante.value.id, {
      name: values.nom,
      category: values.categorie,
      location: values.emplacement,
      icon: values.icone,
      isFavorite: values.estFavori,
      thresholdProfileId: values.thresholdProfileId,
    })
  } finally {
    isSubmitting.value = false
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

  await plantsStore.supprimerPlante(plante.value.id)
  await router.replace('/tabs/dashboard')
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
    return
  }

  const currentPlant = plante.value
  const currentSensor = capteurAssocie.value
  isSyncing.value = true

  try {
    await Promise.all([bleStore.initialiser(), settingsStore.chargerParametres()])

    const snapshot = await bleStore.testerConnexionEtLireMesures(currentSensor.deviceIdentifier, {
      forceBatteryRead: false,
    })

    if (snapshot === null) {
      return
    }

    await measurementsStore.ajouterMesure({
      plantId: currentPlant.id,
      sensorId: currentSensor.id,
      measuredAt: snapshot.measuredAt,
      temperature: snapshot.temperature,
      moisture: snapshot.moisture,
      light: snapshot.light,
      conductivity: snapshot.conductivity,
      batteryLevel: snapshot.batteryLevel,
      source: 'plant_detail_auto_sync',
    })

    await sensorsStore.modifierCapteur(currentSensor.id, {
      batteryLevel: snapshot.batteryLevel ?? currentSensor.batteryLevel,
      lastBatteryReadAt: snapshot.batteryReadAt ?? currentSensor.lastBatteryReadAt,
      lastSeenAt: snapshot.measuredAt,
    })

    const nextStatus = evaluatePlantHealth({
      measurement: snapshot,
      thresholdProfile: profilSeuil.value,
      isStale: false,
      staleThresholdMinutes: staleDataThresholdMinutes.value,
    }).status

    await plantsStore.modifierPlante(currentPlant.id, { status: nextStatus })
    await measurementsStore.chargerHistoriqueParPeriode(currentPlant.id, historyRange.value, {
      limit: historyRange.value === 'all' ? 2400 : 800,
    })
    await Promise.all([plantsStore.chargerPlantes(), sensorsStore.chargerCapteurs()])
    const createdAlerts = await runAlertEngineForPlant(currentPlant.id)
    await notifyForAlerts(createdAlerts)
  } finally {
    await bleStore.deconnecter(currentSensor.deviceIdentifier, { preserveError: true })
    isSyncing.value = false
  }
}

onMounted(() => {
  void chargerContexte()
})

watch(plantId, () => {
  void chargerContexte()
})
</script>

<style scoped>
.feedback {
  display: block;
  margin: 0.75rem 1rem 0;
}

.plant-summary {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.plant-icon {
  font-size: 2rem;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  border-radius: 999px;
  padding: 0.5rem;
}

.plant-summary__content h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.plant-summary__content p {
  margin: 0.3rem 0 0;
  color: var(--ion-color-medium-shade);
}

.plant-summary__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.55rem;
}

.detail-card {
  margin: 0 1rem 0.9rem;
  border-radius: 18px;
}

.detail-card ion-card-content {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.detail-text,
.detail-empty {
  margin: 0;
  color: var(--ion-color-medium-shade);
}

.detail-score {
  margin: 0;
  font-size: 0.84rem;
  color: var(--ion-color-medium-shade);
}

.metrics-grid,
.sensor-grid {
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
}

.charts-grid {
  margin-top: 0.85rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.65rem;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
