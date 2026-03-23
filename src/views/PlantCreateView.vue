<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/dashboard" />
        </ion-buttons>
        <ion-title>Ajout plante</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-note v-if="thresholdProfilesStore.erreur" class="feedback" color="danger">
        {{ thresholdProfilesStore.erreur }}
      </ion-note>
      <ion-note v-if="plantsStore.erreur" class="feedback" color="danger">{{ plantsStore.erreur }}</ion-note>

      <plant-form
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
import { usePlantsStore } from '@/stores/plants.store'
import { useThresholdProfilesStore } from '@/stores/threshold-profiles.store'

const router = useRouter()
const plantsStore = usePlantsStore()
const thresholdProfilesStore = useThresholdProfilesStore()
const isSubmitting = ref(false)

const creerPlante = async (values: PlantFormValues): Promise<void> => {
  isSubmitting.value = true

  try {
    const plante = await plantsStore.ajouterPlante({
      name: values.nom,
      category: values.categorie,
      location: values.emplacement,
      icon: values.icone,
      isFavorite: values.estFavori,
      thresholdProfileId: values.thresholdProfileId,
      status: 'unknown',
      sensorId: null,
    })

    if (plante !== null) {
      await router.replace(`/plants/${plante.id}`)
    }
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  void thresholdProfilesStore.chargerProfils({ ensureDefaults: true })
})
</script>

<style scoped>
.feedback {
  display: block;
  margin: 0.75rem 1rem 0;
}
</style>
