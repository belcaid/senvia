import { BleClient, numberToUUID, type BleService } from '@capacitor-community/bluetooth-le'
import type { BleErrorCode, BleMeasurementSnapshot } from '@/types/ble.types'

interface ReadBleMeasurementOptions {
  forceBatteryRead?: boolean
  batteryReadIntervalHours?: number
  lastBatteryReadAt?: string | null
}

interface CharacteristicAddress {
  service: string
  characteristic: string
}

interface CharacteristicCandidate {
  service?: string
  characteristic: string
}

interface ResolvedBleCharacteristics {
  mode: CharacteristicAddress | null
  combined: CharacteristicAddress | null
  temperature: CharacteristicAddress | null
  moisture: CharacteristicAddress | null
  light: CharacteristicAddress | null
  conductivity: CharacteristicAddress | null
  battery: CharacteristicAddress | null
}

interface CombinedReadValues {
  temperature: number
  moisture: number
  light: number
  conductivity: number
}

const ENVIRONMENTAL_SENSING_SERVICE_UUID = numberToUUID(0x181a)
const TEMPERATURE_CHARACTERISTIC_UUID = numberToUUID(0x2a6e)
const HUMIDITY_CHARACTERISTIC_UUID = numberToUUID(0x2a6f)
const ILLUMINANCE_CHARACTERISTIC_UUID = numberToUUID(0x2afb)
const ANALOG_CONDUCTIVITY_CHARACTERISTIC_UUID = numberToUUID(0x2a58)

const BATTERY_SERVICE_UUID = numberToUUID(0x180f)
const BATTERY_LEVEL_CHARACTERISTIC_UUID = numberToUUID(0x2a19)

const FLOWER_CARE_SERVICE_UUID = '00001204-0000-1000-8000-00805f9b34fb'
const FLOWER_CARE_MODE_CHARACTERISTIC_UUID = '00001a00-0000-1000-8000-00805f9b34fb'
const FLOWER_CARE_COMBINED_CHARACTERISTIC_UUID = '00001a01-0000-1000-8000-00805f9b34fb'
const FLOWER_CARE_BATTERY_CHARACTERISTIC_UUID = '00001a02-0000-1000-8000-00805f9b34fb'

const DEFAULT_BATTERY_READ_INTERVAL_HOURS = 24

export const BLE_OPTIONAL_SERVICE_UUIDS = [
  ENVIRONMENTAL_SENSING_SERVICE_UUID,
  BATTERY_SERVICE_UUID,
  FLOWER_CARE_SERVICE_UUID,
]

const INVALID_READ_MESSAGE = 'Lecture BLE invalide : caractéristiques de mesure introuvables ou données invalides.'

const normalizeUuid = (value: string): string => value.trim().toLowerCase()

const toIsoNow = (): string => new Date().toISOString()

const toNumber = (value: unknown): number | null => {
  if (typeof value !== 'number') {
    return null
  }

  if (!Number.isFinite(value)) {
    return null
  }

  return value
}

const toMoisturePercent = (value: number): number => {
  if (value > 1000) {
    return value / 100
  }

  if (value > 100) {
    return value / 10
  }

  return value
}

const ensureInRange = (value: number, min: number, max: number, label: string): number => {
  if (value < min || value > max) {
    throw new BleApplicationError('invalid_read', `Valeur ${label} hors plage: ${value}.`)
  }

  return value
}

const flattenCharacteristics = (services: BleService[]): CharacteristicAddress[] => {
  const addresses: CharacteristicAddress[] = []

  for (const service of services) {
    const serviceUuid = normalizeUuid(service.uuid)

    for (const characteristic of service.characteristics) {
      addresses.push({
        service: serviceUuid,
        characteristic: normalizeUuid(characteristic.uuid),
      })
    }
  }

  return addresses
}

const findCharacteristic = (
  addresses: CharacteristicAddress[],
  candidates: CharacteristicCandidate[],
): CharacteristicAddress | null => {
  for (const candidate of candidates) {
    const candidateCharacteristic = normalizeUuid(candidate.characteristic)
    const candidateService = candidate.service ? normalizeUuid(candidate.service) : null
    const match = addresses.find(
      (address) =>
        address.characteristic === candidateCharacteristic &&
        (candidateService === null || address.service === candidateService),
    )

    if (match) {
      return match
    }
  }

  return null
}

const resolveBleCharacteristics = (services: BleService[]): ResolvedBleCharacteristics => {
  const addresses = flattenCharacteristics(services)

  return {
    mode: findCharacteristic(addresses, [
      {
        service: FLOWER_CARE_SERVICE_UUID,
        characteristic: FLOWER_CARE_MODE_CHARACTERISTIC_UUID,
      },
      { characteristic: FLOWER_CARE_MODE_CHARACTERISTIC_UUID },
    ]),
    combined: findCharacteristic(addresses, [
      {
        service: FLOWER_CARE_SERVICE_UUID,
        characteristic: FLOWER_CARE_COMBINED_CHARACTERISTIC_UUID,
      },
    ]),
    temperature: findCharacteristic(addresses, [
      {
        service: ENVIRONMENTAL_SENSING_SERVICE_UUID,
        characteristic: TEMPERATURE_CHARACTERISTIC_UUID,
      },
      { characteristic: TEMPERATURE_CHARACTERISTIC_UUID },
    ]),
    moisture: findCharacteristic(addresses, [
      {
        service: ENVIRONMENTAL_SENSING_SERVICE_UUID,
        characteristic: HUMIDITY_CHARACTERISTIC_UUID,
      },
      { characteristic: HUMIDITY_CHARACTERISTIC_UUID },
    ]),
    light: findCharacteristic(addresses, [
      {
        service: ENVIRONMENTAL_SENSING_SERVICE_UUID,
        characteristic: ILLUMINANCE_CHARACTERISTIC_UUID,
      },
      { characteristic: ILLUMINANCE_CHARACTERISTIC_UUID },
    ]),
    conductivity: findCharacteristic(addresses, [
      {
        service: ENVIRONMENTAL_SENSING_SERVICE_UUID,
        characteristic: ANALOG_CONDUCTIVITY_CHARACTERISTIC_UUID,
      },
      { characteristic: ANALOG_CONDUCTIVITY_CHARACTERISTIC_UUID },
    ]),
    battery: findCharacteristic(addresses, [
      {
        service: BATTERY_SERVICE_UUID,
        characteristic: BATTERY_LEVEL_CHARACTERISTIC_UUID,
      },
      {
        service: FLOWER_CARE_SERVICE_UUID,
        characteristic: FLOWER_CARE_BATTERY_CHARACTERISTIC_UUID,
      },
      { characteristic: BATTERY_LEVEL_CHARACTERISTIC_UUID },
      { characteristic: FLOWER_CARE_BATTERY_CHARACTERISTIC_UUID },
    ]),
  }
}

const decodeTemperature = (value: DataView, characteristicUuid: string): number => {
  if (characteristicUuid === normalizeUuid(TEMPERATURE_CHARACTERISTIC_UUID) && value.byteLength >= 2) {
    return value.getInt16(0, true) / 100
  }

  if (value.byteLength >= 4) {
    const floatValue = toNumber(value.getFloat32(0, true))

    if (floatValue !== null) {
      return floatValue
    }
  }

  if (value.byteLength >= 2) {
    const raw = value.getInt16(0, true)
    const tenth = raw / 10

    if (tenth >= -40 && tenth <= 85) {
      return tenth
    }

    return raw / 100
  }

  if (value.byteLength >= 1) {
    return value.getInt8(0)
  }

  throw new BleApplicationError('invalid_read', INVALID_READ_MESSAGE)
}

const decodeMoisture = (value: DataView, characteristicUuid: string): number => {
  if (characteristicUuid === normalizeUuid(HUMIDITY_CHARACTERISTIC_UUID) && value.byteLength >= 2) {
    return value.getUint16(0, true) / 100
  }

  if (value.byteLength >= 2) {
    return toMoisturePercent(value.getUint16(0, true))
  }

  if (value.byteLength >= 1) {
    return toMoisturePercent(value.getUint8(0))
  }

  throw new BleApplicationError('invalid_read', INVALID_READ_MESSAGE)
}

const decodeLight = (value: DataView): number => {
  if (value.byteLength >= 4) {
    return value.getUint32(0, true)
  }

  if (value.byteLength >= 2) {
    return value.getUint16(0, true)
  }

  if (value.byteLength >= 1) {
    return value.getUint8(0)
  }

  throw new BleApplicationError('invalid_read', INVALID_READ_MESSAGE)
}

const decodeConductivity = (value: DataView): number => {
  if (value.byteLength >= 2) {
    return value.getUint16(0, true)
  }

  if (value.byteLength >= 1) {
    return value.getUint8(0)
  }

  throw new BleApplicationError('invalid_read', INVALID_READ_MESSAGE)
}

const decodeFlowerCareCombined = (value: DataView): CombinedReadValues => {
  if (value.byteLength < 10) {
    throw new BleApplicationError('invalid_read', INVALID_READ_MESSAGE)
  }

  const temperature = value.getInt16(0, true) / 10
  const light = value.getUint32(3, true)
  const moisture = value.getUint8(7)
  const conductivity = value.getUint16(8, true)

  return { temperature, moisture, light, conductivity }
}

const decodeBatteryLevel = (value: DataView): number => {
  if (value.byteLength < 1) {
    throw new BleApplicationError('invalid_read', INVALID_READ_MESSAGE)
  }

  const battery = value.getUint8(0)

  if (battery > 100) {
    throw new BleApplicationError('invalid_read', `Niveau batterie invalide: ${battery}.`)
  }

  return battery
}

const shouldReadBattery = (
  lastBatteryReadAt: string | null | undefined,
  intervalHours: number,
  forceBatteryRead: boolean,
): boolean => {
  if (forceBatteryRead) {
    return true
  }

  if (!lastBatteryReadAt) {
    return true
  }

  const lastReadDate = new Date(lastBatteryReadAt)

  if (Number.isNaN(lastReadDate.getTime())) {
    return true
  }

  const intervalMs = Math.max(intervalHours, 1) * 60 * 60 * 1000
  return Date.now() - lastReadDate.getTime() >= intervalMs
}

const readValue = async (deviceId: string, address: CharacteristicAddress): Promise<DataView> => {
  return BleClient.read(deviceId, address.service, address.characteristic)
}

const FLOWER_CARE_PREPARE_COMMAND = new DataView(Uint8Array.from([0xa0, 0x1f]).buffer)

const prepareFlowerCareCombinedRead = async (
  deviceId: string,
  characteristics: ResolvedBleCharacteristics,
): Promise<void> => {
  if (characteristics.mode === null || characteristics.combined === null) {
    return
  }

  try {
    await BleClient.write(
      deviceId,
      characteristics.mode.service,
      characteristics.mode.characteristic,
      FLOWER_CARE_PREPARE_COMMAND,
    )
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 120)
    })
  } catch {
    // Some sensors don't require this command. Ignore and continue with direct read.
  }
}

const formatServiceSummary = (services: BleService[]): string => {
  if (services.length === 0) {
    return 'aucun service BLE detecte'
  }

  const formatted = services
    .map((service) => {
      const characteristicCount = service.characteristics.length
      return `${service.uuid} (${characteristicCount})`
    })
    .join(', ')

  return `services detectes: ${formatted}`
}

const ensureMeasurements = (
  temperature: number | null,
  moisture: number | null,
  light: number | null,
  conductivity: number | null,
): { temperature: number; moisture: number; light: number; conductivity: number } => {
  if (temperature === null || moisture === null || light === null || conductivity === null) {
    throw new BleApplicationError('invalid_read', INVALID_READ_MESSAGE)
  }

  return {
    temperature: ensureInRange(temperature, -30, 70, 'temperature'),
    moisture: ensureInRange(toMoisturePercent(moisture), 0, 100, 'moisture'),
    light: ensureInRange(light, 0, 200000, 'light'),
    conductivity: ensureInRange(conductivity, 0, 6000, 'conductivity'),
  }
}

const getStringValue = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export const isBleRequestCancelled = (error: unknown): boolean => {
  const name = error instanceof Error ? error.name.toLowerCase() : ''
  const message = getStringValue(error).toLowerCase()

  return (
    message.includes('user cancelled') ||
    message.includes('user canceled') ||
    message.includes('requestdevice() chooser') ||
    (name === 'notfounderror' && message.includes('cancel'))
  )
}

const inferCodeFromMessage = (message: string): BleErrorCode => {
  const normalized = message.toLowerCase()

  if (normalized.includes('already') && normalized.includes('associated')) {
    return 'sensor_already_paired'
  }

  if (normalized.includes('not found')) {
    return 'sensor_not_found'
  }

  if (
    normalized.includes('connect') ||
    normalized.includes('gatt') ||
    normalized.includes('peripheral') ||
    normalized.includes('disconnected')
  ) {
    return 'connection_failed'
  }

  if (normalized.includes('timeout')) {
    return 'timeout'
  }

  if (normalized.includes('permission') || normalized.includes('denied')) {
    return 'permissions_denied'
  }

  if ((normalized.includes('bluetooth') || normalized.includes('location')) && normalized.includes('disabled')) {
    return 'bluetooth_disabled'
  }

  if (normalized.includes('invalid') || normalized.includes('decode')) {
    return 'invalid_read'
  }

  if (normalized.includes('not available') || normalized.includes('unavailable')) {
    return 'unavailable'
  }

  return 'unknown'
}

export class BleApplicationError extends Error {
  code: BleErrorCode

  constructor(code: BleErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'BleApplicationError'
  }
}

export const toBleApplicationError = (error: unknown, fallbackCode: BleErrorCode = 'unknown'): BleApplicationError => {
  if (error instanceof BleApplicationError) {
    return error
  }

  const message = getStringValue(error)
  const code = fallbackCode === 'unknown' ? inferCodeFromMessage(message) : fallbackCode
  return new BleApplicationError(code, message)
}

export const getBleDefaultErrorMessage = (code: BleErrorCode): string => {
  switch (code) {
    case 'sensor_not_found':
      return 'Capteur introuvable. Ouvrez la gestion du capteur pour le rechercher à nouveau.'
    case 'connection_failed':
      return 'Impossible de joindre le capteur. Rapprochez le téléphone et vérifiez que le capteur est disponible.'
    case 'bluetooth_disabled':
      return 'Bluetooth désactivé. Activez le Bluetooth pour continuer.'
    case 'permissions_denied':
      return 'Permissions Bluetooth refusées. Autorisez les appareils à proximité dans les réglages Android.'
    case 'timeout':
      return 'Délai dépassé pendant la communication BLE.'
    case 'invalid_read':
      return 'Lecture des données du capteur invalide.'
    case 'sensor_already_paired':
      return 'Ce capteur est déjà associé à une autre plante.'
    case 'unavailable':
      return 'Bluetooth indisponible sur cet appareil.'
    case 'unknown':
    default:
      return 'Erreur BLE inattendue.'
  }
}

export const isWebBluetoothSupported = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false
  }

  return typeof navigator.bluetooth !== 'undefined'
}

export const readBleMeasurementSnapshot = async (
  deviceId: string,
  options: ReadBleMeasurementOptions = {},
): Promise<BleMeasurementSnapshot> => {
  const forceBatteryRead = options.forceBatteryRead ?? false
  const batteryReadIntervalHours = options.batteryReadIntervalHours ?? DEFAULT_BATTERY_READ_INTERVAL_HOURS

  try {
    const services = await BleClient.getServices(deviceId)
    const characteristics = resolveBleCharacteristics(services)

    let temperature: number | null = null
    let moisture: number | null = null
    let light: number | null = null
    let conductivity: number | null = null

    if (
      characteristics.combined === null &&
      characteristics.temperature === null &&
      characteristics.moisture === null &&
      characteristics.light === null &&
      characteristics.conductivity === null
    ) {
      throw new BleApplicationError('invalid_read', `Caractéristiques du capteur non prises en charge (${formatServiceSummary(services)}).`)
    }

    if (characteristics.combined !== null) {
      await prepareFlowerCareCombinedRead(deviceId, characteristics)
      const combinedRaw = await readValue(deviceId, characteristics.combined)
      const combined = decodeFlowerCareCombined(combinedRaw)
      temperature = combined.temperature
      moisture = combined.moisture
      light = combined.light
      conductivity = combined.conductivity
    }

    if (temperature === null && characteristics.temperature !== null) {
      const raw = await readValue(deviceId, characteristics.temperature)
      temperature = decodeTemperature(raw, characteristics.temperature.characteristic)
    }

    if (moisture === null && characteristics.moisture !== null) {
      const raw = await readValue(deviceId, characteristics.moisture)
      moisture = decodeMoisture(raw, characteristics.moisture.characteristic)
    }

    if (light === null && characteristics.light !== null) {
      const raw = await readValue(deviceId, characteristics.light)
      light = decodeLight(raw)
    }

    if (conductivity === null && characteristics.conductivity !== null) {
      const raw = await readValue(deviceId, characteristics.conductivity)
      conductivity = decodeConductivity(raw)
    }

    const measurements = ensureMeasurements(temperature, moisture, light, conductivity)
    let batteryLevel: number | null = null
    let batteryReadAt = options.lastBatteryReadAt ?? null

    if (
      characteristics.battery !== null &&
      shouldReadBattery(options.lastBatteryReadAt, batteryReadIntervalHours, forceBatteryRead)
    ) {
      const batteryRaw = await readValue(deviceId, characteristics.battery)
      batteryLevel = decodeBatteryLevel(batteryRaw)
      batteryReadAt = toIsoNow()
    }

    return {
      ...measurements,
      batteryLevel,
      measuredAt: toIsoNow(),
      batteryReadAt,
    }
  } catch (error) {
    throw toBleApplicationError(error)
  }
}
