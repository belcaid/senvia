<template>
  <form class="plant-form" @submit.prevent="soumettre">
    <section class="icon-picker" aria-labelledby="plant-icon-label">
      <div class="icon-picker__row">
        <span id="plant-icon-label" class="field-label">Icône</span>
        <div class="icon-options" role="radiogroup" aria-label="Icône de la plante">
          <button
            v-for="option in PLANT_ICON_OPTIONS"
            :key="option.value"
            type="button"
            class="icon-choice"
            :class="{ 'icon-choice--selected': form.icone === option.value }"
            :style="{ '--icon-tone': option.tone }"
            :aria-label="option.label"
            :aria-checked="form.icone === option.value"
            role="radio"
            @click="selectionnerIcone(option.value)"
          >
            <ion-icon :icon="option.icon" />
          </button>
        </div>
      </div>
      <ion-note v-if="erreurs.icone" class="error-note" color="danger">{{ erreurs.icone }}</ion-note>
    </section>

    <ion-list inset class="senvia-form-list plant-form__fields">
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
          interface="popover"
          label="Catégorie"
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
          placeholder="Ex : Salon, près de la fenêtre"
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
        <ion-label>Ajouter aux favoris</ion-label>
        <ion-toggle v-model="form.estFavori" slot="end" />
      </ion-item>
    </ion-list>

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
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
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
      erreurs.categorie = form.categorie.trim() === '' ? 'La catégorie est obligatoire.' : ''
      return erreurs.categorie === ''
    case 'emplacement':
      erreurs.emplacement = form.emplacement.trim() === '' ? 'L’emplacement est obligatoire.' : ''
      return erreurs.emplacement === ''
    case 'icone':
      erreurs.icone = form.icone.trim() === '' ? 'L’icône est obligatoire.' : ''
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
  gap: 0.9rem;
  max-width: 680px;
  margin: 0 auto;
}

.icon-picker {
  padding: 0 0.75rem;
}

.icon-picker__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.field-label {
  flex: 0 0 auto;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ion-text-color);
}

.icon-options {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.48rem;
  min-width: 0;
}

.icon-choice {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 auto;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--icon-tone) 35%, transparent);
  border-radius: 14px;
  color: var(--icon-tone);
  background: linear-gradient(145deg, color-mix(in srgb, var(--icon-tone) 18%, var(--senvia-surface)), var(--senvia-surface-2));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.icon-choice ion-icon {
  font-size: 1.32rem;
}

.icon-choice--selected {
  color: #07190d;
  background: var(--icon-tone);
  border-color: color-mix(in srgb, var(--icon-tone) 75%, white);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--icon-tone) 20%, transparent), 0 8px 18px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px) scale(1.03);
}

.plant-form__fields {
  margin-top: 0;
  margin-bottom: 0;
  padding: 0 0.75rem;
  background: transparent;
}

.plant-form__fields ion-item {
  --background: transparent;
  --background-hover: rgba(var(--ion-color-primary-rgb), 0.035);
  --background-focused: rgba(var(--ion-color-primary-rgb), 0.045);
  --border-color: transparent;
  --inner-border-width: 0;
  --padding-start: 0.8rem;
  --padding-end: 0.4rem;
  border-color: rgba(var(--ion-color-primary-rgb), 0.12);
  background: rgba(var(--ion-color-primary-rgb), 0.025);
  box-shadow: none;
}

.plant-form__fields ion-item:last-child {
  margin-bottom: 0;
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

@media (max-width: 390px) {
  .icon-options {
    gap: 0.3rem;
  }

  .icon-choice {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 11px;
  }

  .field-label { font-size: 0.78rem; }
}
</style>
