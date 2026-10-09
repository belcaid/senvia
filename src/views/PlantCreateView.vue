<template>
  <ion-page class="plant-create-page">
    <ion-content class="ion-padding">
      <nav class="flow-navigation senvia-reveal" aria-label="Navigation">
        <page-back-button fallback-href="/tabs/dashboard" />
      </nav>

      <ion-note v-if="thresholdProfilesStore.erreur" class="senvia-feedback senvia-reveal" color="danger">
        {{ thresholdProfilesStore.erreur }}
      </ion-note>
      <ion-note v-if="plantsStore.erreur" class="senvia-feedback senvia-reveal" color="danger">{{ plantsStore.erreur }}</ion-note>

      <section class="create-intro senvia-reveal">
        <span class="create-intro__eyebrow">Étape 1 sur 2</span>
        <h1>Ajoutez votre plante</h1>
        <p>Quelques informations suffisent. Vous pourrez connecter son capteur juste après.</p>
      </section>

      <ion-card class="create-card senvia-card senvia-reveal">
        <ion-card-content>
          <plant-form
            :threshold-profiles="thresholdProfilesStore.profils"
            :is-submitting="isSubmitting"
            submit-label="Continuer"
            @submit="creerPlante"
          />
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  IonCard,
  IonCardContent,
  IonContent,
  IonNote,
  IonPage,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import PageBackButton from '@/components/PageBackButton.vue'
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
      await showSuccessFeedback('Plante ajoutée. Connectons maintenant son capteur.')
      await router.replace(`/plants/${plante.id}/pairing`)
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

<style scoped>
.flow-navigation {
  max-width: 720px;
  margin: 0 auto 0.85rem;
}

.create-intro {
  max-width: 680px;
  margin: 0.4rem auto 1rem;
}

.create-intro__eyebrow {
  display: inline-block;
  margin-bottom: 0.35rem;
  color: var(--ion-color-primary-shade);
  font-size: 0.76rem;
  font-weight: 750;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.create-intro h1 {
  margin: 0;
  font-size: clamp(1.65rem, 7vw, 2.2rem);
  letter-spacing: -0.035em;
}

.create-intro p {
  margin: 0.45rem 0 0;
  color: var(--senvia-text-muted);
  line-height: 1.45;
}

.create-card {
  max-width: 720px;
  margin: 0 auto;
  border-radius: 24px;
}

.create-card ion-card-content {
  padding: 1.1rem 0.45rem 0.25rem;
}
</style>
