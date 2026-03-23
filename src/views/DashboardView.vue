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
            <ion-select-option value="healthy">Saine</ion-select-option>
            <ion-select-option value="warning">Surveillance</ion-select-option>
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

      <div v-if="plantsStore.estChargement" class="loading-container">
        <ion-spinner name="crescent" />
      </div>

      <div v-else-if="plantesFiltrees.length > 0" class="cards-grid">
        <plant-card
          v-for="plante in plantesFiltrees"
          :key="plante.id"
          :plant="plante"
          :measurement="measurementsStore.derniereMesureParPlante[plante.id] ?? null"
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
import type { PlantCategory, PlantStatus } from '@/types/plant.types'
import { PLANT_CATEGORY_OPTIONS } from '@/utils/plant-options.util'

type CategoryFilter = PlantCategory | 'all'
type StatusFilter = PlantStatus | 'all'

const router = useRouter()
const plantsStore = usePlantsStore()
const measurementsStore = useMeasurementsStore()

const rechercheNom = ref('')
const categorieSelectionnee = ref<CategoryFilter>('all')
const statusSelectionne = ref<StatusFilter>('all')

const plantesFiltrees = computed(() => {
  const recherche = rechercheNom.value.trim().toLowerCase()

  return plantsStore.plantes.filter((plante) => {
    const matchCategorie =
      categorieSelectionnee.value === 'all' || plante.category === categorieSelectionnee.value
    const matchStatut = statusSelectionne.value === 'all' || plante.status === statusSelectionne.value
    const matchNom = recherche === '' || plante.name.toLowerCase().includes(recherche)

    return matchCategorie && matchStatut && matchNom
  })
})

const chargerDashboard = async (): Promise<void> => {
  await plantsStore.chargerPlantes()

  const plantIds = plantsStore.plantes.map((plante) => plante.id)
  await measurementsStore.chargerDernieresMesures(plantIds)
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

.cards-grid {
  display: grid;
  gap: 0.9rem;
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
