<template>
  <ion-page class="plant-create-page">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/dashboard" />
        </ion-buttons>
        <ion-title>Ajout plante</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-note v-if="thresholdProfilesStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ thresholdProfilesStore.erreur }}
      </ion-note>
      <ion-note v-if="plantsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">{{ plantsStore.erreur }}</ion-note>

      <plant-form
        class="senvia-reveal"
        :threshold-profiles="thresholdProfilesStore.profils"
        :is-submitting="isSubmitting"
        submit-label="Ajouter la plante"
        @submit="creerPlante"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import PlantForm, { type PlantFormValues } from '@/components/PlantForm.vue'
import { useGsapReveal } from '@/composables/use-gsap-reveal'
import { showErrorFeedback, showSuccessFeedback } from '@/services/ux-feedback.service'
import { usePlantsStore } from '@/stores/plants.store'
import { useThresholdProfilesStore } from '@/stores/threshold-profiles.store'

const router = useRouter()
const plantsStore = usePlantsStore()
const thresholdProfilesStore = useThresholdProfilesStore()
const isSubmitting = ref(false)

const creerPlante = async (values: PlantFormValues): Promise<void> => {
  isSubmitting.value = true

  try {
    const fallbackProfileId = thresholdProfilesStore.profils[0]?.id ?? null
    const thresholdProfileId = values.thresholdProfileId ?? fallbackProfileId

    const plante = await plantsStore.ajouterPlante({
      name: values.nom,
      category: values.categorie,
      location: values.emplacement,
      icon: values.icone,
      isFavorite: values.estFavori,
      thresholdProfileId,
      status: 'unknown',
      sensorId: null,
    })

    if (plante !== null) {
      await showSuccessFeedback('Plante ajoutee avec succes.')
      await router.replace(`/plants/${plante.id}`)
      return
    }

    await showErrorFeedback("Impossible d'ajouter la plante.")
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  void thresholdProfilesStore.chargerProfils({ ensureDefaults: true })
})

useGsapReveal({
  rootSelector: '.plant-create-page',
  itemSelector: '.senvia-reveal',
  once: true,
})
</script>
