import { defineStore } from 'pinia'

type StartupStatus = 'initializing' | 'ready' | 'error'

interface StartupState {
  status: StartupStatus
  message: string | null
}

export const useStartupStore = defineStore('startup', {
  state: (): StartupState => ({
    status: 'initializing',
    message: null,
  }),
  actions: {
    markReady(): void {
      this.status = 'ready'
      this.message = null
    },
    markFailed(): void {
      this.status = 'error'
      this.message = 'Le stockage local n’a pas pu être ouvert. Aucune donnée n’a été supprimée.'
    },
  },
})
