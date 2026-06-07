<template>
  <section class="chart-card">
    <header class="chart-card__header">
      <h4>{{ title }}</h4>
      <p v-if="latestValue !== null">Actuel: {{ latestValueLabel }}</p>
      <p v-else>Aucune mesure</p>
    </header>

    <div v-if="chartPoints.length > 0" class="chart-shell">
      <svg :viewBox="`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`" preserveAspectRatio="none" role="img" :aria-label="title">
        <line
          v-for="line in gridLines"
          :key="line.y"
          x1="0"
          :y1="line.y"
          :x2="CHART_WIDTH"
          :y2="line.y"
          class="grid-line"
        />

        <line
          v-if="targetBandMinY !== null"
          x1="0"
          :y1="targetBandMinY"
          :x2="CHART_WIDTH"
          :y2="targetBandMinY"
          class="target-line"
        />
        <line
          v-if="targetBandMaxY !== null"
          x1="0"
          :y1="targetBandMaxY"
          :x2="CHART_WIDTH"
          :y2="targetBandMaxY"
          class="target-line"
        />

        <polyline :points="polylinePoints" class="trend-line" />

        <circle
          v-for="point in chartPoints"
          :key="point.key"
          :cx="point.x"
          :cy="point.y"
          r="2.1"
          class="trend-point"
        />
      </svg>
    </div>

    <p v-else class="empty-state">Pas assez de donnees sur cette periode.</p>

    <footer class="chart-card__footer">
      <span>Min: {{ minLabel }}</span>
      <span>Max: {{ maxLabel }}</span>
      <span>{{ measurements.length }} pts</span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Measurement } from '@/types/measurement.types'

type MetricKey = 'temperature' | 'moisture' | 'light' | 'conductivity'

interface ChartPoint {
  key: string
  x: number
  y: number
}

const CHART_WIDTH = 340
const CHART_HEIGHT = 126
const CHART_PADDING_X = 12
const CHART_PADDING_Y = 12

const props = withDefaults(
  defineProps<{
    title: string
    unit: string
    metric: MetricKey
    measurements: Measurement[]
    targetMin?: number | null
    targetMax?: number | null
  }>(),
  {
    targetMin: null,
    targetMax: null,
  },
)

const orderedMeasurements = computed(() => [...props.measurements].reverse())

const values = computed(() => orderedMeasurements.value.map((item) => item[props.metric]))

const minValue = computed(() => {
  if (values.value.length === 0) {
    return null
  }

  const dataMin = Math.min(...values.value)
  const minCandidate = props.targetMin === null ? dataMin : Math.min(dataMin, props.targetMin)
  return Number.isFinite(minCandidate) ? minCandidate : null
})

const maxValue = computed(() => {
  if (values.value.length === 0) {
    return null
  }

  const dataMax = Math.max(...values.value)
  const maxCandidate = props.targetMax === null ? dataMax : Math.max(dataMax, props.targetMax)
  return Number.isFinite(maxCandidate) ? maxCandidate : null
})

const valueRange = computed(() => {
  if (minValue.value === null || maxValue.value === null) {
    return 1
  }

  return Math.max(maxValue.value - minValue.value, 1)
})

const toY = (value: number): number => {
  if (minValue.value === null) {
    return CHART_HEIGHT / 2
  }

  const drawableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2
  const ratio = (value - minValue.value) / valueRange.value
  return CHART_HEIGHT - CHART_PADDING_Y - ratio * drawableHeight
}

const chartPoints = computed<ChartPoint[]>(() => {
  const len = values.value.length

  if (len === 0) {
    return []
  }

  const drawableWidth = CHART_WIDTH - CHART_PADDING_X * 2

  if (len === 1) {
    return [
      {
        key: 'single',
        x: CHART_WIDTH / 2,
        y: toY(values.value[0]),
      },
    ]
  }

  return values.value.map((value, index) => ({
    key: `${index}-${value}`,
    x: CHART_PADDING_X + (index / (len - 1)) * drawableWidth,
    y: toY(value),
  }))
})

const polylinePoints = computed(() => chartPoints.value.map((point) => `${point.x},${point.y}`).join(' '))

const gridLines = computed(() => {
  const rows = 4
  const step = CHART_HEIGHT / rows

  return Array.from({ length: rows + 1 }, (_, index) => ({
    y: Math.round(index * step),
  }))
})

const targetBandMinY = computed(() => (props.targetMin === null ? null : toY(props.targetMin)))
const targetBandMaxY = computed(() => (props.targetMax === null ? null : toY(props.targetMax)))

const latestValue = computed(() => (props.measurements.length > 0 ? props.measurements[0][props.metric] : null))

const formatValue = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) {
    return '-'
  }

  if (Math.abs(value) >= 100 || Number.isInteger(value)) {
    return `${Math.round(value)} ${props.unit}`
  }

  return `${value.toFixed(1)} ${props.unit}`
}

const latestValueLabel = computed(() => formatValue(latestValue.value))
const minLabel = computed(() => formatValue(minValue.value))
const maxLabel = computed(() => formatValue(maxValue.value))
</script>

<style scoped>
.chart-card {
  border: 1px solid var(--senvia-card-border);
  border-radius: 16px;
  background: var(--senvia-surface-2);
  padding: 0.65rem 0.7rem;
}

.chart-card__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.chart-card__header h4,
.chart-card__header p {
  margin: 0;
}

.chart-card__header h4 {
  font-size: 0.93rem;
  font-weight: 700;
}

.chart-card__header p {
  font-size: 0.78rem;
  color: var(--senvia-text-muted);
}

.chart-shell {
  margin-top: 0.5rem;
  height: 110px;
}

.chart-shell svg {
  width: 100%;
  height: 100%;
}

.grid-line {
  stroke: rgba(var(--ion-color-medium-rgb), 0.18);
  stroke-width: 1;
}

.target-line {
  stroke: rgba(var(--ion-color-warning-rgb), 0.45);
  stroke-width: 1.2;
  stroke-dasharray: 4 4;
}

.trend-line {
  fill: none;
  stroke: var(--ion-color-primary);
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-point {
  fill: var(--ion-color-primary);
}

.empty-state {
  margin: 0.65rem 0 0;
  font-size: 0.82rem;
  color: var(--senvia-text-muted);
}

.chart-card__footer {
  margin-top: 0.55rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.45rem;
  color: var(--senvia-text-muted);
  font-size: 0.75rem;
}
</style>
