import { AlertRepository, MeasurementRepository, PlantRepository, SensorDeviceRepository, runStatement } from '@/database'
import { queryRows } from '@/database/sqlite.service'
import { ensureDefaultThresholdProfiles } from '@/services/threshold-profiles.service'
import { Preferences } from '@capacitor/preferences'

const plantRepository = new PlantRepository()
const sensorRepository = new SensorDeviceRepository()
const measurementRepository = new MeasurementRepository()
const alertRepository = new AlertRepository()
const DEMO_DATA_SEEDED_KEY = 'demo_data_seeded_v1'

const minutesAgo = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString()

interface CountRow {
  count: number
}

const getTableCount = async (tableName: string): Promise<number> => {
  const rows = await queryRows<CountRow>(`SELECT COUNT(*) AS count FROM ${tableName};`)
  const value = rows[0]?.count
  return typeof value === 'number' ? value : Number(value) || 0
}

const hasAnyBusinessData = async (): Promise<boolean> => {
  const [plantsCount, sensorsCount, measurementsCount, alertsCount] = await Promise.all([
    getTableCount('plants'),
    getTableCount('sensor_devices'),
    getTableCount('measurements'),
    getTableCount('alerts'),
  ])

  return plantsCount > 0 || sensorsCount > 0 || measurementsCount > 0 || alertsCount > 0
}

const isDemoDataAlreadySeeded = async (): Promise<boolean> => {
  const { value } = await Preferences.get({ key: DEMO_DATA_SEEDED_KEY })
  return value === 'true'
}

const markDemoDataAsSeeded = async (): Promise<void> => {
  await Preferences.set({ key: DEMO_DATA_SEEDED_KEY, value: 'true' })
}

const seedDemoData = async (): Promise<void> => {
  await ensureDefaultThresholdProfiles()

  await plantRepository.create({
    id: 'p-demo-basilic',
    name: 'Basilic Genovese',
    category: 'indoor',
    location: 'Cuisine - fenetre Est',
    icon: 'leaf',
    isFavorite: true,
    status: 'healthy',
    thresholdProfileId: 'profile-indoor-standard',
  })

  await plantRepository.create({
    id: 'p-demo-cactus',
    name: 'Cactus Opuntia',
    category: 'balcony',
    location: 'Balcon Sud',
    icon: 'sunny',
    isFavorite: true,
    status: 'warning',
    thresholdProfileId: 'profile-cactus-succulent',
  })

  await plantRepository.create({
    id: 'p-demo-monstera',
    name: 'Monstera Deliciosa',
    category: 'indoor',
    location: 'Salon - coin nord',
    icon: 'flower',
    isFavorite: false,
    status: 'critical',
    thresholdProfileId: 'profile-foliage-humid',
  })

  await plantRepository.create({
    id: 'p-demo-thym',
    name: 'Thym citron',
    category: 'garden',
    location: 'Jardin - carre aromatique',
    icon: 'home',
    isFavorite: false,
    status: 'stale_data',
    thresholdProfileId: 'profile-indoor-standard',
  })

  await sensorRepository.create({
    id: 's-demo-basilic',
    plantId: 'p-demo-basilic',
    deviceIdentifier: 'BLE-BASILIC-001',
    deviceName: 'Flower Care Basilic',
    model: 'flower-care',
    batteryLevel: 87,
    lastBatteryReadAt: minutesAgo(22),
    lastSeenAt: minutesAgo(12),
  })

  await sensorRepository.create({
    id: 's-demo-cactus',
    plantId: 'p-demo-cactus',
    deviceIdentifier: 'BLE-CACTUS-001',
    deviceName: 'Flower Care Cactus',
    model: 'flower-care',
    batteryLevel: 63,
    lastBatteryReadAt: minutesAgo(95),
    lastSeenAt: minutesAgo(28),
  })

  await sensorRepository.create({
    id: 's-demo-monstera',
    plantId: 'p-demo-monstera',
    deviceIdentifier: 'BLE-MONSTERA-001',
    deviceName: 'Flower Care Monstera',
    model: 'flower-care',
    batteryLevel: 18,
    lastBatteryReadAt: minutesAgo(180),
    lastSeenAt: minutesAgo(74),
  })

  await plantRepository.update('p-demo-basilic', { sensorId: 's-demo-basilic' })
  await plantRepository.update('p-demo-cactus', { sensorId: 's-demo-cactus' })
  await plantRepository.update('p-demo-monstera', { sensorId: 's-demo-monstera' })

  await measurementRepository.create({
    id: 'm-demo-basilic',
    plantId: 'p-demo-basilic',
    sensorId: 's-demo-basilic',
    measuredAt: minutesAgo(16),
    temperature: 23.1,
    moisture: 48,
    light: 730,
    conductivity: 910,
    batteryLevel: 87,
    source: 'manual_sync',
  })

  await measurementRepository.create({
    id: 'm-demo-cactus',
    plantId: 'p-demo-cactus',
    sensorId: 's-demo-cactus',
    measuredAt: minutesAgo(36),
    temperature: 28.4,
    moisture: 14,
    light: 1920,
    conductivity: 280,
    batteryLevel: 63,
    source: 'manual_sync',
  })

  await measurementRepository.create({
    id: 'm-demo-monstera',
    plantId: 'p-demo-monstera',
    sensorId: 's-demo-monstera',
    measuredAt: minutesAgo(92),
    temperature: 31.2,
    moisture: 22,
    light: 220,
    conductivity: 210,
    batteryLevel: 18,
    source: 'manual_sync',
  })

  await alertRepository.create({
    id: 'a-demo-cactus-moisture',
    plantId: 'p-demo-cactus',
    type: 'humidity_low',
    severity: 'warning',
    title: 'Humidite basse',
    message: 'Le cactus approche du seuil sec depuis 2 cycles de lecture.',
    isRead: true,
    createdAt: minutesAgo(24),
    measurementId: 'm-demo-cactus',
  })

  await alertRepository.create({
    id: 'a-demo-monstera-battery',
    plantId: 'p-demo-monstera',
    type: 'sensor_battery_low',
    severity: 'critical',
    title: 'Batterie capteur faible',
    message: 'La batterie du capteur Monstera est sous 20%.',
    isRead: false,
    createdAt: minutesAgo(18),
    measurementId: 'm-demo-monstera',
  })

  await alertRepository.create({
    id: 'a-demo-thym-stale',
    plantId: 'p-demo-thym',
    type: 'stale_data',
    severity: 'info',
    title: 'Donnees obsoletes',
    message: 'Aucune mesure recente recue pour cette plante.',
    isRead: false,
    createdAt: minutesAgo(9),
    measurementId: null,
  })
}

export const ensureDemoData = async (): Promise<boolean> => {
  if (await isDemoDataAlreadySeeded()) {
    return false
  }

  if (await hasAnyBusinessData()) {
    await markDemoDataAsSeeded()
    return false
  }

  await seedDemoData()
  await markDemoDataAsSeeded()
  return true
}

const clearBusinessData = async (): Promise<void> => {
  await runStatement('DELETE FROM alerts;')
  await runStatement('DELETE FROM measurements;')
  await runStatement('DELETE FROM sensor_devices;')
  await runStatement('DELETE FROM plants;')
}

export const resetAndSeedDemoData = async (): Promise<void> => {
  await clearBusinessData()
  await seedDemoData()
  await markDemoDataAsSeeded()
}
