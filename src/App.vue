<template>
  <ion-app>
    <startup-state-screen
      v-if="startupStore.status !== 'ready'"
      :error="startupStore.status === 'error'"
      :message="startupStore.message"
    />
    <ion-router-outlet v-else />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue'
import StartupStateScreen from '@/components/StartupStateScreen.vue'
import { useStartupStore } from '@/stores/startup.store'

const startupStore = useStartupStore()
</script>
