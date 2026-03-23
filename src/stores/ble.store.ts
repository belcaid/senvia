import { Capacitor } from '@capacitor/core'
import {
  BleClient,
  type BleDevice,
  type RequestBleDeviceOptions,
  type ScanResult,
} from '@capacitor-community/bluetooth-le'
import { defineStore } from 'pinia'
import {
  BLE_OPTIONAL_SERVICE_UUIDS,
  BleApplicationError,
  getBleDefaultErrorMessage,
  isWebBluetoothSupported,
  readBleMeasurementSnapshot,
  toBleApplicationError,
} from '@/services/ble-sensor.service'
import { useMeasurementsStore } from '@/stores/measurements.store'
import { usePlantsStore } from '@/stores/plants.store'
import { useSensorsStore } from '@/stores/sensors.store'
import { useSettingsStore } from '@/stores/settings.store'
import type { BleErrorCode, BleMeasurementSnapshot, BleStateStatus } from '@/types/ble.types'
import type { SensorModel } from '@/types/sensor-device.types'

export interface BleScanDevice {
  deviceId: string
  name: string
  rssi: number | null
  localName: string | null
  uuids: string[]
}

interface BleState {
  estInitialise: boolean
  etat: BleStateStatus
  bluetoothActif: boolean
  localisationActive: boolean | null
  estScanEnCours: boolean
  capteursDetectes: BleScanDevice[]
  capteurConnecteId: string | null
  dernieresMesuresTest: BleMeasurementSnapshot | null
  codeErreur: BleErrorCode | null
  erreur: string | null
}

const DEFAULT_SCAN_OPTIONS: RequestBleDeviceOptions = {
  services: [],
  optionalServices: BLE_OPTIONAL_SERVICE_UUIDS,
  allowDuplicates: false,
}

const platform = Capacitor.getPlatform()

type NavigatorBluetoothWithScan = Navigator & {
  bluetooth?: Bluetooth & {
    requestLEScan?: (...args: unknown[]) => Promise<unknown>
  }
}

const isWebRequestLeScanSupported = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false
  }

  const bluetooth = (navigator as NavigatorBluetoothWithScan).bluetooth
  return typeof bluetooth?.requestLEScan === 'function'
}

const infererModeleCapteur = (name: string): SensorModel => {
  const normalized = name.toLowerCase()

  if (normalized.includes('hhcc')) {
    return 'hhcc'
  }

  if (normalized.includes('flower') || normalized.includes('flora') || normalized.includes('mi')) {
    return 'flower-care'
  }

  return 'other'
}

const toDeviceNameFallback = (deviceId: string): string => {
  const suffix = deviceId.slice(-6).toUpperCase()
  return suffix.length > 0 ? `Capteur ${suffix}` : 'Capteur BLE'
}

const ensureString = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  return String(value)
}

export const useBleStore = defineStore('ble', {
  state: (): BleState => ({
    estInitialise: false,
    etat: 'indisponible',
    bluetoothActif: false,
    localisationActive: null,
    estScanEnCours: false,
    capteursDetectes: [],
    capteurConnecteId: null,
    dernieresMesuresTest: null,
    codeErreur: null,
    erreur: null,
  }),
  getters: {
    estConnecte(state): boolean {
      return state.capteurConnecteId !== null
    },
    estPret(state): boolean {
      return state.etat === 'pret' || state.etat === 'connecte'
    },
  },
  actions: {
    estPlateformeSupportee(): boolean {
      if (platform === 'web') {
        return isWebBluetoothSupported()
      }

      return true
    },
    effacerErreur(): void {
      this.codeErreur = null
      this.erreur = null
    },
    definirErreur(code: BleErrorCode, message?: string): void {
      this.codeErreur = code
      this.erreur = message ?? getBleDefaultErrorMessage(code)
      this.etat = 'erreur'
    },
    appliquerErreur(error: unknown, fallbackCode: BleErrorCode = 'unknown'): void {
      const bleError = toBleApplicationError(error, fallbackCode)

      if (bleError.code === 'unknown') {
        this.definirErreur('unknown', ensureString(bleError.message))
        return
      }

      const detail = ensureString(bleError.message).trim()
      const defaultMessage = getBleDefaultErrorMessage(bleError.code)

      if (detail !== '' && detail !== defaultMessage) {
        this.definirErreur(bleError.code, detail)
        return
      }

      this.definirErreur(bleError.code)
    },
    mettreAJourEtatMetier(): void {
      if (this.codeErreur !== null) {
        this.etat = 'erreur'
        return
      }

      if (!this.estPlateformeSupportee()) {
        this.etat = 'indisponible'
        return
      }

      if (this.estScanEnCours) {
        this.etat = 'en_scan'
        return
      }

      if (this.capteurConnecteId !== null) {
        this.etat = 'connecte'
        return
      }

      if (!this.estInitialise) {
        this.etat = 'indisponible'
        return
      }

      this.etat = this.bluetoothActif ? 'pret' : 'desactive'
    },
    async verifierPrerequisAndroid(): Promise<void> {
      if (platform !== 'android') {
        this.localisationActive = null
        return
      }

      try {
        this.localisationActive = await BleClient.isLocationEnabled()
      } catch {
        this.localisationActive = null
      }
    },
    async initialiser(): Promise<void> {
      if (!this.estPlateformeSupportee()) {
        this.definirErreur('unavailable')
        return
      }

      if (this.estInitialise) {
        await this.rafraichirEtatBluetooth()
        return
      }

      this.effacerErreur()

      try {
        await BleClient.initialize({
          androidNeverForLocation: true,
        })
        this.estInitialise = true
        await this.rafraichirEtatBluetooth()
      } catch (error) {
        this.estInitialise = false
        this.appliquerErreur(error, 'unavailable')
      } finally {
        this.mettreAJourEtatMetier()
      }
    },
    async rafraichirEtatBluetooth(): Promise<void> {
      this.effacerErreur()

      try {
        if (!this.estInitialise) {
          await this.initialiser()
          return
        }

        this.bluetoothActif = await BleClient.isEnabled()
        await this.verifierPrerequisAndroid()
      } catch (error) {
        this.appliquerErreur(error, 'unknown')
      } finally {
        this.mettreAJourEtatMetier()
      }
    },
    async demanderActivationBluetooth(): Promise<void> {
      this.effacerErreur()

      try {
        if (!this.estInitialise) {
          await this.initialiser()
        }

        if (!this.estInitialise) {
          return
        }

        if (platform === 'android') {
          await BleClient.requestEnable()
        }

        await this.rafraichirEtatBluetooth()
      } catch (error) {
        this.appliquerErreur(error, 'bluetooth_disabled')
      } finally {
        this.mettreAJourEtatMetier()
      }
    },
    mapScanResult(result: ScanResult): BleScanDevice | null {
      const deviceId = result.device.deviceId.trim()

      if (deviceId === '') {
        return null
      }

      return {
        deviceId,
        name: result.device.name ?? result.localName ?? toDeviceNameFallback(deviceId),
        rssi: result.rssi ?? null,
        localName: result.localName ?? null,
        uuids: result.uuids ?? [],
      }
    },
    mapBleDevice(device: BleDevice): BleScanDevice | null {
      const deviceId = device.deviceId.trim()

      if (deviceId === '') {
        return null
      }

      return {
        deviceId,
        name: device.name ?? toDeviceNameFallback(deviceId),
        rssi: null,
        localName: device.name ?? null,
        uuids: device.uuids ?? [],
      }
    },
    async lancerScan(options: RequestBleDeviceOptions = DEFAULT_SCAN_OPTIONS): Promise<void> {
      this.effacerErreur()

      try {
        if (!this.estInitialise) {
          await this.initialiser()
        }

        if (!this.estInitialise) {
          return
        }

        if (!this.bluetoothActif) {
          throw new BleApplicationError('bluetooth_disabled', getBleDefaultErrorMessage('bluetooth_disabled'))
        }

        if (platform === 'android' && this.localisationActive === false) {
          throw new BleApplicationError('permissions_denied', getBleDefaultErrorMessage('permissions_denied'))
        }

        const scanOptions = {
          ...DEFAULT_SCAN_OPTIONS,
          ...options,
          optionalServices: [...new Set([...(DEFAULT_SCAN_OPTIONS.optionalServices ?? []), ...(options.optionalServices ?? [])])],
        }

        this.capteursDetectes = []
        this.dernieresMesuresTest = null

        if (platform === 'web' && !isWebRequestLeScanSupported()) {
          const device = await BleClient.requestDevice(scanOptions)
          const mappedDevice = this.mapBleDevice(device)
          this.capteursDetectes = mappedDevice ? [mappedDevice] : []
          this.estScanEnCours = false
          return
        }

        this.estScanEnCours = true
        this.mettreAJourEtatMetier()

        await BleClient.requestLEScan(scanOptions, (result) => {
            const mapped = this.mapScanResult(result)

            if (mapped === null) {
              return
            }

            const existingIndex = this.capteursDetectes.findIndex((item) => item.deviceId === mapped.deviceId)

            if (existingIndex === -1) {
              this.capteursDetectes = [mapped, ...this.capteursDetectes]
              return
            }

            const next = [...this.capteursDetectes]
            next[existingIndex] = mapped
            this.capteursDetectes = next
          })
      } catch (error) {
        this.estScanEnCours = false
        this.appliquerErreur(error, 'unknown')
      } finally {
        this.mettreAJourEtatMetier()
      }
    },
    async arreterScan(): Promise<void> {
      this.effacerErreur()

      try {
        if (!this.estScanEnCours) {
          return
        }

        await BleClient.stopLEScan()
      } catch (error) {
        this.appliquerErreur(error, 'unknown')
      } finally {
        this.estScanEnCours = false
        this.mettreAJourEtatMetier()
      }
    },
    async connecter(deviceId: string): Promise<void> {
      this.effacerErreur()

      try {
        const normalizedDeviceId = deviceId.trim()

        if (normalizedDeviceId === '') {
          throw new BleApplicationError('sensor_not_found', getBleDefaultErrorMessage('sensor_not_found'))
        }

        if (!this.estInitialise) {
          await this.initialiser()
        }

        if (!this.estInitialise) {
          return
        }

        if (!this.bluetoothActif) {
          throw new BleApplicationError('bluetooth_disabled', getBleDefaultErrorMessage('bluetooth_disabled'))
        }

        if (this.estScanEnCours) {
          await this.arreterScan()
        }

        await BleClient.connect(normalizedDeviceId, (disconnectedId) => {
          if (this.capteurConnecteId === disconnectedId) {
            this.capteurConnecteId = null
            this.mettreAJourEtatMetier()
          }
        })
        this.capteurConnecteId = normalizedDeviceId
      } catch (error) {
        this.appliquerErreur(error, 'sensor_not_found')
      } finally {
        this.mettreAJourEtatMetier()
      }
    },
    async deconnecter(deviceId?: string, options: { preserveError?: boolean } = {}): Promise<void> {
      if (!options.preserveError) {
        this.effacerErreur()
      }

      const cible = deviceId ?? this.capteurConnecteId

      if (cible === null) {
        return
      }

      try {
        await BleClient.disconnect(cible)
      } catch (error) {
        if (!options.preserveError) {
          this.appliquerErreur(error, 'unknown')
        }
      } finally {
        if (this.capteurConnecteId === cible) {
          this.capteurConnecteId = null
        }

        this.mettreAJourEtatMetier()
      }
    },
    async testerConnexionEtLireMesures(
      deviceId: string,
      options: { forceBatteryRead?: boolean } = {},
    ): Promise<BleMeasurementSnapshot | null> {
      this.effacerErreur()
      const settingsStore = useSettingsStore()
      const sensorsStore = useSensorsStore()

      try {
        if (!this.estInitialise) {
          await this.initialiser()
        }

        if (!this.estInitialise) {
          return null
        }

        await sensorsStore.chargerCapteurs()
        await settingsStore.chargerParametres()
        await this.connecter(deviceId)

        if (this.capteurConnecteId !== deviceId) {
          throw new BleApplicationError('sensor_not_found', getBleDefaultErrorMessage('sensor_not_found'))
        }

        const capteurExistant = sensorsStore.capteurs.find((item) => item.deviceIdentifier === deviceId)
        const measures = await readBleMeasurementSnapshot(deviceId, {
          forceBatteryRead: options.forceBatteryRead ?? false,
          batteryReadIntervalHours: settingsStore.parametres.batteryReadIntervalHours,
          lastBatteryReadAt: capteurExistant?.lastBatteryReadAt ?? null,
        })
        this.dernieresMesuresTest = measures
        return measures
      } catch (error) {
        this.appliquerErreur(error, 'unknown')
        return null
      } finally {
        this.mettreAJourEtatMetier()
      }
    },
    async associerCapteurAPlante(
      plantId: string,
      deviceId: string,
    ): Promise<{ sensorId: string; measurementId: string } | null> {
      this.effacerErreur()
      const plantsStore = usePlantsStore()
      const sensorsStore = useSensorsStore()
      const measurementsStore = useMeasurementsStore()

      try {
        await Promise.all([plantsStore.chargerPlantes(), sensorsStore.chargerCapteurs()])

        const plante = plantsStore.getPlanteParId(plantId)

        if (!plante) {
          throw new BleApplicationError('sensor_not_found', 'Plante introuvable pour association.')
        }

        const capteurExistant = sensorsStore.capteurs.find((item) => item.deviceIdentifier === deviceId)

        if (capteurExistant && capteurExistant.plantId !== null && capteurExistant.plantId !== plantId) {
          throw new BleApplicationError('sensor_already_paired', getBleDefaultErrorMessage('sensor_already_paired'))
        }

        const capteurActuelPlante = sensorsStore.capteurs.find(
          (item) => item.plantId === plantId && item.deviceIdentifier !== deviceId,
        )

        if (capteurActuelPlante) {
          await sensorsStore.modifierCapteur(capteurActuelPlante.id, {
            plantId: null,
            lastSeenAt: new Date().toISOString(),
          })
        }

        const mesures = await this.testerConnexionEtLireMesures(deviceId, { forceBatteryRead: true })

        if (mesures === null) {
          return null
        }

        const device = this.capteursDetectes.find((item) => item.deviceId === deviceId)
        const deviceName = device?.name ?? capteurExistant?.deviceName ?? toDeviceNameFallback(deviceId)
        const sensorModel = infererModeleCapteur(deviceName)

        let capteurId: string
        let batteryLevel = mesures.batteryLevel
        let batteryReadAt = mesures.batteryReadAt

        if (capteurExistant) {
          const currentBatteryLevel = capteurExistant.batteryLevel
          const currentBatteryReadAt = capteurExistant.lastBatteryReadAt

          batteryLevel = batteryLevel ?? currentBatteryLevel
          batteryReadAt = batteryReadAt ?? currentBatteryReadAt

          const updated = await sensorsStore.modifierCapteur(capteurExistant.id, {
            plantId,
            deviceName,
            model: sensorModel,
            batteryLevel,
            lastBatteryReadAt: batteryReadAt,
            lastSeenAt: mesures.measuredAt,
          })

          if (!updated) {
            throw new BleApplicationError('unknown', "Impossible de mettre a jour le capteur associe.")
          }

          capteurId = updated.id
        } else {
          const created = await sensorsStore.ajouterCapteur({
            plantId,
            deviceIdentifier: deviceId,
            deviceName,
            model: sensorModel,
            batteryLevel,
            lastBatteryReadAt: batteryReadAt,
            pairedAt: new Date().toISOString(),
            lastSeenAt: mesures.measuredAt,
          })

          if (!created) {
            throw new BleApplicationError('unknown', "Impossible d'enregistrer le capteur associe.")
          }

          capteurId = created.id
        }

        const planteModifiee = await plantsStore.modifierPlante(plantId, { sensorId: capteurId })

        if (!planteModifiee) {
          throw new BleApplicationError('unknown', "Impossible d'associer le capteur a la plante.")
        }

        const mesure = await measurementsStore.ajouterMesure({
          plantId,
          sensorId: capteurId,
          measuredAt: mesures.measuredAt,
          temperature: mesures.temperature,
          moisture: mesures.moisture,
          light: mesures.light,
          conductivity: mesures.conductivity,
          batteryLevel: batteryLevel,
          source: 'pairing_validation',
        })

        if (!mesure) {
          throw new BleApplicationError('invalid_read', getBleDefaultErrorMessage('invalid_read'))
        }

        await Promise.all([
          plantsStore.chargerPlantes(),
          sensorsStore.chargerCapteurs(),
          measurementsStore.chargerDerniereMesure(plantId),
        ])

        return {
          sensorId: capteurId,
          measurementId: mesure.id,
        }
      } catch (error) {
        this.appliquerErreur(error, 'unknown')
        return null
      } finally {
        await this.deconnecter(deviceId, { preserveError: true })
        this.mettreAJourEtatMetier()
      }
    },
    reinitialiserScan(): void {
      this.capteursDetectes = []
      this.dernieresMesuresTest = null
    },
  },
})
