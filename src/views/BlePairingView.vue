<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="`/plants/${plantId}`" />
        </ion-buttons>
        <ion-title>Pairing BLE</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-note v-if="plantsStore.erreur" class="feedback" color="danger">{{ plantsStore.erreur }}</ion-note>
      <ion-note v-if="sensorsStore.erreur" class="feedback" color="danger">{{ sensorsStore.erreur }}</ion-note>
      <ion-note v-if="bleStore.erreur" class="feedback" color="danger">{{ bleStore.erreur }}</ion-note>

      <template v-if="plante">
        <ion-card>
          <ion-card-header>
            <ion-card-title>{{ plante.name }}</ion-card-title>
            <ion-card-subtitle>Association capteur BLE</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-chip :color="etatColor">
              <ion-label>{{ etatLabel }}</ion-label>
            </ion-chip>
            <p>Bluetooth: {{ bleStore.bluetoothActif ? 'active' : 'desactive' }}</p>
            <p v-if="isAndroid">Localisation Android: {{ localisationLabel }}</p>
            <p v-if="capteurAssocie">
              Capteur actuel: {{ capteurAssocie.deviceName }} ({{ capteurAssocie.deviceIdentifier }})
            </p>
          </ion-card-content>
        </ion-card>

        <div class="actions-row">
          <ion-button size="small" fill="outline" @click="rafraichirEtat">Rafraichir etat</ion-button>
          <ion-button v-if="isAndroid && !bleStore.bluetoothActif" size="small" @click="activerBluetooth">
            Activer Bluetooth
          </ion-button>
          <ion-button size="small" color="primary" @click="basculerScan">
            {{ bleStore.estScanEnCours ? 'Arreter scan' : 'Lancer scan' }}
          </ion-button>
        </div>

        <ion-list inset>
          <ion-list-header>
            <ion-label>Capteurs detectes ({{ capteursTries.length }})</ion-label>
          </ion-list-header>

          <ion-item
            v-for="capteur in capteursTries"
            :key="capteur.deviceId"
            button
            :detail="false"
            @click="selectionnerCapteur(capteur.deviceId)"
          >
            <ion-radio slot="start" :checked="selection.deviceId === capteur.deviceId" />
            <ion-label>
              <h3>{{ capteur.name }}</h3>
              <p>{{ capteur.deviceId }}</p>
              <p>RSSI: {{ capteur.rssi ?? 'n/a' }}</p>
            </ion-label>
          </ion-item>

          <ion-item v-if="capteursTries.length === 0">
            <ion-label>Aucun capteur detecte. Lancez un scan BLE.</ion-label>
          </ion-item>
        </ion-list>

        <div class="actions-col">
          <ion-button
            :disabled="selection.deviceId === '' || isBusy"
            expand="block"
            fill="outline"
            @click="testerConnexion"
          >
            {{ isBusy ? 'Test...' : 'Tester connexion + lecture' }}
          </ion-button>
          <ion-button
            :disabled="selection.deviceId === '' || bleStore.dernieresMesuresTest === null || isBusy"
            expand="block"
            @click="associerCapteur"
          >
            {{ isBusy ? 'Association...' : 'Associer ce capteur' }}
          </ion-button>
          <ion-button
            :disabled="!bleStore.estConnecte || isBusy"
            expand="block"
            fill="clear"
            @click="deconnecter"
          >
            Deconnecter
          </ion-button>
        </div>

        <ion-card v-if="bleStore.dernieresMesuresTest" class="measure-card">
          <ion-card-header>
            <ion-card-title>Lecture capteur</ion-card-title>
            <ion-card-subtitle>{{ formatDateTime(bleStore.dernieresMesuresTest.measuredAt) }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <p>Temperature: {{ bleStore.dernieresMesuresTest.temperature.toFixed(1) }} C</p>
            <p>Humidite sol: {{ bleStore.dernieresMesuresTest.moisture.toFixed(1) }} %</p>
            <p>Lumiere: {{ Math.round(bleStore.dernieresMesuresTest.light) }} lx</p>
            <p>Fertilite: {{ Math.round(bleStore.dernieresMesuresTest.conductivity) }} uS/cm</p>
            <p>
              Batterie:
              {{ bleStore.dernieresMesuresTest.batteryLevel === null ? 'non lue' : `${Math.round(bleStore.dernieresMesuresTest.batteryLevel)} %` }}
            </p>
          </ion-card-content>
        </ion-card>
      </template>

      <ion-card v-else>
        <ion-card-header>
          <ion-card-title>Plante introuvable</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-button router-link="/tabs/dashboard">Retour Dashboard</ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonRadio,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
  onIonViewWillLeave,
} from '@ionic/vue'
import { Capacitor } from '@capacitor/core'
import { useRoute, useRouter } from 'vue-router'
import { useBleStore } from '@/stores/ble.store'
import { usePlantsStore } from '@/stores/plants.store'
import { useSensorsStore } from '@/stores/sensors.store'
import { formatDateTime } from '@/utils/date.util'

const route = useRoute()
const router = useRouter()

const bleStore = useBleStore()
const plantsStore = usePlantsStore()
const sensorsStore = useSensorsStore()

const selection = reactive({
  deviceId: '',
})
const isBusy = ref(false)

const plantId = computed(() => String(route.params.plantId ?? ''))
const plante = computed(() => plantsStore.getPlanteParId(plantId.value))
const capteurAssocie = computed(() => sensorsStore.getCapteurParPlanteId(plantId.value))
const capteursTries = computed(() =>
  [...bleStore.capteursDetectes].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999)),
)

const isAndroid = computed(() => Capacitor.getPlatform() === 'android')

const etatLabel = computed(() => {
  switch (bleStore.etat) {
    case 'desactive':
      return 'Bluetooth desactive'
    case 'indisponible':
      return 'Bluetooth indisponible'
    case 'en_scan':
      return 'Scan en cours'
    case 'connecte':
      return 'Capteur connecte'
    case 'erreur':
      return 'Erreur BLE'
    case 'pret':
    default:
      return 'BLE pret'
  }
})

const etatColor = computed(() => {
  switch (bleStore.etat) {
    case 'desactive':
      return 'warning'
    case 'indisponible':
      return 'medium'
    case 'en_scan':
      return 'tertiary'
    case 'connecte':
      return 'success'
    case 'erreur':
      return 'danger'
    case 'pret':
    default:
      return 'primary'
  }
})

const localisationLabel = computed(() => {
  if (bleStore.localisationActive === null) {
    return 'inconnu'
  }

  return bleStore.localisationActive ? 'active' : 'inactive'
})

const chargerContexte = async (): Promise<void> => {
  await Promise.all([plantsStore.chargerPlantes(), sensorsStore.chargerCapteurs()])
  await bleStore.initialiser()
}

const selectionnerCapteur = (deviceId: string): void => {
  selection.deviceId = deviceId
}

const rafraichirEtat = async (): Promise<void> => {
  await bleStore.rafraichirEtatBluetooth()
}

const activerBluetooth = async (): Promise<void> => {
  await bleStore.demanderActivationBluetooth()
}

const basculerScan = async (): Promise<void> => {
  if (bleStore.estScanEnCours) {
    await bleStore.arreterScan()
    return
  }

  selection.deviceId = ''
  await bleStore.lancerScan()
}

const testerConnexion = async (): Promise<void> => {
  if (selection.deviceId.trim() === '') {
    return
  }

  isBusy.value = true

  try {
    await bleStore.testerConnexionEtLireMesures(selection.deviceId, { forceBatteryRead: true })
  } finally {
    isBusy.value = false
  }
}

const associerCapteur = async (): Promise<void> => {
  if (!plante.value || selection.deviceId.trim() === '') {
    return
  }

  isBusy.value = true

  try {
    const result = await bleStore.associerCapteurAPlante(plante.value.id, selection.deviceId)

    if (result !== null) {
      await router.replace(`/plants/${plante.value.id}`)
    }
  } finally {
    isBusy.value = false
  }
}

const deconnecter = async (): Promise<void> => {
  await bleStore.deconnecter()
}

onIonViewWillEnter(() => {
  void chargerContexte()
})

onIonViewWillLeave(() => {
  void bleStore.arreterScan()
  void bleStore.deconnecter()
})
</script>

<style scoped>
.feedback {
  display: block;
  margin: 0.2rem 0.2rem 0.5rem;
}

.actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.5rem 0 0.75rem;
}

.actions-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0.75rem 0;
}

.measure-card p {
  margin: 0.35rem 0;
}
</style>
