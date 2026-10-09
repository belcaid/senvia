<template>
  <ion-page class="dashboard-page">
    <ion-content class="ion-padding">
      <section class="dashboard-hero senvia-reveal">
        <div class="dashboard-hero__title-wrap">
          <h1>Mes plantes</h1>
          <p>{{ surveillanceSubtitle }}</p>
        </div>

        <div class="dashboard-hero__actions">
          <ion-searchbar
            class="dashboard-search"
            v-model="rechercheNom"
            placeholder="Rechercher..."
            show-clear-button="focus"
          />
          <ion-button
            class="dashboard-icon-action"
            fill="clear"
            aria-label="Ouvrir les filtres"
            title="Filtres"
            @click="isFiltersModalOpen = true"
          >
            <ion-icon aria-hidden="true" :icon="optionsOutline" />
            <ion-badge v-if="activeFilterCount > 0" color="primary">{{ activeFilterCount }}</ion-badge>
          </ion-button>
          <ion-button
            v-if="activeFilterCount > 0"
            class="dashboard-icon-action dashboard-icon-action--ghost"
            fill="clear"
            aria-label="Réinitialiser les filtres"
            title="Réinitialiser"
            @click="reinitialiserFiltres"
          >
            <ion-icon aria-hidden="true" :icon="closeCircleOutline" />
          </ion-button>
          <ion-button class="dashboard-add-button" @click="ouvrirAjoutPlante">
            <ion-icon slot="start" :icon="addOutline" />
            Ajouter
          </ion-button>
        </div>
      </section>

      <ion-note v-if="plantsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ plantsStore.erreur }}
      </ion-note>
      <ion-note v-if="measurementsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ measurementsStore.erreur }}
      </ion-note>
      <ion-note v-if="settingsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ settingsStore.erreur }}
      </ion-note>
      <ion-note v-if="thresholdProfilesStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ thresholdProfilesStore.erreur }}
      </ion-note>

      <div v-if="plantsStore.estChargement" class="senvia-loading-container senvia-reveal">
        <ion-spinner name="crescent" />
        <span>Chargement des plantes...</span>
      </div>

      <div v-else class="senvia-cards-grid dashboard-cards-grid">
        <plant-card
          v-for="plante in plantesFiltrees"
          :key="plante.id"
          :plant="plante"
          :measurement="measurementsStore.derniereMesureParPlante[plante.id] ?? null"
          :status-override="statusByPlantId[plante.id] ?? null"
          @open="ouvrirPlante"
          @toggle-favorite="basculerFavori"
        />

        <button type="button" class="new-plant-card senvia-reveal" @click="ouvrirAjoutPlante">
          <span class="new-plant-card__icon">+</span>
          <span class="new-plant-card__label">Nouvelle plante</span>
        </button>
      </div>

      <ion-note v-if="hasNoFilteredResult" class="dashboard-empty-filter senvia-reveal" color="medium">
        Aucune plante ne correspond aux filtres actifs.
      </ion-note>
    </ion-content>

    <ion-modal
      :is-open="isFiltersModalOpen"
      css-class="dashboard-filters-modal"
      @didDismiss="isFiltersModalOpen = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Filtres</ion-title>
          <ion-buttons slot="end">
            <ion-button
              class="filters-modal-close"
              fill="clear"
              aria-label="Fermer les filtres"
              @click="isFiltersModalOpen = false"
            >
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="dashboard-filters-content ion-padding">
        <ion-list class="senvia-form-list filters-modal-list">
          <ion-item>
            <ion-select
              v-model="categorieSelectionnee"
              interface="popover"
              label="Categorie"
              label-placement="stacked"
            >
              <ion-select-option value="all">Toutes</ion-select-option>
              <ion-select-option
                v-for="option in PLANT_CATEGORY_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-select
              v-model="statusSelectionne"
              interface="popover"
              label="Statut"
              label-placement="stacked"
            >
              <ion-select-option value="all">Tous</ion-select-option>
              <ion-select-option value="healthy">En santé</ion-select-option>
              <ion-select-option value="warning">À surveiller</ion-select-option>
              <ion-select-option value="critical">Critique</ion-select-option>
              <ion-select-option value="stale_data">Données anciennes</ion-select-option>
              <ion-select-option value="unknown">Inconnu</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <div class="filters-modal-actions">
          <ion-button fill="clear" @click="reinitialiserFiltres">Réinitialiser</ion-button>
          <ion-button @click="isFiltersModalOpen = false">Appliquer</ion-button>
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonModal,
  IonNote,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { addOutline, closeCircleOutline, closeOutline, optionsOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import PlantCard from '@/components/PlantCard.vue'
import { useGsapReveal } from '@/composables/use-gsap-reveal'
import { showErrorFeedback, showInfoFeedback } from '@/services/ux-feedback.service'
import { useMeasurementsStore } from '@/stores/measurements.store'
import { usePlantsStore } from '@/stores/plants.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useThresholdProfilesStore } from '@/stores/threshold-profiles.store'
import { isMeasurementStale } from '@/utils/measurement-freshness.util'
import { evaluatePlantHealth } from '@/utils/plant-health.util'
import type { PlantCategory, PlantStatus } from '@/types/plant.types'
import { PLANT_CATEGORY_OPTIONS } from '@/utils/plant-options.util'

type CategoryFilter = PlantCategory | 'all'
type StatusFilter = PlantStatus | 'all'

const router = useRouter()
const plantsStore = usePlantsStore()
const measurementsStore = useMeasurementsStore()
const settingsStore = useSettingsStore()
const thresholdProfilesStore = useThresholdProfilesStore()

const rechercheNom = ref('')
const categorieSelectionnee = ref<CategoryFilter>('all')
const statusSelectionne = ref<StatusFilter>('all')
const isFiltersModalOpen = ref(false)

const statusByPlantId = computed<Record<string, PlantStatus>>(() => {
  const staleThreshold = settingsStore.parametres.staleDataThresholdMinutes

  return plantsStore.plantes.reduce<Record<string, PlantStatus>>((acc, plante) => {
    const mesure = measurementsStore.derniereMesureParPlante[plante.id] ?? null
    const profil = thresholdProfilesStore.getProfilParId(plante.thresholdProfileId)

    const assessment = evaluatePlantHealth({
      measurement: mesure,
      thresholdProfile: profil,
      isStale: isMeasurementStale(mesure?.measuredAt, staleThreshold),
      staleThresholdMinutes: staleThreshold,
    })

    acc[plante.id] = assessment.status
    return acc
  }, {})
})

const plantesFiltrees = computed(() => {
  const recherche = rechercheNom.value.trim().toLowerCase()

  return plantsStore.plantes.filter((plante) => {
    const matchCategorie =
      categorieSelectionnee.value === 'all' || plante.category === categorieSelectionnee.value
    const statutEvalue = statusByPlantId.value[plante.id] ?? plante.status
    const matchStatut = statusSelectionne.value === 'all' || statutEvalue === statusSelectionne.value
    const matchNom = recherche === '' || plante.name.toLowerCase().includes(recherche)

    return matchCategorie && matchStatut && matchNom
  })
})

const activeFilterCount = computed(() => {
  let count = 0

  if (categorieSelectionnee.value !== 'all') {
    count += 1
  }

  if (statusSelectionne.value !== 'all') {
    count += 1
  }

  return count
})

const surveillanceSubtitle = computed(() => {
  const count = plantsStore.plantes.length
  const suffix = count > 1 ? 'plantes' : 'plante'
  return `Vous avez ${count} ${suffix} sous surveillance.`
})

const hasNoFilteredResult = computed(() => plantsStore.plantes.length > 0 && plantesFiltrees.value.length === 0)

const chargerDashboard = async (): Promise<void> => {
  await Promise.all([
    plantsStore.chargerPlantes(),
    settingsStore.chargerParametres(),
    thresholdProfilesStore.chargerProfils({ ensureDefaults: true }),
  ])

  const plantIds = plantsStore.plantes.map((plante) => plante.id)
  await measurementsStore.chargerDernieresMesures(plantIds)
  await plantsStore.synchroniserStatutsRecalcules(statusByPlantId.value)
}

const ouvrirAjoutPlante = async (): Promise<void> => {
  await router.push('/plants/new')
}

const ouvrirPlante = async (plantId: string): Promise<void> => {
  await router.push(`/plants/${plantId}`)
}

const basculerFavori = async (plantId: string, isCurrentlyFavorite: boolean): Promise<void> => {
  const updated = await plantsStore.marquerFavori(plantId, !isCurrentlyFavorite)

  if (updated === null) {
    await showErrorFeedback("Impossible de mettre à jour le favori.")
    return
  }

  await showInfoFeedback(updated.isFavorite ? 'Ajoutée aux favoris.' : 'Retirée des favoris.')
}

const reinitialiserFiltres = (): void => {
  rechercheNom.value = ''
  categorieSelectionnee.value = 'all'
  statusSelectionne.value = 'all'
}

onIonViewWillEnter(() => {
  void chargerDashboard()
})

useGsapReveal({
  rootSelector: '.dashboard-page',
  itemSelector: '.senvia-reveal',
})
</script>

<style scoped>
.dashboard-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 0.82rem;
}

.dashboard-hero__title-wrap h1 {
  margin: 0;
  font-size: clamp(1.4rem, 2vw, 1.8rem);
  font-weight: 720;
  letter-spacing: -0.02em;
}

.dashboard-hero__title-wrap p {
  margin: 0.2rem 0 0;
  color: var(--senvia-text-muted);
  font-size: 0.88rem;
}

.dashboard-hero__actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.dashboard-search {
  min-width: 185px;
  max-width: 240px;
  --background: var(--senvia-surface-2);
  --box-shadow: none;
  --border-radius: 14px;
  --color: var(--ion-text-color);
  --placeholder-color: var(--senvia-text-muted);
  --placeholder-opacity: 0.95;
  font-size: 0.86rem;
}

.dashboard-icon-action {
  --background: rgba(var(--ion-color-medium-rgb), 0.14);
  --color: var(--ion-text-color);
  --border-radius: 14px;
  --padding-start: 0;
  --padding-end: 0;
  width: 42px;
  min-width: 42px;
  height: 42px;
  position: relative;
}

.dashboard-icon-action ion-icon {
  font-size: 1.02rem;
}

.dashboard-icon-action ion-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 18px;
  min-height: 18px;
  font-size: 0.66rem;
  padding: 0 0.28rem;
}

.dashboard-icon-action--ghost {
  --background: rgba(var(--ion-color-danger-rgb), 0.12);
  --color: var(--ion-color-danger);
}

.dashboard-add-button {
  --background: linear-gradient(135deg, var(--ion-color-primary), #2bcf74);
  --color: #042111;
  font-size: 0.82rem;
  font-weight: 680;
}

.dashboard-cards-grid {
  grid-template-columns: 1fr;
  gap: 1rem;
  align-items: stretch;
  grid-auto-rows: 1fr;
  margin-top: 0.3rem;
}

.new-plant-card {
  border: 1px dashed var(--senvia-card-border);
  border-radius: 20px;
  min-height: 316px;
  height: 100%;
  background: rgba(var(--ion-color-primary-rgb), 0.04);
  color: var(--ion-text-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.new-plant-card__icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(var(--ion-color-medium-rgb), 0.18);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
}

.new-plant-card__label {
  font-size: 0.95rem;
  font-weight: 640;
}

.dashboard-empty-filter {
  display: block;
  margin: 0.75rem 0.25rem 0;
}

.filters-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.filters-modal-list {
  margin: 0;
}

.filters-modal-list ion-select {
  font-size: 0.9rem;
}

@media (hover: hover) and (pointer: fine) {
  .new-plant-card:hover {
    transform: translateY(-2px);
    border-color: rgba(var(--ion-color-primary-rgb), 0.38);
    background: rgba(var(--ion-color-primary-rgb), 0.08);
  }
}

@media (min-width: 760px) {
  .dashboard-cards-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .dashboard-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .dashboard-hero__actions {
    width: 100%;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .dashboard-search {
    max-width: none;
    flex: 1;
  }
}

:global(.dashboard-filters-modal) {
  --width: min(92vw, 520px);
  --height: 330px;
  --max-height: 86vh;
  --border-radius: 20px;
}

:global(.dashboard-filters-modal .filters-modal-close) {
  --color: var(--ion-text-color);
  width: 42px;
  height: 42px;
  margin-right: 0.25rem;
}

:global(.dashboard-filters-modal .filters-modal-close ion-icon) {
  font-size: 1.25rem;
}

:global(.dashboard-filters-modal ion-title) {
  font-size: 1rem;
  font-weight: 680;
}

:global(.dashboard-filters-modal ion-toolbar ion-button),
:global(.dashboard-filters-modal .filters-modal-actions ion-button) {
  font-size: 0.82rem;
}

@media (max-width: 560px) {
  :global(.dashboard-filters-modal) {
    --width: calc(100% - 1.25rem);
    --height: 350px;
    --border-radius: 18px;
  }
}
</style>
