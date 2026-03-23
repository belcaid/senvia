import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/tabs/dashboard',
  },
  {
    path: '/tabs/',
    component: () => import('@/views/TabsPage.vue'),
    children: [
      {
        path: '',
        redirect: '/tabs/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: 'favoris',
        name: 'Favoris',
        component: () => import('@/views/FavoritesView.vue'),
      },
      {
        path: 'alertes',
        name: 'Alertes',
        component: () => import('@/views/AlertsView.vue'),
      },
      {
        path: 'reglages',
        name: 'Reglages',
        component: () => import('@/views/SettingsView.vue'),
      },
    ],
  },
  {
    path: '/plants/new',
    name: 'PlantCreate',
    component: () => import('@/views/PlantCreateView.vue'),
  },
  {
    path: '/plants/:plantId/pairing',
    name: 'BlePairing',
    component: () => import('@/views/BlePairingView.vue'),
  },
  {
    path: '/plants/:plantId',
    name: 'PlantDetail',
    component: () => import('@/views/PlantDetailView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/tabs/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

const blurActiveElement = (): void => {
  if (typeof document === 'undefined') {
    return
  }

  const activeElement = document.activeElement

  if (activeElement instanceof HTMLElement && activeElement !== document.body) {
    activeElement.blur()
  }
}

router.beforeEach((_, __, next) => {
  blurActiveElement()
  next()
})

export default router
