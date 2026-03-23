<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Reglages</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <screen-placeholder
        title="Reglages"
        subtitle="Preferences et options globales"
        description="Placeholder: theme, notifications, capteurs associes et informations de l'application."
      >
        <template #actions>
          <ion-button router-link="/plants/new">Ajouter une plante</ion-button>
          <ion-button fill="outline" router-link="/plants/demo/pairing">Tester pairing BLE</ion-button>
        </template>
      </screen-placeholder>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
</script>
