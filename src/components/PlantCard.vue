<template>
  <ion-card class="plant-card senvia-card senvia-reveal" button @click="emit('open', plant.id)">
    <ion-card-header>
      <div class="plant-card__top">
        <div class="plant-card__identity">
          <ion-icon class="plant-card__icon" :icon="plantIcon" />
          <div>
            <ion-card-title>{{ plant.name }}</ion-card-title>
            <ion-card-subtitle class="senvia-muted">{{ plant.location }}</ion-card-subtitle>
          </div>
        </div>

        <div class="plant-card__actions">
          <ion-button
            v-if="showFavoriteAction"
            fill="clear"
            class="plant-card__favorite"
            @click.stop="emit('toggleFavorite', plant.id, plant.isFavorite)"
          >
            <ion-icon :icon="plant.isFavorite ? heart : heartOutline" />
          </ion-button>
          <ion-button fill="solid" class="plant-card__open" @click.stop="emit('open', plant.id)">
            <ion-icon :icon="arrowForwardOutline" />
          </ion-button>
        </div>
      </div>

      <div class="plant-card__chips">
        <ion-chip color="primary" outline>
          <ion-label>{{ categoryLabel }}</ion-label>
        </ion-chip>
        <plant-status-badge :status="effectiveStatus" />
      </div>
    </ion-card-header>

    <ion-card-content>
      <div v-if="measurement" class="measurements-grid">
        <div class="metric-cell">
          <span class="metric-header">
            <ion-icon :icon="waterOutline" />
            <span class="metric-label">Humidite</span>
          </span>
          <strong>{{ moistureLabel }}</strong>
        </div>
        <div class="metric-cell">
          <span class="metric-header">
            <ion-icon :icon="thermometerOutline" />
            <span class="metric-label">Temp.</span>
          </span>
          <strong>{{ temperatureLabel }}</strong>
        </div>
        <div class="metric-cell">
          <span class="metric-header">
            <ion-icon :icon="sunnyOutline" />
            <span class="metric-label">Lumiere</span>
          </span>
          <strong>{{ lightLabel }}</strong>
        </div>
        <div class="metric-cell">
          <span class="metric-header">
            <ion-icon :icon="flashOutline" />
            <span class="metric-label">Fertilite</span>
          </span>
          <strong>{{ conductivityLabel }}</strong>
        </div>
      </div>
      <p v-else class="measurements-empty">Aucune mesure disponible.</p>

      <div class="plant-card__footer">
        <p class="plant-card__updated">Derniere mise a jour: {{ updatedAtLabel }}</p>
      </div>
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
import {
  arrowForwardOutline,
  flashOutline,
  heart,
  heartOutline,
  sunnyOutline,
  thermometerOutline,
  waterOutline,
} from 'ionicons/icons'
import { formatDateTime } from '@/utils/date.util'
import PlantStatusBadge from '@/components/PlantStatusBadge.vue'
import { getCategoryLabel, getPlantIcon } from '@/utils/plant-options.util'
import type { Measurement } from '@/types/measurement.types'
import type { Plant, PlantStatus } from '@/types/plant.types'

const props = withDefaults(
  defineProps<{
    plant: Plant
    measurement?: Measurement | null
    showFavoriteAction?: boolean
    statusOverride?: PlantStatus | null
  }>(),
  {
    measurement: null,
    showFavoriteAction: true,
    statusOverride: null,
  },
)

const emit = defineEmits<{
  open: [plantId: string]
  toggleFavorite: [plantId: string, isCurrentlyFavorite: boolean]
}>()

const plantIcon = computed(() => getPlantIcon(props.plant.icon))
const categoryLabel = computed(() => getCategoryLabel(props.plant.category))
const effectiveStatus = computed(() => props.statusOverride ?? props.plant.status)

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
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 316px;
  border-radius: 24px;
  --background: linear-gradient(140deg, rgba(15, 29, 22, 0.94), rgba(23, 43, 32, 0.86));
  backdrop-filter: blur(8px);
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.plant-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 3px;
  background: linear-gradient(90deg, rgba(var(--ion-color-primary-rgb), 0.95), rgba(255, 255, 255, 0));
}

.plant-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.6rem;
}

.plant-card__identity {
  display: flex;
  align-items: flex-start;
  gap: 0.72rem;
}

.plant-card__icon {
  font-size: 1.62rem;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.16);
  padding: 0.52rem;
  border-radius: 999px;
}

.plant-card :deep(ion-card-title) {
  font-size: 1.56rem;
  font-weight: 780;
  letter-spacing: -0.018em;
  color: #f2fff6;
}

.plant-card :deep(ion-card-subtitle) {
  opacity: 1;
}

.plant-card :deep(ion-card-header) {
  padding-bottom: 0.55rem;
}

.plant-card :deep(ion-card-content) {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
}

.plant-card__favorite {
  margin: -0.3rem -0.3rem 0 0;
}

.plant-card__actions {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.plant-card__open {
  --background: rgba(var(--ion-color-primary-rgb), 0.96);
  --color: #092313;
  --border-radius: 999px;
  width: 2.5rem;
  height: 2.5rem;
}

.plant-card__chips {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-top: 0.66rem;
}

.measurements-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem 0.7rem;
}

.metric-cell {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 13px;
  padding: 0.45rem 0.58rem;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.metric-header {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
}

.metric-header ion-icon {
  font-size: 0.82rem;
  color: rgba(var(--ion-color-primary-rgb), 0.96);
}

.metric-label {
  font-size: 0.69rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(231, 245, 236, 0.88);
}

.metric-cell strong,
.measurements-empty,
.plant-card__updated {
  margin: 0;
  font-size: 0.85rem;
}

.metric-cell strong {
  font-size: 1.02rem;
  color: #f1fff5;
}

.measurements-empty {
  color: rgba(231, 245, 236, 0.88);
}

.plant-card__footer {
  margin-top: 0.72rem;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 0.6rem;
}

.plant-card__updated {
  color: rgba(231, 245, 236, 0.86);
}

@media (hover: hover) and (pointer: fine) {
  .plant-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 44px rgba(var(--ion-color-primary-rgb), 0.16);
    border-color: rgba(var(--ion-color-primary-rgb), 0.3);
  }
}

:root[data-theme='light'] .plant-card {
  --background: linear-gradient(145deg, rgba(245, 251, 247, 0.96), rgba(229, 243, 233, 0.95));
}

:root[data-theme='light'] .metric-cell {
  background: rgba(17, 54, 33, 0.05);
  border-color: rgba(17, 54, 33, 0.12);
}

:root[data-theme='light'] .metric-label,
:root[data-theme='light'] .measurements-empty,
:root[data-theme='light'] .plant-card__updated {
  color: #355542;
}

:root[data-theme='light'] .metric-cell strong {
  color: #13281d;
}

:root[data-theme='light'] .plant-card :deep(ion-card-title) {
  color: #10291b;
}
</style>
