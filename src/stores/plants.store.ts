import { defineStore } from 'pinia'
import { PlantRepository, type CreatePlantInput, type UpdatePlantInput } from '@/database'
import type { Plant } from '@/types/plant.types'
import { toErrorMessage } from '@/stores/store.utils'

interface PlantsState {
  plantes: Plant[]
  estChargement: boolean
  erreur: string | null
}

const plantRepository = new PlantRepository()

export const usePlantsStore = defineStore('plants', {
  state: (): PlantsState => ({
    plantes: [],
    estChargement: false,
    erreur: null,
  }),
  getters: {
    favoris(state): Plant[] {
      return state.plantes.filter((plante) => plante.isFavorite)
    },
    getPlanteParId: (state) => (id: string): Plant | undefined =>
      state.plantes.find((plante) => plante.id === id),
  },
  actions: {
    async chargerPlantes(): Promise<void> {
      this.estChargement = true
      this.erreur = null

      try {
        this.plantes = await plantRepository.findAll()
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de charger les plantes')
      } finally {
        this.estChargement = false
      }
    },
    async ajouterPlante(input: CreatePlantInput): Promise<Plant | null> {
      this.erreur = null

      try {
        const plante = await plantRepository.create(input)
        this.plantes = [plante, ...this.plantes.filter((item) => item.id !== plante.id)]
        return plante
      } catch (error) {
        this.erreur = toErrorMessage(error, "Impossible d'ajouter la plante")
        return null
      }
    },
    async modifierPlante(id: string, updates: UpdatePlantInput): Promise<Plant | null> {
      this.erreur = null

      try {
        const plante = await plantRepository.update(id, updates)

        if (plante !== null) {
          this.plantes = this.plantes.map((item) => (item.id === id ? plante : item))
        }

        return plante
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de modifier la plante')
        return null
      }
    },
    async supprimerPlante(id: string): Promise<void> {
      this.erreur = null

      try {
        await plantRepository.delete(id)
        this.plantes = this.plantes.filter((item) => item.id !== id)
      } catch (error) {
        this.erreur = toErrorMessage(error, 'Impossible de supprimer la plante')
      }
    },
    async marquerFavori(id: string, estFavori: boolean): Promise<Plant | null> {
      return this.modifierPlante(id, { isFavorite: estFavori })
    },
  },
})
