<template>
  <button type="button" class="senvia-page-back" :aria-label="ariaLabel" @click="retourPrecedent">
    <ion-icon :icon="arrowBackOutline" />
  </button>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { arrowBackOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'

const props = withDefaults(defineProps<{
  fallbackHref?: string
  ariaLabel?: string
}>(), {
  fallbackHref: '/tabs/dashboard',
  ariaLabel: 'Retour',
})

const router = useRouter()

const retourPrecedent = async (): Promise<void> => {
  if (router.options.history.state.back) {
    router.back()
    return
  }

  await router.replace(props.fallbackHref)
}
</script>

<style scoped>
.senvia-page-back {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  padding: 0;
  border: 1px solid var(--senvia-card-border);
  border-radius: 14px;
  color: var(--ion-text-color);
  background: var(--senvia-surface);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.12);
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.senvia-page-back ion-icon {
  font-size: 1.08rem;
}

.senvia-page-back:hover {
  border-color: rgba(var(--ion-color-primary-rgb), 0.28);
  background: var(--senvia-surface-2);
}

.senvia-page-back:active {
  transform: scale(0.96);
}

.senvia-page-back:focus-visible {
  outline: 3px solid rgba(var(--ion-color-primary-rgb), 0.3);
  outline-offset: 2px;
}
</style>
