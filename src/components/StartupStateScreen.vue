<template>
  <main class="startup-screen" role="status" :aria-live="isError ? 'assertive' : 'polite'">
    <div class="startup-screen__mark" :class="{ 'startup-screen__mark--error': isError }">
      <ion-icon :icon="isError ? alertCircleOutline : leafOutline" />
    </div>

    <template v-if="isError">
      <span class="startup-screen__eyebrow">Démarrage interrompu</span>
      <h1>Impossible d’ouvrir Senvia</h1>
      <p>{{ message }}</p>
      <ion-button @click="reloadApplication">Réessayer</ion-button>
      <small>Si le problème persiste, fermez complètement l’application puis relancez-la.</small>
    </template>

    <template v-else>
      <h1>Senvia</h1>
      <p>Préparation de vos plantes…</p>
      <ion-spinner name="crescent" />
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IonButton, IonIcon, IonSpinner } from '@ionic/vue'
import { alertCircleOutline, leafOutline } from 'ionicons/icons'

const props = withDefaults(defineProps<{
  error?: boolean
  message?: string | null
}>(), {
  error: false,
  message: null,
})

const isError = computed(() => props.error)

const reloadApplication = (): void => {
  window.location.reload()
}
</script>

<style scoped>
.startup-screen {
  display: flex;
  min-height: 100dvh;
  padding: calc(var(--safe-area-inset-top, env(safe-area-inset-top, 0px)) + 2rem) 1.4rem calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)) + 2rem);
  align-items: center;
  justify-content: center;
  flex-direction: column;
  box-sizing: border-box;
  text-align: center;
  color: var(--ion-text-color);
  background: var(--senvia-bg-gradient);
}

.startup-screen__mark {
  display: grid;
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
  place-items: center;
  border: 1px solid rgba(var(--ion-color-primary-rgb), 0.22);
  border-radius: 22px;
  color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.1);
}

.startup-screen__mark--error {
  border-color: rgba(var(--ion-color-danger-rgb), 0.24);
  color: var(--ion-color-danger);
  background: rgba(var(--ion-color-danger-rgb), 0.1);
}

.startup-screen__mark ion-icon {
  font-size: 2rem;
}

.startup-screen__eyebrow {
  color: var(--ion-color-danger);
  font-size: 0.72rem;
  font-weight: 750;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.startup-screen h1 {
  margin: 0.35rem 0 0;
  font-size: clamp(1.75rem, 6vw, 2.3rem);
  letter-spacing: -0.04em;
}

.startup-screen p {
  max-width: 31rem;
  margin: 0.55rem 0 1rem;
  color: var(--senvia-text-muted);
  line-height: 1.5;
}

.startup-screen ion-spinner {
  margin-top: 0.3rem;
  color: var(--ion-color-primary);
}

.startup-screen ion-button {
  min-width: 10rem;
  margin-top: 0.25rem;
}

.startup-screen small {
  max-width: 28rem;
  margin-top: 0.9rem;
  color: var(--senvia-text-muted);
  line-height: 1.45;
}
</style>
