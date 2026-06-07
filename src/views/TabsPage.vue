<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="dashboard" href="/tabs/dashboard">
          <ion-icon aria-hidden="true" :icon="gridOutline" />
          <ion-label>Dashboard</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="favoris" href="/tabs/favoris">
          <ion-icon aria-hidden="true" :icon="heartOutline" />
          <ion-label>Favoris</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="alertes" href="/tabs/alertes">
          <ion-icon aria-hidden="true" :icon="notificationsOutline" />
          <ion-label>Alertes</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="reglages" href="/tabs/reglages">
          <ion-icon aria-hidden="true" :icon="settingsOutline" />
          <ion-label>Reglages</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonIcon,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/vue'
import { gridOutline, heartOutline, notificationsOutline, settingsOutline } from 'ionicons/icons'
</script>
