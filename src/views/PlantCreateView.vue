<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Ajout plante</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <screen-placeholder
        title="Ajout plante"
        subtitle="Creation et parametrage"
        description="Placeholder: formulaire de creation (nom, categorie, emplacement, icone, profils de seuils)."
      >
        <template #actions>
          <ion-button router-link="/plants/draft/pairing">Continuer vers le pairing BLE</ion-button>
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
