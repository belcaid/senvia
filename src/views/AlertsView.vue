<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Alertes</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <screen-placeholder
        title="Alertes"
        subtitle="Historique local"
        description="Placeholder: les alertes generees a partir des mesures seront listees ici."
      >
        <template #actions>
          <ion-button router-link="/plants/demo">Voir la plante liee</ion-button>
          <ion-button fill="outline" router-link="/tabs/dashboard">Retour Dashboard</ion-button>
        </template>
      </screen-placeholder>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
</script>
