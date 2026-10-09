<template>
  <ion-page class="alerts-page">
    <ion-content class="ion-padding">
      <section class="senvia-page-heading alerts-heading senvia-reveal">
        <h1>Alertes</h1>
        <p>Les informations importantes, classées par priorité.</p>
      </section>

      <section class="alerts-hero senvia-reveal" :class="{ 'alerts-hero--clear': nombreNouvelles === 0 }">
        <div class="alerts-hero__icon">
          <ion-icon :icon="nombreNouvelles === 0 ? checkmarkCircleOutline : notificationsOutline" />
        </div>
        <div class="alerts-hero__copy">
          <span>État de vos plantes</span>
          <h1>{{ heroTitle }}</h1>
          <p>{{ heroSubtitle }}</p>
        </div>
        <ion-button v-if="nombreNouvelles > 0" fill="clear" size="small" @click="marquerToutesLues">
          Tout marquer comme vu
        </ion-button>
      </section>

      <div class="alerts-controls senvia-reveal">
        <div class="alerts-tabs" role="tablist" aria-label="Afficher les alertes">
          <button
            type="button"
            role="tab"
            class="alert-tab"
            :class="{ 'alert-tab--active': vueSelectionnee === 'new' }"
            :aria-selected="vueSelectionnee === 'new'"
            @click="vueSelectionnee = 'new'"
          >
            <span>Nouvelles</span>
            <strong>{{ nombreNouvelles }}</strong>
          </button>
          <button
            type="button"
            role="tab"
            class="alert-tab"
            :class="{ 'alert-tab--active': vueSelectionnee === 'followed' }"
            :aria-selected="vueSelectionnee === 'followed'"
            @click="vueSelectionnee = 'followed'"
          >
            <span>Suivies</span>
            <strong>{{ nombreSuivies }}</strong>
          </button>
          <button
            type="button"
            role="tab"
            class="alert-tab"
            :class="{ 'alert-tab--active': vueSelectionnee === 'history' }"
            :aria-selected="vueSelectionnee === 'history'"
            @click="vueSelectionnee = 'history'"
          >
            <span>Historique</span>
            <strong>{{ nombreResolues }}</strong>
          </button>
        </div>
      </div>

      <ion-note v-if="alertsStore.erreur" class="senvia-feedback" color="danger">{{ alertsStore.erreur }}</ion-note>
      <div v-if="alertsStore.estChargement" class="senvia-loading-container">
        <ion-spinner name="crescent" /><span>Chargement des alertes…</span>
      </div>

      <div v-else-if="alertesFiltrees.length > 0" class="alerts-list senvia-reveal">
        <article
          v-for="alerte in alertesFiltrees"
          :key="alerte.id"
          class="alert-card"
          :class="[`alert-card--${alerte.severity}`, { 'alert-card--unread': !alerte.isRead }]"
        >
          <button type="button" class="alert-card__main" @click="ouvrirAlerte(alerte)">
            <span class="alert-card__icon"><ion-icon :icon="getSeverityIcon(alerte.severity)" /></span>
            <span class="alert-card__body">
              <span class="alert-card__topline">
                <strong>{{ corrigerTypographie(alerte.title) }}</strong>
                <span class="alert-card__severity">{{ getSeverityLabel(alerte.severity) }}</span>
              </span>
              <span class="alert-card__message">{{ corrigerTypographie(alerte.message) }}</span>
              <span class="alert-card__meta">{{ getPlantName(alerte.plantId) }} · {{ formatDateTime(alerte.createdAt) }}</span>
            </span>
            <ion-icon class="alert-card__chevron" :icon="chevronForwardOutline" />
          </button>
          <div v-if="!alerte.isRead || alerte.resolvedAt" class="alert-card__actions">
            <button v-if="!alerte.isRead" type="button" @click="marquerLue(alerte)">J’ai vu</button>
            <button v-if="alerte.resolvedAt" type="button" class="danger" @click="supprimerAlerte(alerte)">Supprimer</button>
          </div>
        </article>
      </div>

      <screen-placeholder
        v-else
        class="alerts-empty senvia-reveal"
        :title="emptyState.title"
        :subtitle="emptyState.subtitle"
        description="Les alertes sont actualisées après chaque synchronisation."
      />

      <ion-button
        v-if="vueSelectionnee === 'history' && nombreHistoriqueEffacable > 0"
        class="clear-history"
        fill="clear"
        color="danger"
        expand="block"
        @click="confirmerSuppressionHistorique"
      >
        Effacer les alertes terminées et lues
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  alertController,
  IonButton,
  IonContent,
  IonIcon,
  IonNote,
  IonPage,
  IonSpinner,
  onIonViewWillEnter,
} from '@ionic/vue'
import {
  alertCircleOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  informationCircleOutline,
  notificationsOutline,
  warningOutline,
} from 'ionicons/icons'
import { useRouter } from 'vue-router'
import ScreenPlaceholder from '@/components/ScreenPlaceholder.vue'
import { useGsapReveal } from '@/composables/use-gsap-reveal'
import { showErrorFeedback, showInfoFeedback } from '@/services/ux-feedback.service'
import { useAlertsStore } from '@/stores/alerts.store'
import { usePlantsStore } from '@/stores/plants.store'
import type { Alert, AlertSeverity } from '@/types/alert.types'
import { formatDateTime } from '@/utils/date.util'

type AlertView = 'new' | 'followed' | 'history'
const router = useRouter()
const alertsStore = useAlertsStore()
const plantsStore = usePlantsStore()
const vueSelectionnee = ref<AlertView>('new')

const nombreNouvelles = computed(() => alertsStore.alertes.filter((a) => a.resolvedAt === null && !a.isRead).length)
const nombreSuivies = computed(() => alertsStore.alertes.filter((a) => a.resolvedAt === null && a.isRead).length)
const nombreResolues = computed(() => alertsStore.alertes.filter((a) => a.resolvedAt !== null).length)
const nombreHistoriqueEffacable = computed(() => alertsStore.alertes.filter((a) => a.resolvedAt !== null && a.isRead).length)
const severityRank: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }
const alertesFiltrees = computed(() => alertsStore.alertes
  .filter((alerte) => {
    if (vueSelectionnee.value === 'new') return alerte.resolvedAt === null && !alerte.isRead
    if (vueSelectionnee.value === 'followed') return alerte.resolvedAt === null && alerte.isRead
    return alerte.resolvedAt !== null
  })
  .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.createdAt.localeCompare(a.createdAt)))
const heroTitle = computed(() => nombreNouvelles.value === 0 ? 'Vous êtes à jour' : `${nombreNouvelles.value} nouvelle${nombreNouvelles.value > 1 ? 's' : ''} alerte${nombreNouvelles.value > 1 ? 's' : ''}`)
const heroSubtitle = computed(() => nombreNouvelles.value === 0
  ? (nombreSuivies.value > 0 ? `${nombreSuivies.value} alerte${nombreSuivies.value > 1 ? 's' : ''} reste${nombreSuivies.value > 1 ? 'nt' : ''} suivie${nombreSuivies.value > 1 ? 's' : ''}.` : 'Rien de nouveau depuis votre dernière visite.')
  : 'Les plus importantes apparaissent en premier.')
const emptyState = computed(() => {
  if (vueSelectionnee.value === 'new') return { title: 'Vous êtes à jour', subtitle: 'Aucune nouvelle alerte à consulter.' }
  if (vueSelectionnee.value === 'followed') return { title: 'Aucun suivi en cours', subtitle: 'Les alertes déjà consultées apparaîtront ici.' }
  return { title: 'Historique vide', subtitle: 'Les alertes terminées apparaîtront ici.' }
})

const getSeverityLabel = (severity: AlertSeverity): string => severity === 'critical' ? 'Urgent' : severity === 'warning' ? 'Important' : 'Information'
const getSeverityIcon = (severity: AlertSeverity): string => severity === 'critical' ? alertCircleOutline : severity === 'warning' ? warningOutline : informationCircleOutline
const getPlantName = (plantId: string): string => plantsStore.getPlanteParId(plantId)?.name ?? 'Plante inconnue'
const corrigerTypographie = (value: string): string => value
  .replace(/Humidite/g, 'Humidité')
  .replace(/Fertilite/g, 'Fertilité')
  .replace(/Temperature/g, 'Température')
  .replace(/Luminosite/g, 'Luminosité')
  .replace(/Lumiere/g, 'Lumière')
  .replace(/Conductivite/g, 'Conductivité')
  .replace(/elevee/g, 'élevée')
  .replace(/Donnees/g, 'Données')
  .replace(/obsoletes/g, 'obsolètes')
  .replace(/recente/g, 'récente')
  .replace(/recue/g, 'reçue')

const marquerToutesLues = async (): Promise<void> => {
  if (!(await alertsStore.marquerToutesLues())) {
    await showErrorFeedback('Impossible de marquer les alertes comme lues.')
    return
  }
  await showInfoFeedback('Toutes les alertes ont été vues.')
}
const marquerLue = async (alerte: Alert): Promise<void> => {
  if ((await alertsStore.marquerAlerteLue(alerte.id, true)) === null) await showErrorFeedback("Impossible de mettre à jour l'alerte.")
}
const supprimerAlerte = async (alerte: Alert): Promise<void> => {
  if (!(await alertsStore.supprimerAlerte(alerte.id))) await showErrorFeedback("Impossible de supprimer l'alerte.")
}
const confirmerSuppressionHistorique = async (): Promise<void> => {
  const confirmation = await alertController.create({
    header: 'Effacer les alertes terminées ?',
    message: `${nombreHistoriqueEffacable.value} alerte${nombreHistoriqueEffacable.value > 1 ? 's' : ''} seront supprimées.`,
    buttons: [{ text: 'Annuler', role: 'cancel' }, { text: 'Effacer', role: 'confirm', cssClass: 'alert-confirm-danger' }],
  })
  await confirmation.present()
  if ((await confirmation.onDidDismiss()).role !== 'confirm') return
  if (!(await alertsStore.supprimerHistoriqueLu())) await showErrorFeedback("Impossible d'effacer l'historique.")
}
const ouvrirAlerte = async (alerte: Alert): Promise<void> => {
  if (!alerte.isRead && (await alertsStore.marquerAlerteLue(alerte.id, true)) === null) return
  await router.push(`/plants/${alerte.plantId}`)
}
const chargerAlertes = async (): Promise<void> => {
  await Promise.all([alertsStore.chargerAlertes(), plantsStore.chargerPlantes()])
}
onIonViewWillEnter(() => void chargerAlertes())
useGsapReveal({ rootSelector: '.alerts-page', itemSelector: '.senvia-reveal' })
</script>

<style scoped>
.alerts-page ion-content { --padding-bottom: 2rem; }
.alerts-heading, .alerts-hero, .alerts-controls, .alerts-list, .alerts-empty, .clear-history { width: 100%; max-width: var(--senvia-focused-content-width); box-sizing: border-box; margin-right: auto; margin-left: 0; }
.alerts-heading { margin-bottom: 1rem; }
.alerts-hero { display: grid; grid-template-columns: auto 1fr; gap: 0.8rem; padding: 1.05rem; border: 1px solid rgba(var(--ion-color-danger-rgb), 0.24); border-radius: 24px; color: #fff; background: radial-gradient(circle at 92% 10%, rgba(255,107,107,0.18), transparent 44%), #17221a; box-shadow: 0 18px 40px rgba(0,0,0,0.28); }
.alerts-hero--clear { border-color: rgba(var(--ion-color-primary-rgb), 0.22); background: radial-gradient(circle at 92% 10%, rgba(var(--ion-color-primary-rgb), 0.14), transparent 44%), #17221a; }
.alerts-hero__icon { display: grid; place-items: center; width: 2.9rem; height: 2.9rem; border-radius: 15px; color: #fff; background: rgba(255,255,255,0.16); }
.alerts-hero__icon ion-icon { font-size: 1.45rem; }
.alerts-hero__copy span { color: rgba(255,255,255,0.72); font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
.alerts-hero__copy h1 { margin: 0.15rem 0 0; color: #fff; font-size: 1.25rem; }
.alerts-hero__copy p { margin: 0.3rem 0 0; color: rgba(255,255,255,0.8); font-size: 0.82rem; }
.alerts-hero ion-button { grid-column: 1 / -1; justify-self: start; margin: 0; --color: #fff; }
.alerts-controls { margin-top: 0.9rem; margin-bottom: 0.8rem; }
.alerts-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.3rem; padding: 0.3rem; border: 1px solid var(--senvia-card-border); border-radius: 18px; background: rgba(255,255,255,0.025); }
.alert-tab { display: flex; align-items: center; justify-content: center; gap: 0.45rem; min-width: 0; min-height: 3rem; padding: 0.6rem 0.75rem; border: 1px solid transparent; border-radius: 14px; color: var(--senvia-text-muted); background: transparent; font: inherit; font-size: 0.78rem; font-weight: 720; letter-spacing: 0.055em; text-transform: uppercase; transition: color 180ms ease, background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease; }
.alert-tab strong { display: grid; place-items: center; min-width: 1.35rem; height: 1.35rem; padding: 0 0.28rem; border-radius: 999px; color: inherit; background: rgba(255,255,255,0.07); font-size: 0.68rem; line-height: 1; }
.alert-tab:hover { color: var(--ion-text-color); background: rgba(255,255,255,0.04); }
.alert-tab:active { transform: scale(0.985); }
.alert-tab--active { border-color: rgba(var(--ion-color-primary-rgb), 0.24); color: var(--ion-color-primary); background: rgba(var(--ion-color-primary-rgb), 0.11); box-shadow: inset 0 0 0 1px rgba(var(--ion-color-primary-rgb), 0.03), 0 6px 18px rgba(0,0,0,0.16); }
.alert-tab--active strong { color: var(--ion-color-primary-contrast); background: var(--ion-color-primary); }
.alerts-list { display: grid; gap: 0.65rem; }
.alerts-empty { margin-top: 0; margin-bottom: 0; }
.alert-card { overflow: hidden; border: 1px solid var(--senvia-card-border); border-radius: 20px; background: var(--senvia-surface); box-shadow: 0 10px 28px var(--senvia-shadow-color); }
.alert-card--critical { border-color: rgba(var(--ion-color-danger-rgb), 0.22); }
.alert-card--warning { border-color: rgba(var(--ion-color-warning-rgb), 0.2); }
.alert-card--unread { box-shadow: 0 12px 30px rgba(var(--ion-color-primary-rgb), 0.12); }
.alert-card__main { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.7rem; width: 100%; padding: 0.9rem; border: 0; text-align: left; color: var(--ion-text-color); background: transparent; }
.alert-card__icon { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border-radius: 13px; color: var(--senvia-text-muted); background: var(--senvia-surface-2); }
.alert-card--critical .alert-card__icon { color: var(--ion-color-danger); background: rgba(var(--ion-color-danger-rgb), 0.1); }
.alert-card--warning .alert-card__icon { color: var(--ion-color-warning); background: rgba(var(--ion-color-warning-rgb), 0.11); }
.alert-card__topline { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; }
.alert-card__topline strong { min-width: 0; line-height: 1.25; }
.alert-card__body > span { display: block; }
.alert-card__severity { flex: 0 0 auto; margin-left: 0.35rem; padding-left: 0.6rem; border-left: 1px solid var(--senvia-card-border); color: var(--senvia-text-muted); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.045em; text-transform: uppercase; }
.alert-card__message { margin-top: 0.25rem; color: var(--senvia-text-muted); font-size: 0.84rem; line-height: 1.4; }
.alert-card__meta { margin-top: 0.38rem; color: var(--senvia-text-muted); font-size: 0.72rem; }
.alert-card__chevron { color: var(--senvia-text-muted); }
.alert-card__actions { display: flex; justify-content: flex-end; gap: 0.35rem; padding: 0 0.75rem 0.6rem; }
.alert-card__actions button { padding: 0.4rem 0.55rem; border: 0; color: var(--ion-color-primary-shade); background: transparent; font: inherit; font-size: 0.75rem; font-weight: 650; }
.alert-card__actions button.danger { color: var(--ion-color-danger); }
.clear-history { margin-top: 1rem; }
@media (max-width: 430px) {
  .alerts-tabs { gap: 0.2rem; padding: 0.22rem; border-radius: 16px; }
  .alert-tab { flex-direction: column; gap: 0.2rem; min-height: 3.35rem; padding: 0.42rem 0.2rem; border-radius: 12px; font-size: 0.67rem; letter-spacing: 0.035em; }
  .alert-tab strong { min-width: 1.2rem; height: 1.2rem; font-size: 0.62rem; }
}
</style>
