<template>
  <form class="plant-form" @submit.prevent="soumettre">
    <ion-list inset class="senvia-form-list">
      <ion-item>
        <ion-input
          v-model="form.nom"
          label="Nom"
          label-placement="stacked"
          placeholder="Ex: Monstera Deliciosa"
          required
          @ionBlur="() => validerChamp('nom')"
        />
      </ion-item>
      <ion-note v-if="erreurs.nom" class="error-note" color="danger">{{ erreurs.nom }}</ion-note>

      <ion-item>
        <ion-select
          v-model="form.categorie"
          interface="action-sheet"
          label="Categorie"
          label-placement="stacked"
          @ionBlur="() => validerChamp('categorie')"
        >
          <ion-select-option
            v-for="option in PLANT_CATEGORY_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      <ion-note v-if="erreurs.categorie" class="error-note" color="danger">{{ erreurs.categorie }}</ion-note>

      <ion-item>
        <ion-input
          v-model="form.emplacement"
          label="Emplacement"
          label-placement="stacked"
          placeholder="Ex: Salon, proche fenetre"
          required
          @ionBlur="() => validerChamp('emplacement')"
        />
      </ion-item>
      <ion-note v-if="erreurs.emplacement" class="error-note" color="danger">{{ erreurs.emplacement }}</ion-note>

      <ion-item>
        <ion-select
          v-model="thresholdProfileIdModel"
          interface="popover"
          label="Profil de seuils"
          label-placement="stacked"
          @ionBlur="() => validerChamp('thresholdProfileId')"
        >
          <ion-select-option v-for="profil in thresholdProfiles" :key="profil.id" :value="profil.id">
            {{ profil.name }}
          </ion-select-option>
        </ion-select>
      </ion-item>
      <ion-note v-if="erreurs.thresholdProfileId" class="error-note" color="danger">
        {{ erreurs.thresholdProfileId }}
      </ion-note>

      <ion-item>
        <ion-label>Statut favori</ion-label>
        <ion-toggle v-model="form.estFavori" slot="end" />
      </ion-item>
    </ion-list>

    <section class="icon-picker">
      <h3>Icone</h3>
      <p>Choisis une icone representant la plante.</p>
      <ion-grid>
        <ion-row>
          <ion-col v-for="option in PLANT_ICON_OPTIONS" :key="option.value" size="4">
            <ion-button
              type="button"
              class="icon-choice"
              :fill="form.icone === option.value ? 'solid' : 'outline'"
              expand="block"
              @click="selectionnerIcone(option.value)"
            >
              <ion-icon slot="start" :icon="option.icon" />
              <span>{{ option.label }}</span>
            </ion-button>
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-note v-if="erreurs.icone" class="error-note" color="danger">{{ erreurs.icone }}</ion-note>
    </section>

    <div class="form-actions">
      <ion-button type="button" :disabled="isSubmitting" expand="block" @click="soumettre">
        {{ submitLabel }}
      </ion-button>
      <ion-button v-if="showCancel" type="button" fill="clear" expand="block" @click="emit('cancel')">
        Annuler
      </ion-button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import {
  IonButton,
  IonCol,
  IonGrid,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from '@ionic/vue'
import { DEFAULT_PLANT_CATEGORY, DEFAULT_PLANT_ICON, PLANT_CATEGORY_OPTIONS, PLANT_ICON_OPTIONS } from '@/utils/plant-options.util'
import { hapticLight, hapticWarning } from '@/services/ux-feedback.service'
import type { PlantCategory } from '@/types/plant.types'
import type { ThresholdProfile } from '@/types/threshold-profile.types'

export interface PlantFormValues {
  nom: string
  categorie: PlantCategory
  emplacement: string
  icone: string
  estFavori: boolean
  thresholdProfileId: string | null
}

interface PlantFormErrors {
  nom: string
  categorie: string
  emplacement: string
  icone: string
  thresholdProfileId: string
}

const defaultValues = (): PlantFormValues => ({
  nom: '',
  categorie: DEFAULT_PLANT_CATEGORY,
  emplacement: '',
  icone: DEFAULT_PLANT_ICON,
  estFavori: false,
  thresholdProfileId: null,
})

const createEmptyErrors = (): PlantFormErrors => ({
  nom: '',
  categorie: '',
  emplacement: '',
  icone: '',
  thresholdProfileId: '',
})

const props = withDefaults(
  defineProps<{
    initialValues?: Partial<PlantFormValues>
    submitLabel?: string
    isSubmitting?: boolean
    thresholdProfiles?: ThresholdProfile[]
    showCancel?: boolean
  }>(),
  {
    initialValues: undefined,
    submitLabel: 'Enregistrer',
    isSubmitting: false,
    thresholdProfiles: () => [],
    showCancel: false,
  },
)

const emit = defineEmits<{
  submit: [values: PlantFormValues]
  cancel: []
}>()

const form = reactive<PlantFormValues>(defaultValues())
const erreurs = reactive<PlantFormErrors>(createEmptyErrors())

const thresholdProfileIdModel = computed({
  get: (): string => form.thresholdProfileId ?? '',
  set: (value: string) => {
    form.thresholdProfileId = value.trim() === '' ? null : value
  },
})

function resetErrors(): void {
  const emptyErrors = createEmptyErrors()

  erreurs.nom = emptyErrors.nom
  erreurs.categorie = emptyErrors.categorie
  erreurs.emplacement = emptyErrors.emplacement
  erreurs.icone = emptyErrors.icone
  erreurs.thresholdProfileId = emptyErrors.thresholdProfileId
}

watch(
  () => props.initialValues,
  (values) => {
    const next = {
      ...defaultValues(),
      ...values,
    }

    form.nom = next.nom
    form.categorie = next.categorie
    form.emplacement = next.emplacement
    form.icone = next.icone
    form.estFavori = next.estFavori
    form.thresholdProfileId = next.thresholdProfileId

    resetErrors()
  },
  { immediate: true, deep: true },
)

watch(
  () => props.thresholdProfiles,
  (profiles) => {
    if (profiles.length === 0) {
      return
    }

    const currentId = form.thresholdProfileId
    const hasCurrent = currentId !== null && profiles.some((profile) => profile.id === currentId)

    if (!hasCurrent) {
      form.thresholdProfileId = profiles[0].id
    }
  },
  { immediate: true, deep: true },
)

const validerChamp = (champ: keyof PlantFormErrors): boolean => {
  switch (champ) {
    case 'nom':
      erreurs.nom = form.nom.trim() === '' ? 'Le nom est obligatoire.' : ''
      return erreurs.nom === ''
    case 'categorie':
      erreurs.categorie = form.categorie.trim() === '' ? 'La categorie est obligatoire.' : ''
      return erreurs.categorie === ''
    case 'emplacement':
      erreurs.emplacement = form.emplacement.trim() === '' ? 'L emplacement est obligatoire.' : ''
      return erreurs.emplacement === ''
    case 'icone':
      erreurs.icone = form.icone.trim() === '' ? 'L icone est obligatoire.' : ''
      return erreurs.icone === ''
    case 'thresholdProfileId':
      erreurs.thresholdProfileId = form.thresholdProfileId === null ? 'Le profil de seuils est obligatoire.' : ''
      return erreurs.thresholdProfileId === ''
    default:
      return true
  }
}

const validerFormulaire = (): boolean => {
  const champs: Array<keyof PlantFormErrors> = ['nom', 'categorie', 'emplacement', 'icone', 'thresholdProfileId']
  return champs.every((champ) => validerChamp(champ))
}

const selectionnerIcone = (iconValue: string): void => {
  form.icone = iconValue
  validerChamp('icone')
  void hapticLight()
}

const soumettre = (): void => {
  if (!validerFormulaire()) {
    void hapticWarning()
    return
  }

  emit('submit', {
    nom: form.nom.trim(),
    categorie: form.categorie,
    emplacement: form.emplacement.trim(),
    icone: form.icone,
    estFavori: form.estFavori,
    thresholdProfileId: form.thresholdProfileId,
  })
}

const submitLabel = computed(() => props.submitLabel)
const isSubmitting = computed(() => props.isSubmitting)
const thresholdProfiles = computed(() => props.thresholdProfiles)
const showCancel = computed(() => props.showCancel)
</script>

<style scoped>
.plant-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.icon-picker {
  padding: 0 0.75rem;
}

.icon-picker h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.icon-picker p {
  margin: 0.25rem 0 0.5rem;
  color: var(--senvia-text-muted);
  font-size: 0.9rem;
}

.icon-choice {
  min-height: 2.5rem;
  text-transform: none;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0 0.75rem 1rem;
}

.error-note {
  display: block;
  margin: 0.15rem 1.1rem 0.35rem;
}
</style>
