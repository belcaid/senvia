<template>
  <ion-card class="placeholder-card">
    <ion-card-header>
      <ion-card-title>{{ title }}</ion-card-title>
      <ion-card-subtitle v-if="subtitle">{{ subtitle }}</ion-card-subtitle>
    </ion-card-header>

    <ion-card-content>
      <p>{{ description }}</p>
      <div class="actions">
        <slot name="actions" />
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from '@ionic/vue'

interface Props {
  title: string
  subtitle?: string
  description: string
}

defineProps<Props>()
</script>

<style scoped>
.placeholder-card {
  border: 1px solid var(--ion-color-step-150, #d8d8d8);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

p {
  margin: 0;
  line-height: 1.5;
}
</style>
