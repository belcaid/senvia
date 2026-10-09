<template>
  <ion-page class="favorites-page">
    <ion-content class="ion-padding">
      <section class="senvia-page-heading senvia-reveal">
        <h1>Mes favoris</h1>
        <p>{{ favorisSubtitle }}</p>
      </section>

      <ion-note v-if="plantsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">{{ plantsStore.erreur }}</ion-note>
      <ion-note v-if="measurementsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ measurementsStore.erreur }}
      </ion-note>
      <ion-note v-if="settingsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">{{ settingsStore.erreur }}</ion-note>
      <ion-note v-if="thresholdProfilesStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ thresholdProfilesStore.erreur }}
      </ion-note>

      <div v-if="plantsStore.estChargement" class="senvia-loading-container senvia-reveal">
        <ion-spinner name="crescent" />
        <span>Chargement des favoris...</span>
      </div>

      <div v-else-if="favoris.length > 0" class="senvia-cards-grid">
        <plant-card
          v-for="plante in favoris"
          :key="plante.id"
          :plant="plante"
          :measurement="measurementsStore.derniereMesureParPlante[plante.id] ?? null"
          :status-override="statusByPlantId[plante.id] ?? null"
          @open="ouvrirPlante"
          @toggle-favorite="retirerFavori"
        />
      </div>

      <screen-placeholder
        class="senvia-reveal"
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
  IonNote,
  IonPage,
  IonSpinner,
  onIonViewWillEnter,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import PlantCard from '@/components/PlantCard.vue'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
import { useGsapReveal } from '@/composables/use-gsap-reveal'
import { showErrorFeedback, showInfoFeedback } from '@/services/ux-feedback.service'
import { useMeasurementsStore } from '@/stores/measurements.store'
import { usePlantsStore } from '@/stores/plants.store'
import { useSettingsStore } from '@/stores/settings.store'
import { useThresholdProfilesStore } from '@/stores/threshold-profiles.store'
import { isMeasurementStale } from '@/utils/measurement-freshness.util'
import { evaluatePlantHealth } from '@/utils/plant-health.util'
import type { PlantStatus } from '@/types/plant.types'

const router = useRouter()
const plantsStore = usePlantsStore()
const measurementsStore = useMeasurementsStore()
const settingsStore = useSettingsStore()
const thresholdProfilesStore = useThresholdProfilesStore()

const favoris = computed(() => plantsStore.favoris)
const favorisSubtitle = computed(() => favoris.value.length === 0
  ? 'Retrouvez ici les plantes que vous souhaitez suivre en priorité.'
  : `${favoris.value.length} plante${favoris.value.length > 1 ? 's' : ''} suivie${favoris.value.length > 1 ? 's' : ''} en priorité.`)
const statusByPlantId = computed<Record<string, PlantStatus>>(() => {
  const staleThreshold = settingsStore.parametres.staleDataThresholdMinutes

  return favoris.value.reduce<Record<string, PlantStatus>>((acc, plante) => {
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

const chargerFavoris = async (): Promise<void> => {
  await Promise.all([
    plantsStore.chargerPlantes(),
    settingsStore.chargerParametres(),
    thresholdProfilesStore.chargerProfils({ ensureDefaults: true }),
  ])

  const plantIds = plantsStore.favoris.map((plante) => plante.id)
  await measurementsStore.chargerDernieresMesures(plantIds)
  await plantsStore.synchroniserStatutsRecalcules(statusByPlantId.value)
}

const retirerFavori = async (plantId: string, isCurrentlyFavorite: boolean): Promise<void> => {
  if (!isCurrentlyFavorite) {
    return
  }

  const updated = await plantsStore.marquerFavori(plantId, false)

  if (updated === null) {
    await showErrorFeedback("Impossible de retirer ce favori.")
    return
  }

  await showInfoFeedback('Retirée des favoris.')
}

const ouvrirPlante = async (plantId: string): Promise<void> => {
  await router.push(`/plants/${plantId}`)
}

onIonViewWillEnter(() => {
  void chargerFavoris()
})

useGsapReveal({
  rootSelector: '.favorites-page',
  itemSelector: '.senvia-reveal',
})
</script>
