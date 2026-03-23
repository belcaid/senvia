<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <screen-placeholder
        title="Dashboard"
        subtitle="Vue principale"
        description="Placeholder: liste des plantes, filtres, recherche et synchronisation rapide seront ajoutés ici."
      >
        <template #actions>
          <ion-button router-link="/plants/new">Ajouter une plante</ion-button>
          <ion-button fill="outline" router-link="/plants/demo">Voir une plante</ion-button>
          <ion-button fill="clear" router-link="/plants/demo/pairing">Pairing BLE</ion-button>
        </template>
      </screen-placeholder>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
</script>
