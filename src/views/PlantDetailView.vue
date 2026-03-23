<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Detail plante</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <screen-placeholder
        title="Detail plante"
        subtitle="Statut et mesures"
        :description="description"
      >
        <template #actions>
          <ion-button :router-link="`/plants/${plantId}/pairing`">Associer un capteur BLE</ion-button>
          <ion-button fill="outline" router-link="/tabs/dashboard">Retour Dashboard</ion-button>
        </template>
      </screen-placeholder>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import { useRoute } from 'vue-router'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'

const route = useRoute()
const plantId = computed(() => String(route.params.plantId ?? 'unknown'))
const description = computed(
  () => `Placeholder: detail de la plante ${plantId.value} (etat actuel, mesures, historique, capteur).`,
)
</script>
