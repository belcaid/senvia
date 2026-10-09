import { mount } from '@vue/test-utils'
import DashboardView from '@/views/DashboardView.vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const chargerPlantes = vi.fn()
const marquerFavori = vi.fn()
const chargerDernieresMesures = vi.fn()
const chargerParametres = vi.fn()
const chargerProfils = vi.fn()
const synchroniserStatutsRecalcules = vi.fn()

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
    synchroniserStatutsRecalcules,
  }),
}))

vi.mock('@/stores/measurements.store', () => ({
  useMeasurementsStore: () => ({
    derniereMesureParPlante: {},
    erreur: null,
    chargerDernieresMesures,
  }),
}))

vi.mock('@/stores/settings.store', () => ({
  useSettingsStore: () => ({
    parametres: {
      staleDataThresholdMinutes: 30,
    },
    erreur: null,
    chargerParametres,
  }),
}))

vi.mock('@/stores/threshold-profiles.store', () => ({
  useThresholdProfilesStore: () => ({
    erreur: null,
    chargerProfils,
    getProfilParId: vi.fn(() => undefined),
  }),
}))

vi.mock('@/composables/use-gsap-reveal', () => ({
  useGsapReveal: vi.fn(),
}))

describe('DashboardView.vue', () => {
  beforeEach(() => {
    chargerPlantes.mockReset()
    marquerFavori.mockReset()
    chargerDernieresMesures.mockReset()
    chargerParametres.mockReset()
    chargerProfils.mockReset()
    synchroniserStatutsRecalcules.mockReset()
  })

  test('renders dashboard shell', () => {
    const wrapper = mount(DashboardView)
    expect(wrapper.text()).toMatch('Mes plantes')
    expect(wrapper.text()).toMatch('Nouvelle plante')
  })
})
