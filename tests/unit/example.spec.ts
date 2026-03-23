import { mount } from '@vue/test-utils'
import DashboardView from '@/views/DashboardView.vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const chargerPlantes = vi.fn()
const marquerFavori = vi.fn()
const chargerDernieresMesures = vi.fn()

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router')

  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
    }),
  }
})

vi.mock('@/stores/plants.store', () => ({
  usePlantsStore: () => ({
    plantes: [],
    estChargement: false,
    erreur: null,
    chargerPlantes,
    marquerFavori,
  }),
}))

vi.mock('@/stores/measurements.store', () => ({
  useMeasurementsStore: () => ({
    derniereMesureParPlante: {},
    erreur: null,
    chargerDernieresMesures,
  }),
}))

describe('DashboardView.vue', () => {
  beforeEach(() => {
    chargerPlantes.mockReset()
    marquerFavori.mockReset()
    chargerDernieresMesures.mockReset()
  })

  test('renders dashboard shell', () => {
    const wrapper = mount(DashboardView)
    expect(wrapper.text()).toMatch('Dashboard')
    expect(wrapper.text()).toMatch('Ajouter plante')
  })
})
