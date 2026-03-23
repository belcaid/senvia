import { mount } from '@vue/test-utils'
import DashboardView from '@/views/DashboardView.vue'
import { describe, expect, test } from 'vitest'

describe('DashboardView.vue', () => {
  test('renders dashboard placeholder', () => {
    const wrapper = mount(DashboardView)
    expect(wrapper.text()).toMatch('Dashboard')
    expect(wrapper.text()).toMatch('Ajouter une plante')
  })
})
