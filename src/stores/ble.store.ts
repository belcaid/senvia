import { BleClient, type RequestBleDeviceOptions } from '@capacitor-community/bluetooth-le'
import { defineStore } from 'pinia'
import { toErrorMessage } from '@/stores/store.utils'

export interface BleScanDevice {
  deviceId: string
  name: string
  rssi: number | null
  localName: string | null
}

interface BleState {
  estInitialise: boolean
  bluetoothActif: boolean
  estScanEnCours: boolean
  capteursDetectes: BleScanDevice[]
  capteurConnecteId: string | null
  erreur: string | null
}

const DEFAULT_SCAN_OPTIONS: RequestBleDeviceOptions = {
  services: [],
  optionalServices: [],
  allowDuplicates: false,
}

export const useBleStore = defineStore('ble', {
  state: (): BleState => ({
    estInitialise: false,
    bluetoothActif: false,
    estScanEnCours: false,
    capteursDetectes: [],
    capteurConnecteId: null,
    erreur: null,
  }),
  getters: {
    estConnecte(state): boolean {
      return state.capteurConnecteId !== null
    },
  },
  actions: {
    async initialiser(): Promise<void> {
      if (this.estInitialise) {
        return
      }

      this.erreur = null

      try {
        await BleClient.initialize()
        this.bluetoothActif = await BleClient.isEnabled()
        this.estInitialise = true
      } catch (error) {
        this.erreur = toErrorMessage(error, "Impossible d'initialiser le BLE")
      }
    },
    async rafraichirEtatBluetooth(): Promise<void> {
      this.erreur = null

      try {
        if (!this.estInitialise) {
          await this.initialiser()
        }

        if (!this.estInitialise) {
          return
        }

        this.bluetoothActif = await BleClient.isEnabled()
      } catch (error) {
        this.erreur = toErrorMessage(error, "Impossible de verifier l'etat Bluetooth")
      }
    },
    async lancerScan(options: RequestBleDeviceOptions = DEFAULT_SCAN_OPTIONS): Promise<void> {
      this.erreur = null

      try {
        if (!this.estInitialise) {
          await this.initialiser()
        }

        if (!this.estInitialise) {
          return
        }

        this.capteursDetectes = []
        this.estScanEnCours = true

        await BleClient.requestLEScan(options, (result) => {
          const device = result.device
          const deviceId = device.deviceId

          if (deviceId.trim() === '') {
            return
          }

          const mappedDevice: BleScanDevice = {
            deviceId,
            name: device.name ?? result.localName ?? deviceId,
            rssi: result.rssi ?? null,
            localName: result.localName ?? null,
          }

          const existingIndex = this.capteursDetectes.findIndex((item) => item.deviceId === deviceId)

          if (existingIndex === -1) {
            this.capteursDetectes = [mappedDevice, ...this.capteursDetectes]
            return
          }

          const next = [...this.capteursDetectes]
          next[existingIndex] = mappedDevice
          this.capteursDetectes = next
        })
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de lancer le scan BLE')
        this.estScanEnCours = false
      }
    },
    async arreterScan(): Promise<void> {
      this.erreur = null

      try {
        if (!this.estScanEnCours) {
          return
        }

        await BleClient.stopLEScan()
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible d arreter le scan BLE')
      } finally {
        this.estScanEnCours = false
      }
    },
    async connecter(deviceId: string): Promise<void> {
      this.erreur = null

      try {
        if (!this.estInitialise) {
          await this.initialiser()
        }

        if (!this.estInitialise) {
          return
        }

        await BleClient.connect(deviceId, () => {
          if (this.capteurConnecteId === deviceId) {
            this.capteurConnecteId = null
          }
        })
        this.capteurConnecteId = deviceId
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de connecter le capteur BLE')
      }
    },
    async deconnecter(deviceId?: string): Promise<void> {
      this.erreur = null

      const cible = deviceId ?? this.capteurConnecteId

      if (cible === null) {
        return
      }

      try {
        await BleClient.disconnect(cible)
      } catch (error) {
        this.erreur = toErrorMessage(error, "Impossible de deconnecter le capteur BLE")
      } finally {
        if (this.capteurConnecteId === cible) {
          this.capteurConnecteId = null
        }
      }
    },
    reinitialiserScan(): void {
      this.capteursDetectes = []
    },
  },
})
