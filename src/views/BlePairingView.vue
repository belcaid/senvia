<template>
  <ion-page class="ble-pairing-page">
    <ion-content class="ion-padding">
      <nav class="flow-navigation senvia-reveal" aria-label="Navigation">
        <page-back-button :fallback-href="`/plants/${plantId}`" />
      </nav>

      <ion-note v-if="plantsStore.erreur" class="senvia-feedback" color="danger">{{ plantsStore.erreur }}</ion-note>
      <ion-note v-if="sensorsStore.erreur" class="senvia-feedback" color="danger">{{ sensorsStore.erreur }}</ion-note>
      <ion-note v-if="bleStore.erreur" class="senvia-feedback" color="danger">{{ bleStore.erreur }}</ion-note>

      <template v-if="plante">
        <section class="pairing-intro senvia-reveal">
          <span class="pairing-intro__step">{{ capteurAssocie ? 'Remplacement' : 'Étape 2 sur 2' }}</span>
          <h1>{{ capteurAssocie ? `Changer le capteur de ${plante.name}` : `Connecter le capteur de ${plante.name}` }}</h1>
          <p>Gardez le capteur près du téléphone, puis lancez la recherche.</p>
        </section>

        <div v-if="capteurAssocie" class="current-sensor senvia-reveal">
          <span class="current-sensor__dot" />
          <div class="current-sensor__copy">
            <strong>{{ capteurAssocie.deviceName }}</strong>
            <p>Capteur actuellement associé à cette plante</p>
          </div>
          <ion-button fill="clear" color="danger" size="small" @click="dissocierCapteur">Dissocier</ion-button>
        </div>

        <section class="pairing-panel senvia-reveal">
          <div class="pairing-panel__header">
            <div>
              <span class="pairing-panel__label">1 · Rechercher</span>
              <h2>Capteurs à proximité</h2>
            </div>
            <ion-chip :color="etatColor"><ion-label>{{ etatLabel }}</ion-label></ion-chip>
          </div>

          <ion-button v-if="isAndroid && !bleStore.bluetoothActif" expand="block" fill="outline" @click="activerBluetooth">
            Activer le Bluetooth
          </ion-button>
          <ion-button expand="block" :disabled="isBusy" @click="basculerScan">
            <ion-spinner v-if="bleStore.estScanEnCours" slot="start" name="crescent" />
            <ion-icon v-else slot="start" :icon="searchOutline" />
            {{ bleStore.estScanEnCours ? 'Arrêter la recherche' : 'Rechercher un capteur' }}
          </ion-button>

          <div v-if="capteursTries.length > 0" class="sensor-results">
            <button
              v-for="capteur in capteursTries"
              :key="capteur.deviceId"
              type="button"
              class="sensor-result"
              :class="{
                'sensor-result--selected': selection.deviceId === capteur.deviceId,
                'sensor-result--unavailable': isAssociatedElsewhere(capteur.deviceId),
              }"
              :disabled="isAssociatedElsewhere(capteur.deviceId)"
              :aria-pressed="selection.deviceId === capteur.deviceId"
              @click="selectionnerCapteur(capteur.deviceId)"
            >
              <span class="sensor-result__icon"><ion-icon :icon="bluetoothOutline" /></span>
              <span class="sensor-result__copy">
                <strong>{{ capteur.name || 'Capteur Senvia' }}</strong>
                <small>{{ getSignalLabel(capteur.rssi) }}</small>
                <small v-if="getAssociationLabel(capteur.deviceId)" class="sensor-result__association">
                  {{ getAssociationLabel(capteur.deviceId) }}
                </small>
              </span>
              <ion-icon class="sensor-result__check" :icon="checkmarkCircle" />
            </button>
          </div>

          <div v-else class="sensor-empty">
            <ion-icon :icon="bluetoothOutline" />
            <p>{{ bleStore.estScanEnCours ? 'Recherche en cours…' : 'Lancez la recherche pour afficher les capteurs disponibles.' }}</p>
          </div>
        </section>

        <section class="connect-panel senvia-reveal" :class="{ 'connect-panel--ready': selection.deviceId !== '' }">
          <div>
            <span>2 · Connecter</span>
            <p v-if="selection.deviceId">Le capteur est prêt à être vérifié et associé.</p>
            <p v-else>Sélectionnez d’abord un capteur dans la liste.</p>
          </div>
          <ion-button :disabled="selection.deviceId === '' || isBusy" expand="block" @click="associerCapteur">
            <ion-spinner v-if="isBusy" slot="start" name="crescent" />
            {{ isBusy ? 'Connexion en cours…' : capteurAssocie ? 'Remplacer le capteur' : 'Connecter ce capteur' }}
          </ion-button>
          <ion-button
            v-if="!capteurAssocie"
            fill="clear"
            color="medium"
            expand="block"
            :router-link="`/plants/${plantId}`"
          >
            Je connecterai un capteur plus tard
          </ion-button>
        </section>
      </template>

      <ion-card v-else class="senvia-card">
        <ion-card-content>
          <h2>Plante introuvable</h2>
          <ion-button router-link="/tabs/dashboard">Retour aux plantes</ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  alertController,
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonIcon,
  IonLabel,
  IonNote,
  IonPage,
  IonSpinner,
  onIonViewWillEnter,
  onIonViewWillLeave,
} from '@ionic/vue'
import { Capacitor } from '@capacitor/core'
import { bluetoothOutline, checkmarkCircle, searchOutline } from 'ionicons/icons'
import { useRoute, useRouter } from 'vue-router'
import PageBackButton from '@/components/PageBackButton.vue'
import { useGsapReveal } from '@/composables/use-gsap-reveal'
import { showErrorFeedback, showSuccessFeedback } from '@/services/ux-feedback.service'
import { useBleStore } from '@/stores/ble.store'
import { usePlantsStore } from '@/stores/plants.store'
import { useSensorsStore } from '@/stores/sensors.store'

const route = useRoute()
const router = useRouter()
const bleStore = useBleStore()
const plantsStore = usePlantsStore()
const sensorsStore = useSensorsStore()
const selection = reactive({ deviceId: '' })
const isBusy = ref(false)
const selectionAutomatiqueActive = ref(true)

const plantId = computed(() => String(route.params.plantId ?? ''))
const plante = computed(() => plantsStore.getPlanteParId(plantId.value))
const capteurAssocie = computed(() => sensorsStore.getCapteurParPlanteId(plantId.value))
const capteursTries = computed(() =>
  [...bleStore.capteursDetectes].sort((a, b) => {
    const aFlowerCare = a.name.trim().toLowerCase().startsWith('flower care') ? 0 : 1
    const bFlowerCare = b.name.trim().toLowerCase().startsWith('flower care') ? 0 : 1

    if (aFlowerCare !== bFlowerCare) {
      return aFlowerCare - bFlowerCare
    }

    return (b.rssi ?? -999) - (a.rssi ?? -999)
  }),
)
const isAndroid = computed(() => Capacitor.getPlatform() === 'android')

const etatLabel = computed(() => {
  if (bleStore.etat === 'en_scan') return 'Recherche…'
  if (bleStore.etat === 'connecte') return 'Connecté'
  if (bleStore.etat === 'desactive') return 'Bluetooth désactivé'
  if (bleStore.etat === 'erreur') return 'À vérifier'
  return 'Prêt'
})

const etatColor = computed(() => {
  if (bleStore.etat === 'connecte') return 'success'
  if (bleStore.etat === 'desactive' || bleStore.etat === 'erreur') return 'warning'
  return 'primary'
})

const chargerContexte = async (): Promise<void> => {
  await Promise.all([plantsStore.chargerPlantes(), sensorsStore.chargerCapteurs()])
  await bleStore.initialiser()
}

const getSignalLabel = (rssi: number | null): string => {
  if (rssi === null) return 'Signal détecté'
  if (rssi >= -60) return 'Signal excellent'
  if (rssi >= -75) return 'Bon signal'
  return 'Signal faible · rapprochez le capteur'
}

const getAssociatedSensor = (deviceId: string) =>
  sensorsStore.capteurs.find((capteur) => capteur.deviceIdentifier === deviceId)

const getAssociationLabel = (deviceId: string): string | null => {
  const sensor = getAssociatedSensor(deviceId)

  if (!sensor?.plantId) {
    return null
  }

  if (sensor.plantId === plantId.value) {
    return `Associé à ${plante.value?.name ?? 'cette plante'}`
  }

  const associatedPlant = plantsStore.getPlanteParId(sensor.plantId)
  return `Associé à ${associatedPlant?.name ?? 'une autre plante'}`
}

const isAssociatedElsewhere = (deviceId: string): boolean => {
  const sensor = getAssociatedSensor(deviceId)
  return sensor?.plantId !== null && sensor?.plantId !== undefined && sensor.plantId !== plantId.value
}

const selectionnerCapteur = (deviceId: string): void => {
  selectionAutomatiqueActive.value = false
  selection.deviceId = deviceId
}

const selectionnerPremierCapteurDisponible = (): void => {
  if (!selectionAutomatiqueActive.value || selection.deviceId !== '') return

  const premierCapteur = capteursTries.value.find((capteur) => !isAssociatedElsewhere(capteur.deviceId))
  selection.deviceId = premierCapteur?.deviceId ?? ''
}

watch(capteursTries, selectionnerPremierCapteurDisponible, { deep: true })

const activerBluetooth = async (): Promise<void> => {
  await bleStore.demanderActivationBluetooth()
}

const basculerScan = async (): Promise<void> => {
  if (bleStore.estScanEnCours) {
    await bleStore.arreterScan()
    return
  }

  selection.deviceId = ''
  selectionAutomatiqueActive.value = true
  bleStore.dernieresMesuresTest = null
  await bleStore.lancerScan()
  selectionnerPremierCapteurDisponible()
}

const confirmerRemplacement = async (): Promise<boolean> => {
  if (!capteurAssocie.value || capteurAssocie.value.deviceIdentifier === selection.deviceId) {
    return true
  }

  const confirmation = await alertController.create({
    header: 'Remplacer le capteur ?',
    message: 'Les anciennes mesures seront conservées. Le nouveau capteur deviendra la source des prochaines mesures.',
    buttons: [
      { text: 'Annuler', role: 'cancel' },
      { text: 'Remplacer', role: 'confirm' },
    ],
  })

  await confirmation.present()
  const { role } = await confirmation.onDidDismiss()
  return role === 'confirm'
}

const dissocierCapteur = async (): Promise<void> => {
  if (!capteurAssocie.value) return

  const sensorId = capteurAssocie.value.id
  const confirmation = await alertController.create({
    header: 'Dissocier ce capteur ?',
    message: 'Les mesures déjà enregistrées seront conservées.',
    buttons: [
      { text: 'Annuler', role: 'cancel' },
      { text: 'Dissocier', role: 'confirm', cssClass: 'alert-confirm-danger' },
    ],
  })
  await confirmation.present()
  if ((await confirmation.onDidDismiss()).role !== 'confirm') return

  await sensorsStore.supprimerCapteur(sensorId)
  if (sensorsStore.erreur) {
    await showErrorFeedback('Impossible de dissocier le capteur.')
    return
  }

  await plantsStore.chargerPlantes()
  await showSuccessFeedback('Capteur dissocié.')
  await router.replace(`/plants/${plantId.value}`)
}

const associerCapteur = async (): Promise<void> => {
  if (!plante.value || selection.deviceId === '' || !(await confirmerRemplacement())) {
    return
  }

  const isReplacing = capteurAssocie.value !== undefined
  isBusy.value = true

  try {
    await bleStore.arreterScan()
    const result = await bleStore.associerCapteurAPlante(plante.value.id, selection.deviceId)

    if (result === null) {
      await showErrorFeedback(bleStore.erreur ?? "Impossible de connecter ce capteur.")
      return
    }

    await showSuccessFeedback(isReplacing ? 'Capteur remplacé.' : 'Capteur associé.')
    await router.replace(`/plants/${plante.value.id}`)
  } finally {
    isBusy.value = false
  }
}

onIonViewWillEnter(() => void chargerContexte())
onIonViewWillLeave(() => {
  void bleStore.arreterScan()
  void bleStore.deconnecter()
})

useGsapReveal({ rootSelector: '.ble-pairing-page', itemSelector: '.senvia-reveal' })
</script>

<style scoped>
.ble-pairing-page ion-content { --padding-bottom: 2rem; }
.flow-navigation { max-width: 720px; margin: 0 auto 0.85rem; }
.pairing-intro, .pairing-panel, .connect-panel, .current-sensor { max-width: 720px; margin-right: auto; margin-left: auto; }
.pairing-intro { margin-top: 0.35rem; margin-bottom: 1rem; }
.pairing-intro__step, .pairing-panel__label, .connect-panel span { color: var(--ion-color-primary-shade); font-size: 0.72rem; font-weight: 750; letter-spacing: 0.06em; text-transform: uppercase; }
.pairing-intro h1 { margin: 0.25rem 0 0; font-size: clamp(1.55rem, 7vw, 2.15rem); letter-spacing: -0.035em; }
.pairing-intro p, .current-sensor p, .connect-panel p { margin: 0.35rem 0 0; color: var(--senvia-text-muted); line-height: 1.45; }
.current-sensor { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.8rem; padding: 0.8rem 0.95rem; border: 1px solid rgba(var(--ion-color-success-rgb), 0.25); border-radius: 16px; background: rgba(var(--ion-color-success-rgb), 0.08); }
.current-sensor__dot { width: 0.65rem; height: 0.65rem; border-radius: 50%; background: var(--ion-color-success); }
.current-sensor__copy { flex: 1; min-width: 0; }
.current-sensor p { margin-top: 0.1rem; font-size: 0.8rem; }
.pairing-panel, .connect-panel { padding: 1rem; border: 1px solid var(--senvia-card-border); border-radius: 22px; background: var(--senvia-surface); box-shadow: 0 12px 30px var(--senvia-shadow-color); }
.pairing-panel__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.7rem; margin-bottom: 0.85rem; }
.pairing-panel__header h2 { margin: 0.2rem 0 0; font-size: 1.12rem; }
.sensor-results { display: grid; gap: 0.5rem; margin-top: 0.8rem; }
.sensor-result { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.7rem; width: 100%; padding: 0.72rem; border: 1px solid var(--senvia-card-border); border-radius: 16px; text-align: left; color: var(--ion-text-color); background: var(--senvia-surface-2); }
.sensor-result--selected { border-color: var(--ion-color-primary); background: rgba(var(--ion-color-primary-rgb), 0.1); }
.sensor-result--unavailable { cursor: not-allowed; opacity: 0.62; }
.sensor-result__icon { display: grid; place-items: center; width: 2.45rem; height: 2.45rem; border-radius: 13px; color: var(--ion-color-primary-shade); background: rgba(var(--ion-color-primary-rgb), 0.12); }
.sensor-result__copy strong, .sensor-result__copy small { display: block; }
.sensor-result__copy small { margin-top: 0.15rem; color: var(--senvia-text-muted); }
.sensor-result__association { color: var(--ion-color-primary-shade) !important; font-weight: 700; }
.sensor-result--unavailable .sensor-result__association { color: var(--ion-color-warning-shade) !important; }
.sensor-result__check { color: transparent; font-size: 1.4rem; }
.sensor-result--selected .sensor-result__check { color: var(--ion-color-primary); }
.sensor-empty { display: flex; align-items: center; gap: 0.65rem; margin-top: 0.8rem; padding: 0.9rem; border-radius: 15px; color: var(--senvia-text-muted); background: var(--senvia-surface-2); }
.sensor-empty ion-icon { flex: 0 0 auto; font-size: 1.25rem; }
.sensor-empty p { margin: 0; font-size: 0.84rem; }
.connect-panel { margin-top: 0.8rem; box-shadow: none; }
.connect-panel--ready { border-color: rgba(var(--ion-color-primary-rgb), 0.42); }
.connect-panel ion-button { margin-top: 0.8rem; }
</style>
