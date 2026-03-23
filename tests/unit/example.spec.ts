import { mount } from '@vue/test-utils'
import DashboardView from '@/views/DashboardView.vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const chargerPlantes = vi.fn()
const marquerFavori = vi.fn()
const chargerProfils = vi.fn()

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

vi.mock('@/stores/threshold-profiles.store', () => ({
  useThresholdProfilesStore: () => ({
    profils: [],
    erreur: null,
    chargerProfils,
    getProfilParId: () => undefined,
  }),
}))

describe('DashboardView.vue', () => {
  beforeEach(() => {
    chargerPlantes.mockReset()
    marquerFavori.mockReset()
    chargerProfils.mockReset()
  })

  test('renders dashboard placeholder', () => {
    const wrapper = mount(DashboardView)
    expect(wrapper.text()).toMatch('Dashboard')
    expect(wrapper.text()).toMatch('Ajouter une plante')
    expect(chargerPlantes).toHaveBeenCalledTimes(1)
    expect(chargerProfils).toHaveBeenCalledTimes(1)
  })
})
