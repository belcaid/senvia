<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Alertes</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="filters-grid">
        <ion-item>
          <ion-select
            v-model="etatSelectionne"
            interface="popover"
            label="Etat"
            label-placement="stacked"
          >
            <ion-select-option value="all">Toutes</ion-select-option>
            <ion-select-option value="unread">Non lues</ion-select-option>
            <ion-select-option value="read">Lues</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-select
            v-model="severiteSelectionnee"
            interface="popover"
            label="Severite"
            label-placement="stacked"
          >
            <ion-select-option value="all">Toutes</ion-select-option>
            <ion-select-option value="info">Info</ion-select-option>
            <ion-select-option value="warning">Warning</ion-select-option>
            <ion-select-option value="critical">Critique</ion-select-option>
          </ion-select>
        </ion-item>
      </div>

      <ion-note class="results-count" color="medium">
        {{ alertesFiltrees.length }} alerte{{ alertesFiltrees.length > 1 ? 's' : '' }}
      </ion-note>

      <ion-note v-if="alertsStore.erreur" class="feedback" color="danger">{{ alertsStore.erreur }}</ion-note>

      <div v-if="alertsStore.estChargement" class="loading-container">
        <ion-spinner name="crescent" />
      </div>

      <ion-list v-else-if="alertesFiltrees.length > 0" inset>
        <ion-item
          v-for="alerte in alertesFiltrees"
          :key="alerte.id"
          :class="{ 'alert-item--unread': !alerte.isRead }"
          lines="full"
        >
          <ion-label>
            <div class="alert-title-row">
              <h2>{{ alerte.title }}</h2>
              <ion-chip :color="getSeverityColor(alerte.severity)">
                <ion-label>{{ getSeverityLabel(alerte.severity) }}</ion-label>
              </ion-chip>
            </div>
            <p>{{ alerte.message }}</p>
            <p>
              Plante: {{ getPlantName(alerte.plantId) }} · {{ formatDateTime(alerte.createdAt) }}
            </p>
          </ion-label>

          <div class="alert-actions">
            <ion-button
              fill="outline"
              size="small"
              @click="marquerEtat(alerte.id, !alerte.isRead)"
            >
              {{ alerte.isRead ? 'Non lue' : 'Lue' }}
            </ion-button>
            <ion-button
              fill="clear"
              size="small"
              @click="ouvrirPlante(alerte.plantId)"
            >
              Voir plante
            </ion-button>
          </div>
        </ion-item>
      </ion-list>

      <screen-placeholder
        v-else
        title="Aucune alerte"
        subtitle="Pas d'alertes pour les filtres en cours"
        description="Les alertes apparaissent apres synchronisation des mesures et analyse des seuils."
      >
        <template #actions>
          <ion-button router-link="/tabs/dashboard">Retour Dashboard</ion-button>
        </template>
      </screen-placeholder>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonButton,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
import { runAlertEngineForAllPlants } from '@/services/alert-engine.service'
import { useAlertsStore } from '@/stores/alerts.store'
import { usePlantsStore } from '@/stores/plants.store'
import type { AlertSeverity } from '@/types/alert.types'
import { formatDateTime } from '@/utils/date.util'

type EtatFilter = 'all' | 'unread' | 'read'
type SeveriteFilter = AlertSeverity | 'all'

const router = useRouter()
const alertsStore = useAlertsStore()
const plantsStore = usePlantsStore()

const etatSelectionne = ref<EtatFilter>('all')
const severiteSelectionnee = ref<SeveriteFilter>('all')

const alertesFiltrees = computed(() => {
  return alertsStore.alertes.filter((alerte) => {
    const matchEtat =
      etatSelectionne.value === 'all' ||
      (etatSelectionne.value === 'read' && alerte.isRead) ||
      (etatSelectionne.value === 'unread' && !alerte.isRead)

    const matchSeverite =
      severiteSelectionnee.value === 'all' || alerte.severity === severiteSelectionnee.value

    return matchEtat && matchSeverite
  })
})

const getSeverityLabel = (severity: AlertSeverity): string => {
  if (severity === 'critical') {
    return 'Critique'
  }

  if (severity === 'warning') {
    return 'Warning'
  }

  return 'Info'
}

const getSeverityColor = (severity: AlertSeverity): 'danger' | 'warning' | 'medium' => {
  if (severity === 'critical') {
    return 'danger'
  }

  if (severity === 'warning') {
    return 'warning'
  }

  return 'medium'
}

const getPlantName = (plantId: string): string => {
  const plante = plantsStore.getPlanteParId(plantId)
  return plante?.name ?? 'Plante inconnue'
}

const marquerEtat = async (alertId: string, isRead: boolean): Promise<void> => {
  await alertsStore.marquerAlerteLue(alertId, isRead)
}

const ouvrirPlante = async (plantId: string): Promise<void> => {
  await router.push('/plants/' + plantId)
}

const chargerAlertes = async (): Promise<void> => {
  await runAlertEngineForAllPlants()
  await Promise.all([alertsStore.chargerAlertes(), plantsStore.chargerPlantes()])
}

onIonViewWillEnter(() => {
  void chargerAlertes()
})
</script>

<style scoped>
.filters-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.results-count {
  display: block;
  margin: 0.55rem 0.2rem;
}

.feedback {
  display: block;
  margin: 0.3rem 0.2rem;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.alert-title-row {
  display: flex;
  gap: 0.4rem;
  justify-content: space-between;
  align-items: center;
}

.alert-title-row h2 {
  margin: 0;
}

.alert-actions {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  align-items: flex-end;
}

.alert-item--unread {
  --background: rgba(var(--ion-color-primary-rgb), 0.06);
}

:deep(ion-list) {
  background: transparent;
}

:deep(ion-list ion-item) {
  --inner-padding-start: 0.8rem;
  --inner-padding-end: 0.7rem;
  border: 1px solid var(--senvia-card-border);
  border-radius: 14px;
  margin-bottom: 0.6rem;
}

@media (max-width: 680px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
}
</style>
