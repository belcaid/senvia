<template>
  <ion-page>
    <ion-tabs class="senvia-tabs">
      <ion-router-outlet />

      <ion-tab-bar class="senvia-tab-bar" slot="bottom">
        <div class="senvia-tab-bar__brand" aria-hidden="true">
          <ion-icon :icon="leafOutline" />
        </div>
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
          <ion-label>Réglages</ion-label>
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
import { gridOutline, heartOutline, leafOutline, notificationsOutline, settingsOutline } from 'ionicons/icons'
</script>

<style scoped>
.senvia-tab-bar {
  height: 58px;
  transition: width 0.3s ease, height 0.3s ease, border-radius 0.3s ease, transform 0.3s ease;
}

.senvia-tab-bar__brand {
  display: none;
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

@media (min-width: 900px) {
  .senvia-tabs {
    width: 100%;
    margin: 0;
  }

  :deep(.dashboard-page),
  :deep(.favorites-page),
  :deep(.alerts-page),
  :deep(.settings-page),
  :deep(.plant-detail-page),
  :deep(.plant-create-page),
  :deep(.ble-pairing-page) {
    right: 0;
    left: 82px;
    width: auto;
    transition: left 0.3s ease;
  }

  :deep(.dashboard-page > ion-content.ion-padding),
  :deep(.favorites-page > ion-content.ion-padding),
  :deep(.alerts-page > ion-content.ion-padding),
  :deep(.settings-page > ion-content.ion-padding),
  :deep(.plant-detail-page > ion-content.ion-padding),
  :deep(.plant-create-page > ion-content.ion-padding),
  :deep(.ble-pairing-page > ion-content.ion-padding) {
    --padding-start: 2.5rem;
    --padding-end: 2.5rem;
  }

  .senvia-tab-bar {
    position: fixed;
    z-index: 20;
    inset: 0 auto 0 0 !important;
    display: flex;
    width: 82px;
    height: 100dvh;
    min-height: 100%;
    padding: calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 1.8rem) 0.6rem calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 1rem);
    flex-direction: column;
    justify-content: flex-start;
    gap: 0.35rem;
    border: 0;
    margin: 0 !important;
    border-right: 1px solid rgba(var(--ion-color-primary-rgb), 0.1);
    border-radius: 0;
    background: var(--senvia-sidebar-background);
    box-shadow: 10px 0 32px rgba(0, 0, 0, 0.14);
    backdrop-filter: blur(18px);
    transform: none;
  }

  .senvia-tab-bar__brand {
    display: grid;
    place-items: center;
    width: 2.65rem;
    height: 2.65rem;
    margin: 0 auto 1.7rem;
    border-radius: 15px;
    color: var(--ion-color-primary-contrast);
    background: var(--ion-color-primary);
    box-shadow: 0 10px 24px rgba(var(--ion-color-primary-rgb), 0.2);
    font-size: 1.2rem;
  }

  .senvia-tab-bar ion-tab-button {
    width: 100%;
    min-height: 58px;
    flex: 0 0 58px;
    border-radius: 18px;
    --background: transparent;
    --color: var(--senvia-text-muted);
    --color-selected: var(--ion-color-primary);
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .senvia-tab-bar ion-tab-button.tab-selected {
    --background: var(--senvia-sidebar-active);
  }

  .senvia-tab-bar ion-icon {
    font-size: 1.25rem;
    margin: 0;
  }

  .senvia-tab-bar ion-tab-button:hover {
    transform: translateX(2px);
  }

  .senvia-tab-bar ion-tab-button ion-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  :deep(.ion-page > ion-content) {
    --padding-bottom: calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 2rem);
  }
}

@media (min-width: 1200px) {
  :deep(.dashboard-page > ion-content.ion-padding),
  :deep(.favorites-page > ion-content.ion-padding),
  :deep(.alerts-page > ion-content.ion-padding),
  :deep(.settings-page > ion-content.ion-padding),
  :deep(.plant-detail-page > ion-content.ion-padding),
  :deep(.plant-create-page > ion-content.ion-padding),
  :deep(.ble-pairing-page > ion-content.ion-padding) {
    --padding-start: 3rem;
    --padding-end: 3rem;
  }
}

@media (min-width: 1440px) {
  :deep(.dashboard-page > ion-content.ion-padding),
  :deep(.favorites-page > ion-content.ion-padding),
  :deep(.alerts-page > ion-content.ion-padding),
  :deep(.settings-page > ion-content.ion-padding),
  :deep(.plant-detail-page > ion-content.ion-padding),
  :deep(.plant-create-page > ion-content.ion-padding),
  :deep(.ble-pairing-page > ion-content.ion-padding) {
    --padding-start: 4rem;
    --padding-end: 4rem;
  }
}
</style>
