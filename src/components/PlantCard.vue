<template>
  <ion-card class="plant-card" button @click="emit('open', plant.id)">
    <ion-card-header>
      <div class="plant-card__top">
        <div class="plant-card__identity">
          <ion-icon class="plant-card__icon" :icon="plantIcon" />
          <div>
            <ion-card-title>{{ plant.name }}</ion-card-title>
            <ion-card-subtitle>{{ categoryLabel }}</ion-card-subtitle>
          </div>
        </div>

        <ion-button
          v-if="showFavoriteAction"
          fill="clear"
          class="plant-card__favorite"
          @click.stop="emit('toggleFavorite', plant.id, plant.isFavorite)"
        >
          <ion-icon :icon="plant.isFavorite ? heart : heartOutline" />
        </ion-button>
      </div>

      <div class="plant-card__chips">
        <ion-chip color="primary" outline>
          <ion-label>{{ categoryLabel }}</ion-label>
        </ion-chip>
        <ion-chip :color="statusColor">
          <ion-label>{{ statusLabel }}</ion-label>
        </ion-chip>
      </div>
    </ion-card-header>

    <ion-card-content>
      <div v-if="measurement" class="measurements-grid">
        <p><strong>Temp:</strong> {{ temperatureLabel }}</p>
        <p><strong>Humidite:</strong> {{ moistureLabel }}</p>
        <p><strong>Lumiere:</strong> {{ lightLabel }}</p>
        <p><strong>Conductivite:</strong> {{ conductivityLabel }}</p>
      </div>
      <p v-else class="measurements-empty">Aucune mesure disponible.</p>

      <p class="plant-card__updated">Derniere mise a jour: {{ updatedAtLabel }}</p>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonIcon,
  IonLabel,
} from '@ionic/vue'
import { heart, heartOutline } from 'ionicons/icons'
import { formatDateTime } from '@/utils/date.util'
import { getCategoryLabel, getPlantIcon } from '@/utils/plant-options.util'
import { getPlantStatusColor, getPlantStatusLabel } from '@/utils/plant-status.util'
import type { Measurement } from '@/types/measurement.types'
import type { Plant } from '@/types/plant.types'

const props = withDefaults(
  defineProps<{
    plant: Plant
    measurement?: Measurement | null
    showFavoriteAction?: boolean
  }>(),
  {
    measurement: null,
    showFavoriteAction: true,
  },
)

const emit = defineEmits<{
  open: [plantId: string]
  toggleFavorite: [plantId: string, isCurrentlyFavorite: boolean]
}>()

const plantIcon = computed(() => getPlantIcon(props.plant.icon))
const categoryLabel = computed(() => getCategoryLabel(props.plant.category))
const statusLabel = computed(() => getPlantStatusLabel(props.plant.status))
const statusColor = computed(() => getPlantStatusColor(props.plant.status))

const temperatureLabel = computed(() => (props.measurement ? `${props.measurement.temperature.toFixed(1)} °C` : '-'))
const moistureLabel = computed(() => (props.measurement ? `${Math.round(props.measurement.moisture)} %` : '-'))
const lightLabel = computed(() => (props.measurement ? `${Math.round(props.measurement.light)} lx` : '-'))
const conductivityLabel = computed(() =>
  props.measurement ? `${Math.round(props.measurement.conductivity)} uS/cm` : '-',
)

const updatedAtLabel = computed(() => {
  const timestamp = props.measurement?.measuredAt ?? props.plant.updatedAt
  return formatDateTime(timestamp)
})
</script>

<style scoped>
.plant-card {
  margin: 0;
}

.plant-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.6rem;
}

.plant-card__identity {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.plant-card__icon {
  font-size: 1.7rem;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  padding: 0.45rem;
  border-radius: 999px;
}

.plant-card__favorite {
  margin: -0.3rem -0.3rem 0 0;
}

.plant-card__chips {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.measurements-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem 0.8rem;
}

.measurements-grid p,
.measurements-empty,
.plant-card__updated {
  margin: 0;
  font-size: 0.85rem;
}

.measurements-empty {
  color: var(--ion-color-medium-shade);
}

.plant-card__updated {
  margin-top: 0.6rem;
  color: var(--ion-color-medium-shade);
}
</style>
