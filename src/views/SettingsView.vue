<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Reglages</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list inset>
        <ion-item>
          <ion-label>
            <h2>Theme global</h2>
            <p>Inspire de la maquette: vert vegetal + contraste eleve.</p>
          </ion-label>
          <ion-note slot="end">{{ isDarkMode ? 'Sombre' : 'Clair' }}</ion-note>
        </ion-item>
        <ion-item>
          <ion-label>Mode sombre</ion-label>
          <ion-toggle slot="end" :checked="isDarkMode" @ionChange="onThemeToggle" />
        </ion-item>
      </ion-list>

      <screen-placeholder
        title="Reglages"
        subtitle="Preferences et options globales"
        description="Placeholder: notifications, capteurs associes et informations de l'application."
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
import { onMounted } from 'vue'
import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue'
import { useTheme } from '@/composables/useTheme'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'

const { isDarkMode, initTheme, setTheme } = useTheme()

const onThemeToggle = (event: CustomEvent<{ checked: boolean }>): void => {
  void setTheme(event.detail.checked ? 'dark' : 'light')
}

onMounted(() => {
  void initTheme()
})
</script>
