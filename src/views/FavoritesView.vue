<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Favoris</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <screen-placeholder
        title="Favoris"
        subtitle="Plantes favorites"
        description="Placeholder: seules les plantes marquees en favoris seront affichees dans cette vue."
      >
        <template #actions>
          <ion-button router-link="/plants/demo">Ouvrir un detail plante</ion-button>
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
