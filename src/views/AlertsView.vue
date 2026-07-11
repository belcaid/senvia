<template>
  <ion-page class="alerts-page">
    <ion-header>
      <ion-toolbar>
        <ion-title>Alertes</ion-title>
        <ion-buttons slot="end">
          <ion-button
            v-if="nombreNonLues > 0"
            fill="clear"
            size="small"
            class="alerts-mark-read-btn"
            @click="marquerToutesLues"
          >
            Tout lire
          </ion-button>
          <ion-button
            v-if="nombreHistoriqueEffacable > 0"
            fill="clear"
            size="small"
            class="alerts-clear-btn"
            @click="confirmerSuppressionHistorique"
          >
            Effacer lu
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="alerts-filters senvia-reveal">
        <button
          v-for="filtre in filtresCycle"
          :key="filtre.value"
          type="button"
          class="alerts-chip"
          :class="{ 'alerts-chip--active': cycleSelectionne === filtre.value }"
          :aria-pressed="cycleSelectionne === filtre.value"
          @click="cycleSelectionne = filtre.value"
        >
          {{ filtre.label }}
          <span class="alerts-chip__count">{{ filtre.count }}</span>
        </button>
      </div>

      <div v-if="filtresSeveriteVisibles.length > 1" class="alerts-filters alerts-filters--sub senvia-reveal">
        <button
          v-for="filtre in filtresSeveriteVisibles"
          :key="filtre.value"
          type="button"
          class="alerts-chip alerts-chip--sm"
          :class="{ 'alerts-chip--active': severiteSelectionnee === filtre.value }"
          :aria-pressed="severiteSelectionnee === filtre.value"
          @click="severiteSelectionnee = filtre.value"
        >
          <span
            v-if="filtre.value !== 'all'"
            class="alerts-chip__dot"
            :class="`alerts-chip__dot--${filtre.value}`"
          />
          {{ filtre.label }}
          <span class="alerts-chip__count">{{ filtre.count }}</span>
        </button>
      </div>

      <ion-note v-if="alertsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ alertsStore.erreur }}
      </ion-note>

      <div v-if="alertsStore.estChargement" class="senvia-loading-container senvia-reveal">
        <ion-spinner name="crescent" />
        <span>Chargement des alertes...</span>
      </div>

      <ion-list v-else-if="alertesFiltrees.length > 0" class="alerts-list senvia-reveal">
        <ion-item-sliding
          v-for="alerte in alertesFiltrees"
          :key="alerte.id"
          :ref="(el: unknown) => setSliderRef(alerte.id, el)"
        >
          <ion-item
            button
            detail
            :class="{
              'alert-item--unread': !alerte.isRead,
              'alert-item--resolved': alerte.resolvedAt !== null,
            }"
            lines="none"
            @click="ouvrirAlerte(alerte)"
          >
            <ion-icon
              slot="start"
              class="alert-severity-icon"
              :class="`alert-severity-icon--${alerte.severity}`"
              :icon="getSeverityIcon(alerte.severity)"
            />

            <ion-label>
              <div class="alert-title-row">
                <div class="alert-title-row__left">
                  <span v-if="!alerte.isRead" class="alert-unread-dot" aria-label="Non lue" />
                  <h2>{{ alerte.title }}</h2>
                </div>
                <ion-chip :color="getSeverityColor(alerte.severity)" class="alert-severity-chip">
                  <ion-label>{{ getSeverityLabel(alerte.severity) }}</ion-label>
                </ion-chip>
              </div>

              <p class="alert-message">{{ alerte.message }}</p>
              <p class="alert-meta">
                {{ getPlantName(alerte.plantId) }} · {{ formatDateTime(alerte.createdAt) }}
              </p>
              <p v-if="alerte.resolvedAt" class="alert-meta">
                Resolue {{ formatDateTime(alerte.resolvedAt) }}
              </p>
            </ion-label>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option
              v-if="!alerte.isRead"
              color="primary"
              @click="marquerLue(alerte)"
            >
              <ion-icon slot="icon-only" :icon="checkmarkOutline" />
            </ion-item-option>
            <ion-item-option
              color="danger"
              @click="supprimerAlerte(alerte)"
            >
              <ion-icon slot="icon-only" :icon="trashOutline" />
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
      </ion-list>

      <screen-placeholder
        class="senvia-reveal"
        v-else
        :title="cycleSelectionne === 'active' ? 'Aucune alerte en cours' : 'Historique vide'"
        :subtitle="severiteSelectionnee === 'all' ? 'Tout est en ordre' : 'Aucune alerte pour cette severite'"
        description="Les alertes sont mises a jour au demarrage, apres synchronisation et au retour dans l'application."
      >
        <template #actions>
          <ion-button
            v-if="severiteSelectionnee !== 'all'"
            fill="outline"
            @click="severiteSelectionnee = 'all'"
          >
            Afficher toutes les severites
          </ion-button>
        </template>
      </screen-placeholder>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  alertController,
  onIonViewWillEnter,
} from '@ionic/vue'
import {
  alertCircleOutline,
  checkmarkOutline,
  informationCircleOutline,
  trashOutline,
  warningOutline,
} from 'ionicons/icons'
import { useRouter } from 'vue-router'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
import { useGsapReveal } from '@/composables/use-gsap-reveal'
import { showErrorFeedback, showInfoFeedback } from '@/services/ux-feedback.service'
import { useAlertsStore } from '@/stores/alerts.store'
import { usePlantsStore } from '@/stores/plants.store'
import type { Alert, AlertSeverity } from '@/types/alert.types'
import { formatDateTime } from '@/utils/date.util'

type AlertCycleFilter = 'active' | 'resolved'
type SeveriteFilter = AlertSeverity | 'all'

const router = useRouter()
const alertsStore = useAlertsStore()
const plantsStore = usePlantsStore()

const cycleSelectionne = ref<AlertCycleFilter>('active')
const severiteSelectionnee = ref<SeveriteFilter>('all')

const sliderRefs = new Map<string, InstanceType<typeof IonItemSliding> | null>()

const setSliderRef = (id: string, el: unknown): void => {
  sliderRefs.set(id, (el as InstanceType<typeof IonItemSliding>) ?? null)
}

const nombreActives = computed(
  () => alertsStore.alertes.filter((alerte) => alerte.resolvedAt === null).length,
)
const nombreResolues = computed(
  () => alertsStore.alertes.filter((alerte) => alerte.resolvedAt !== null).length,
)
const nombreNonLues = computed(
  () => alertsStore.alertes.filter((alerte) => !alerte.isRead).length,
)
const nombreHistoriqueEffacable = computed(
  () => alertsStore.alertes.filter((alerte) => alerte.resolvedAt !== null && alerte.isRead).length,
)

const filtresCycle = computed(() => [
  { value: 'active' as AlertCycleFilter, label: 'En cours', count: nombreActives.value },
  { value: 'resolved' as AlertCycleFilter, label: 'Historique', count: nombreResolues.value },
])

const alertesDuCycle = computed(() =>
  alertsStore.alertes.filter((alerte) =>
    cycleSelectionne.value === 'active' ? alerte.resolvedAt === null : alerte.resolvedAt !== null,
  ),
)

const filtresSeveriteVisibles = computed<Array<{ value: SeveriteFilter; label: string; count: number }>>(() => {
  const filters: Array<{ value: SeveriteFilter; label: string; count: number }> = [
    { value: 'all', label: 'Toutes', count: alertesDuCycle.value.length },
    {
      value: 'critical',
      label: 'Critiques',
      count: alertesDuCycle.value.filter((a) => a.severity === 'critical').length,
    },
    {
      value: 'warning',
      label: 'Avertissements',
      count: alertesDuCycle.value.filter((a) => a.severity === 'warning').length,
    },
    {
      value: 'info',
      label: 'Infos',
      count: alertesDuCycle.value.filter((a) => a.severity === 'info').length,
    },
  ]

  return filters.filter((f) => f.value === 'all' || f.count > 0 || f.value === severiteSelectionnee.value)
})

const alertesFiltrees = computed(() => {
  if (severiteSelectionnee.value === 'all') {
    return alertesDuCycle.value
  }

  return alertesDuCycle.value.filter((alerte) => alerte.severity === severiteSelectionnee.value)
})

const getSeverityLabel = (severity: AlertSeverity): string => {
  if (severity === 'critical') return 'Critique'
  if (severity === 'warning') return 'Avertissement'
  return 'Info'
}

const getSeverityColor = (severity: AlertSeverity): 'danger' | 'warning' | 'medium' => {
  if (severity === 'critical') return 'danger'
  if (severity === 'warning') return 'warning'
  return 'medium'
}

const getSeverityIcon = (severity: AlertSeverity): string => {
  if (severity === 'critical') return alertCircleOutline
  if (severity === 'warning') return warningOutline
  return informationCircleOutline
}

const getPlantName = (plantId: string): string => {
  const plante = plantsStore.getPlanteParId(plantId)
  return plante?.name ?? 'Plante inconnue'
}

const marquerToutesLues = async (): Promise<void> => {
  const success = await alertsStore.marquerToutesLues()

  if (!success) {
    await showErrorFeedback('Impossible de marquer toutes les alertes comme lues.')
    return
  }

  await showInfoFeedback('Toutes les alertes sont marquees comme lues.')
}

const confirmerSuppressionHistorique = async (): Promise<void> => {
  const confirmation = await alertController.create({
    header: "Effacer l'historique lu",
    message: `Supprimer ${nombreHistoriqueEffacable.value} alerte${nombreHistoriqueEffacable.value > 1 ? 's' : ''} resolue${nombreHistoriqueEffacable.value > 1 ? 's' : ''} et lue${nombreHistoriqueEffacable.value > 1 ? 's' : ''} ?`,
    buttons: [
      { text: 'Annuler', role: 'cancel' },
      { text: 'Effacer', role: 'confirm', cssClass: 'alert-confirm-danger' },
    ],
  })

  await confirmation.present()
  const { role } = await confirmation.onDidDismiss()

  if (role !== 'confirm') return

  const success = await alertsStore.supprimerHistoriqueLu()

  if (!success) {
    await showErrorFeedback("Impossible d'effacer l'historique.")
    return
  }

  await showInfoFeedback('Historique lu efface.')
}

const marquerLue = async (alerte: Alert): Promise<void> => {
  const slider = sliderRefs.get(alerte.id)
  await slider?.close()

  const updated = await alertsStore.marquerAlerteLue(alerte.id, true)

  if (updated === null) {
    await showErrorFeedback("Impossible de marquer l'alerte comme lue.")
  }
}

const supprimerAlerte = async (alerte: Alert): Promise<void> => {
  const slider = sliderRefs.get(alerte.id)
  await slider?.close()

  const success = await alertsStore.supprimerAlerte(alerte.id)

  if (!success) {
    await showErrorFeedback("Impossible de supprimer l'alerte.")
  }
}

const ouvrirAlerte = async (alerte: Alert): Promise<void> => {
  if (!alerte.isRead) {
    const updated = await alertsStore.marquerAlerteLue(alerte.id, true)

    if (updated === null) {
      await showErrorFeedback("Impossible de marquer l'alerte comme lue.")
      return
    }
  }

  await router.push('/plants/' + alerte.plantId)
}

const chargerAlertes = async (): Promise<void> => {
  await Promise.all([alertsStore.chargerAlertes(), plantsStore.chargerPlantes()])
}

onIonViewWillEnter(() => {
  void chargerAlertes()
})

useGsapReveal({
  rootSelector: '.alerts-page',
  itemSelector: '.senvia-reveal',
})
</script>

<style scoped>
.alerts-filters {
  display: flex;
  gap: 0.45rem;
  overflow-x: auto;
  padding: 0.1rem 0 0.55rem;
  scrollbar-width: none;
  margin-bottom: 0.1rem;
}

.alerts-filters--sub {
  padding-top: 0;
  padding-bottom: 0.65rem;
  margin-bottom: 0.25rem;
}

.alerts-filters::-webkit-scrollbar {
  display: none;
}

.alerts-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 2.4rem;
  padding: 0.4rem 1rem;
  border: 1.5px solid var(--senvia-card-border);
  border-radius: 999px;
  background: var(--senvia-surface);
  color: var(--senvia-text-muted);
  font: inherit;
  font-size: 0.86rem;
  font-weight: 560;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.alerts-chip--sm {
  min-height: 2rem;
  padding: 0.3rem 0.8rem;
  font-size: 0.78rem;
}

.alerts-chip__count {
  min-width: 1.35rem;
  padding: 0.08rem 0.35rem;
  border-radius: 999px;
  background: rgba(var(--ion-color-medium-rgb), 0.13);
  color: inherit;
  font-size: 0.72rem;
  text-align: center;
}

.alerts-chip__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.alerts-chip__dot--critical {
  background: var(--ion-color-danger);
}

.alerts-chip__dot--warning {
  background: var(--ion-color-warning);
}

.alerts-chip__dot--info {
  background: var(--ion-color-medium);
}

.alerts-chip--active {
  border-color: rgba(var(--ion-color-primary-rgb), 0.55);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  color: var(--ion-text-color);
  font-weight: 650;
}

.alerts-mark-read-btn {
  --color: var(--ion-color-primary);
  font-size: 0.8rem;
  font-weight: 600;
}

.alerts-clear-btn {
  --color: var(--ion-color-danger);
  font-size: 0.8rem;
  font-weight: 600;
}

.alert-title-row {
  display: flex;
  gap: 0.65rem;
  justify-content: space-between;
  align-items: flex-start;
}

.alert-title-row__left {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  min-width: 0;
  flex: 1;
}

.alert-title-row h2 {
  margin: 0;
  font-size: 1rem;
  white-space: normal;
}

.alert-unread-dot {
  width: 0.5rem;
  height: 0.5rem;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--ion-color-primary);
  box-shadow: 0 0 0 4px rgba(var(--ion-color-primary-rgb), 0.12);
}

.alert-severity-chip {
  flex: 0 0 auto;
  height: 1.65rem;
  margin: 0;
  font-size: 0.72rem;
}

.alert-message,
.alert-meta {
  color: var(--senvia-text-muted);
}

.alert-message {
  margin-top: 0.55rem;
  white-space: normal;
}

.alert-meta {
  font-size: 0.78rem;
}

.alert-severity-icon {
  align-self: flex-start;
  margin-top: 1.15rem;
  font-size: 1.2rem;
}

.alert-severity-icon--critical {
  color: var(--ion-color-danger);
}

.alert-severity-icon--warning {
  color: var(--ion-color-warning);
}

.alert-severity-icon--info {
  color: var(--ion-color-medium);
}

.alert-item--unread {
  --background: rgba(var(--ion-color-primary-rgb), 0.06);
}

.alert-item--resolved {
  opacity: 0.88;
}

.alerts-list {
  background: transparent;
  padding: 0;
}

:deep(.alerts-list ion-item) {
  --padding-start: 0.95rem;
  --padding-top: 0.85rem;
  --padding-bottom: 0.85rem;
  --inner-padding-end: 0.8rem;
  --detail-icon-color: var(--senvia-text-muted);
  --detail-icon-opacity: 0.8;
  --min-height: 0;
  border: 1px solid var(--senvia-card-border);
  border-radius: 16px;
  margin-bottom: 0.7rem;
  overflow: hidden;
}

:deep(.alerts-list ion-item-sliding) {
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 0.7rem;
}

:deep(.alerts-list ion-item-sliding ion-item) {
  margin-bottom: 0;
  border-radius: 0;
}

:global(.alert-confirm-danger) {
  color: var(--ion-color-danger) !important;
}

@media (max-width: 680px) {
  .alert-title-row h2 {
    font-size: 0.95rem;
  }

  :deep(.alerts-list ion-item) {
    --padding-start: 0.8rem;
    --padding-top: 0.8rem;
    --padding-bottom: 0.8rem;
    --inner-padding-end: 0.55rem;
  }
}
</style>
