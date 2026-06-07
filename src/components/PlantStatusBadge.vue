<template>
  <ion-chip :class="['status-badge', `status-badge--${status}`]" :color="chipColor">
    <ion-label>{{ label }}</ion-label>
  </ion-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IonChip, IonLabel } from '@ionic/vue'
import type { PlantStatus } from '@/types/plant.types'
import { getPlantStatusColor, getPlantStatusLabel } from '@/utils/plant-status.util'

const props = defineProps<{
  status: PlantStatus
}>()

const label = computed(() => getPlantStatusLabel(props.status))
const chipColor = computed(() => getPlantStatusColor(props.status))
</script>

<style scoped>
.status-badge {
  border: 1px solid transparent;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.status-badge--healthy {
  border-color: rgba(var(--ion-color-success-rgb), 0.35);
}

.status-badge--warning,
.status-badge--stale_data {
  border-color: rgba(var(--ion-color-warning-rgb), 0.4);
}

.status-badge--critical {
  border-color: rgba(var(--ion-color-danger-rgb), 0.4);
}

.status-badge--unknown {
  border-color: rgba(var(--ion-color-medium-rgb), 0.4);
}
</style>
