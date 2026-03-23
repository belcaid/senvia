<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/plants/new">
            <ion-icon slot="start" :icon="addOutline" />
            Ajouter plante
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-searchbar
        v-model="rechercheNom"
        placeholder="Rechercher une plante"
        show-clear-button="focus"
      />

      <div class="filters-grid">
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
            <ion-select-option value="healthy">En sante</ion-select-option>
            <ion-select-option value="warning">A surveiller</ion-select-option>
            <ion-select-option value="critical">Critique</ion-select-option>
            <ion-select-option value="stale_data">Donnees anciennes</ion-select-option>
            <ion-select-option value="unknown">Inconnu</ion-select-option>
          </ion-select>
        </ion-item>
      </div>

      <ion-note class="results-count" color="medium">
        {{ plantesFiltrees.length }} plante{{ plantesFiltrees.length > 1 ? 's' : '' }}
      </ion-note>

      <ion-note v-if="plantsStore.erreur" class="feedback" color="danger">{{ plantsStore.erreur }}</ion-note>
      <ion-note v-if="measurementsStore.erreur" class="feedback" color="danger">
        {{ measurementsStore.erreur }}
      </ion-note>
      <ion-note v-if="settingsStore.erreur" class="feedback" color="danger">{{ settingsStore.erreur }}</ion-note>
      <ion-note v-if="thresholdProfilesStore.erreur" class="feedback" color="danger">
        {{ thresholdProfilesStore.erreur }}
      </ion-note>

      <div v-if="plantsStore.estChargement" class="loading-container">
        <ion-spinner name="crescent" />
      </div>

      <div v-else-if="plantesFiltrees.length > 0" class="cards-grid">
        <plant-card
          v-for="plante in plantesFiltrees"
          :key="plante.id"
          :plant="plante"
          :measurement="measurementsStore.derniereMesureParPlante[plante.id] ?? null"
          :status-override="statusByPlantId[plante.id] ?? null"
          @open="ouvrirPlante"
          @toggle-favorite="basculerFavori"
        />
      </div>

      <screen-placeholder
        v-else
        title="Aucune plante"
        subtitle="Ajoute ta premiere plante"
        description="Utilise recherche et filtres pour retrouver rapidement tes plantes."
      >
        <template #actions>
          <ion-button router-link="/plants/new">Ajouter plante</ion-button>
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
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
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
import { addOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import PlantCard from '@/components/PlantCard.vue'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
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

const ouvrirPlante = async (plantId: string): Promise<void> => {
  await router.push(`/plants/${plantId}`)
}

const basculerFavori = async (plantId: string, isCurrentlyFavorite: boolean): Promise<void> => {
  await plantsStore.marquerFavori(plantId, !isCurrentlyFavorite)
}

onIonViewWillEnter(() => {
  void chargerDashboard()
})
</script>

<style scoped>
.filters-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.filters-grid ion-item {
  border-radius: 14px;
  overflow: hidden;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
  gap: 0.9rem;
  align-items: start;
}

.loading-container {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.feedback {
  display: block;
  margin: 0.3rem 0.2rem;
}

.results-count {
  display: block;
  margin: 0.55rem 0.2rem;
}

@media (max-width: 680px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
}
</style>
