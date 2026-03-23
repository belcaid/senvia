<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Favoris</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-note v-if="plantsStore.erreur" class="feedback" color="danger">{{ plantsStore.erreur }}</ion-note>
      <ion-note v-if="measurementsStore.erreur" class="feedback" color="danger">
        {{ measurementsStore.erreur }}
      </ion-note>

      <ion-note class="results-count" color="medium">
        {{ favoris.length }} favori{{ favoris.length > 1 ? 's' : '' }}
      </ion-note>

      <div v-if="plantsStore.estChargement" class="loading-container">
        <ion-spinner name="crescent" />
      </div>

      <div v-else-if="favoris.length > 0" class="cards-grid">
        <plant-card
          v-for="plante in favoris"
          :key="plante.id"
          :plant="plante"
          :measurement="measurementsStore.derniereMesureParPlante[plante.id] ?? null"
          @open="ouvrirPlante"
          @toggle-favorite="retirerFavori"
        />
      </div>

      <screen-placeholder
        v-else
        title="Aucun favori"
        subtitle="Marque des plantes en favori depuis le dashboard"
        description="Tu pourras ensuite les consulter rapidement depuis cet onglet."
      >
        <template #actions>
          <ion-button router-link="/tabs/dashboard">Aller au Dashboard</ion-button>
        </template>
      </screen-placeholder>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  IonButton,
  IonContent,
  IonHeader,
  IonNote,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import PlantCard from '@/components/PlantCard.vue'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
import { useMeasurementsStore } from '@/stores/measurements.store'
import { usePlantsStore } from '@/stores/plants.store'

const router = useRouter()
const plantsStore = usePlantsStore()
const measurementsStore = useMeasurementsStore()

const favoris = computed(() => plantsStore.favoris)

const chargerFavoris = async (): Promise<void> => {
  await plantsStore.chargerPlantes()

  const plantIds = plantsStore.favoris.map((plante) => plante.id)
  await measurementsStore.chargerDernieresMesures(plantIds)
}

const retirerFavori = async (plantId: string, isCurrentlyFavorite: boolean): Promise<void> => {
  if (!isCurrentlyFavorite) {
    return
  }

  await plantsStore.marquerFavori(plantId, false)
}

const ouvrirPlante = async (plantId: string): Promise<void> => {
  await router.push(`/plants/${plantId}`)
}

onIonViewWillEnter(() => {
  void chargerFavoris()
})
</script>

<style scoped>
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
</style>
