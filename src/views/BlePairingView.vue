<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Pairing BLE</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <screen-placeholder
        title="Pairing BLE"
        subtitle="Scan et association capteur"
        :description="description"
      >
        <template #actions>
          <ion-button :router-link="`/plants/${plantId}`">Retour au detail plante</ion-button>
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
  () => `Placeholder: scan BLE, selection du capteur, test de connexion et association pour ${plantId.value}.`,
)
</script>
