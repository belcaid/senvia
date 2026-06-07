<template>
  <ion-card class="placeholder-card senvia-card">
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
  --background: var(--senvia-surface);
  border: 1px solid var(--senvia-card-border);
  box-shadow: 0 14px 35px var(--senvia-shadow-color);
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
  color: var(--senvia-text-muted);
}
</style>
