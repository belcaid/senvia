<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/dashboard" />
        </ion-buttons>
        <ion-title>{{ plante?.name ?? 'Detail plante' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-note v-if="plantsStore.erreur" class="feedback" color="danger">{{ plantsStore.erreur }}</ion-note>
      <ion-note v-if="thresholdProfilesStore.erreur" class="feedback" color="danger">
        {{ thresholdProfilesStore.erreur }}
      </ion-note>

      <template v-if="plante">
        <section class="plant-summary ion-padding">
          <ion-icon :icon="iconePlante" class="plant-icon" />
          <div class="plant-summary__content">
            <h2>{{ plante.name }}</h2>
            <p>{{ categorieLabel }} - {{ plante.location }}</p>
          </div>
        </section>

        <plant-form
          :initial-values="valeursFormulaire"
          :threshold-profiles="thresholdProfilesStore.profils"
          :is-submitting="isSubmitting"
          submit-label="Enregistrer les modifications"
          @submit="modifierPlante"
        />

        <div class="actions ion-padding-horizontal ion-padding-bottom">
          <ion-button color="danger" fill="outline" expand="block" @click="confirmerSuppression">
            Supprimer la plante
          </ion-button>
          <ion-button :router-link="`/plants/${plante.id}/pairing`" expand="block" fill="clear">
            Associer un capteur BLE
          </ion-button>
        </div>
      </template>

      <screen-placeholder
        v-else
        title="Plante introuvable"
        subtitle="Aucune plante correspondant a cet identifiant"
        description="Retourne au dashboard pour creer une nouvelle plante ou selectionner une plante existante."
      >
        <template #actions>
          <ion-button router-link="/tabs/dashboard">Retour Dashboard</ion-button>
        </template>
      </screen-placeholder>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  alertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { useRoute, useRouter } from 'vue-router'
import PlantForm, { type PlantFormValues } from '@/components/PlantForm.vue'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
import { usePlantsStore } from '@/stores/plants.store'
import { useThresholdProfilesStore } from '@/stores/threshold-profiles.store'
import { getCategoryLabel, getPlantIcon } from '@/utils/plant-options.util'

const route = useRoute()
const router = useRouter()

const plantsStore = usePlantsStore()
const thresholdProfilesStore = useThresholdProfilesStore()
const isSubmitting = ref(false)

const plantId = computed(() => String(route.params.plantId ?? ''))

const plante = computed(() => plantsStore.getPlanteParId(plantId.value))

const valeursFormulaire = computed<Partial<PlantFormValues> | undefined>(() => {
  if (!plante.value) {
    return undefined
  }

  return {
    nom: plante.value.name,
    categorie: plante.value.category,
    emplacement: plante.value.location,
    icone: plante.value.icon,
    estFavori: plante.value.isFavorite,
    thresholdProfileId: plante.value.thresholdProfileId,
  }
})

const iconePlante = computed(() => getPlantIcon(plante.value?.icon ?? ''))
const categorieLabel = computed(() => (plante.value ? getCategoryLabel(plante.value.category) : ''))

const chargerContexte = async (): Promise<void> => {
  await Promise.all([
    plantsStore.chargerPlantes(),
    thresholdProfilesStore.chargerProfils({ ensureDefaults: true }),
  ])
}

const modifierPlante = async (values: PlantFormValues): Promise<void> => {
  if (!plante.value) {
    return
  }

  isSubmitting.value = true

  try {
    await plantsStore.modifierPlante(plante.value.id, {
      name: values.nom,
      category: values.categorie,
      location: values.emplacement,
      icon: values.icone,
      isFavorite: values.estFavori,
      thresholdProfileId: values.thresholdProfileId,
    })
  } finally {
    isSubmitting.value = false
  }
}

const confirmerSuppression = async (): Promise<void> => {
  if (!plante.value) {
    return
  }

  const confirmation = await alertController.create({
    header: 'Supprimer la plante',
    message: `La plante "${plante.value.name}" sera supprimee definitivement.`,
    buttons: [
      {
        text: 'Annuler',
        role: 'cancel',
      },
      {
        text: 'Supprimer',
        role: 'confirm',
      },
    ],
  })

  await confirmation.present()
  const { role } = await confirmation.onDidDismiss()

  if (role !== 'confirm') {
    return
  }

  await plantsStore.supprimerPlante(plante.value.id)
  await router.replace('/tabs/dashboard')
}

onMounted(() => {
  void chargerContexte()
})

watch(plantId, () => {
  void chargerContexte()
})
</script>

<style scoped>
.feedback {
  display: block;
  margin: 0.75rem 1rem 0;
}

.plant-summary {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.plant-icon {
  font-size: 2rem;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  border-radius: 999px;
  padding: 0.5rem;
}

.plant-summary__content h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.plant-summary__content p {
  margin: 0.3rem 0 0;
  color: var(--ion-color-medium-shade);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
</style>
