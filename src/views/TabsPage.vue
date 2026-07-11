<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />

      <ion-tab-bar class="senvia-tab-bar" slot="bottom">
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

<style scoped>
.senvia-tab-bar {
  height: 58px;
}

.senvia-tab-bar ion-tab-button {
  font-size: 0.7rem;
  font-weight: 560;
  letter-spacing: 0.01em;
}

.senvia-tab-bar ion-icon {
  font-size: 1.15rem;
  margin-bottom: 0.12rem;
}

@media (min-width: 768px) {
  .senvia-tab-bar {
    height: 54px;
  }

  .senvia-tab-bar ion-tab-button {
    font-size: 0.68rem;
  }

  .senvia-tab-bar ion-icon {
    font-size: 1.05rem;
  }
}
</style>
