<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/plants/new">
            <ion-icon slot="start" :icon="addOutline" />
            Ajouter
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-searchbar
        v-model="rechercheNom"
        placeholder="Rechercher une plante par nom"
        show-clear-button="focus"
      />

      <ion-item>
        <ion-select
          v-model="categorieSelectionnee"
          interface="popover"
          label="Categorie"
          label-placement="stacked"
        >
          <ion-select-option value="all">Toutes les categories</ion-select-option>
          <ion-select-option
            v-for="categorie in PLANT_CATEGORY_OPTIONS"
            :key="categorie.value"
            :value="categorie.value"
          >
            {{ categorie.label }}
          </ion-select-option>
        </ion-select>
      </ion-item>

      <ion-note class="results-count" color="medium">
        {{ nombreResultats }} plante{{ nombreResultats > 1 ? 's' : '' }}
      </ion-note>

      <ion-note v-if="plantsStore.erreur" class="feedback" color="danger">{{ plantsStore.erreur }}</ion-note>

      <div v-if="plantsStore.estChargement" class="loading-container">
        <ion-spinner name="crescent" />
      </div>

      <ion-list v-else-if="plantesFiltrees.length > 0" inset>
        <ion-item
          v-for="plante in plantesFiltrees"
          :key="plante.id"
          button
          detail
          @click="ouvrirPlante(plante.id)"
        >
          <ion-icon slot="start" class="plant-icon" :icon="getPlantIcon(plante.icon)" />

          <ion-label>
            <h2>{{ plante.name }}</h2>
            <p>{{ getCategoryLabel(plante.category) }} - {{ plante.location }}</p>
            <p>{{ profileLabel(plante.thresholdProfileId) }}</p>
          </ion-label>

          <ion-button fill="clear" slot="end" @click.stop="basculerFavori(plante.id, plante.isFavorite)">
            <ion-icon :icon="plante.isFavorite ? heart : heartOutline" />
          </ion-button>
        </ion-item>
      </ion-list>

      <screen-placeholder
        v-else
        title="Aucune plante"
        subtitle="Commence par ajouter ta premiere plante"
        description="Utilise les filtres categorie et recherche pour retrouver rapidement une plante."
      >
        <template #actions>
          <ion-button router-link="/plants/new">Ajouter une plante</ion-button>
        </template>
      </screen-placeholder>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { addOutline, heart, heartOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
import { usePlantsStore } from '@/stores/plants.store'
import { useThresholdProfilesStore } from '@/stores/threshold-profiles.store'
import type { PlantCategory } from '@/types/plant.types'
import { getCategoryLabel, getPlantIcon, PLANT_CATEGORY_OPTIONS } from '@/utils/plant-options.util'

type CategoryFilter = PlantCategory | 'all'

const router = useRouter()
const plantsStore = usePlantsStore()
const thresholdProfilesStore = useThresholdProfilesStore()

const rechercheNom = ref('')
const categorieSelectionnee = ref<CategoryFilter>('all')

const plantesFiltrees = computed(() => {
  const recherche = rechercheNom.value.trim().toLowerCase()

  return plantsStore.plantes.filter((plante) => {
    const matchCategorie =
      categorieSelectionnee.value === 'all' || plante.category === categorieSelectionnee.value
    const matchNom = recherche === '' || plante.name.toLowerCase().includes(recherche)

    return matchCategorie && matchNom
  })
})

const nombreResultats = computed(() => plantesFiltrees.value.length)

const ouvrirPlante = async (id: string): Promise<void> => {
  await router.push(`/plants/${id}`)
}

const basculerFavori = async (id: string, estFavoriActuel: boolean): Promise<void> => {
  await plantsStore.marquerFavori(id, !estFavoriActuel)
}

const profileLabel = (profileId: string | null): string => {
  if (profileId === null) {
    return 'Profil de seuils: aucun'
  }

  const profile = thresholdProfilesStore.getProfilParId(profileId)
  return `Profil de seuils: ${profile?.name ?? 'inconnu'}`
}

onMounted(() => {
  void Promise.all([
    plantsStore.chargerPlantes(),
    thresholdProfilesStore.chargerProfils({ ensureDefaults: true }),
  ])
})
</script>

<style scoped>
.loading-container {
  display: flex;
  justify-content: center;
  padding: 1.5rem 0;
}

.feedback {
  display: block;
  margin: 0.25rem 0.35rem 0.75rem;
}

.results-count {
  display: block;
  margin: 0.4rem 0.35rem 0.75rem;
}

.plant-icon {
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  border-radius: 999px;
  padding: 0.4rem;
  font-size: 1.3rem;
}
</style>
