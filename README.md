# Senvia

Senvia est une application mobile locale de suivi de plantes conçue pour les capteurs Bluetooth Low Energy HHCC Flower Care.

L'application fonctionne sans compte et sans serveur. Elle stocke les plantes, mesures et alertes dans SQLite, et les préférences générales via Capacitor Preferences.

## Pourquoi Senvia ?

Senvia est né après l’achat de plusieurs capteurs Flower Care. Leur utilisation impliquait de créer un compte supplémentaire et de dépendre d’une application en ligne qui ne correspondait pas au besoin recherché.

Le projet propose une alternative simple et locale : l’application communique directement avec les capteurs en Bluetooth, conserve les données sur l’appareil et reste utilisable hors ligne. Aucun compte ni serveur distant n’est nécessaire.

## Aperçu

<table>
  <tr>
    <td colspan="2"><strong>Tableau de bord</strong><br><img src="docs/screenshots/dashboard.webp" alt="Tableau de bord de Senvia avec quatre plantes" /></td>
  </tr>
  <tr>
    <td width="50%"><strong>Alertes</strong><br><img src="docs/screenshots/alerts.webp" alt="Alertes de suivi des plantes dans Senvia" /></td>
    <td width="50%"><strong>Réglages</strong><br><img src="docs/screenshots/settings.webp" alt="Réglages de Senvia" /></td>
  </tr>
</table>

## Fonctionnalités V1

- ajout, modification et suppression de plantes ;
- association d'une plante avec un capteur BLE ;
- lecture de la température, de l'humidité du sol, de la lumière et de la conductivité ;
- dashboard, recherche et filtres ;
- favoris ;
- calcul du statut de santé selon un profil de seuils ;
- historique local avec graphiques sur 24 h, 7 jours, 30 jours ou toute la période ;
- alertes locales gérées comme des épisodes en cours puis résolus ;
- notifications locales selon une sévérité minimale ;
- synchronisation manuelle et au retour de l'application au premier plan ;
- identité visuelle sombre, optimisée pour téléphone et tablette ;
- fonctionnement hors ligne et sans compte.

## Capteurs compatibles

La V1 est conçue et testée avec les capteurs de plantes **HHCC Flower Care**. Ils fournissent les données suivantes :

- température ;
- humidité du sol ;
- luminosité ;
- conductivité, utilisée comme indicateur de fertilité ;
- niveau de batterie.

Senvia prend en charge le protocole BLE utilisé par ce modèle, notamment son service propriétaire Flower Care. Un périphérique visible pendant le scan n’est donc pas nécessairement compatible. Les autres marques et les variantes matérielles ou logicielles utilisant un protocole différent ne sont pas prises en charge à ce jour.

La compatibilité exacte peut varier selon la révision matérielle ou le firmware. Les modèles supplémentaires ne seront annoncés comme compatibles qu’après un test sur appareil réel. Senvia est un projet indépendant, sans affiliation avec HHCC.

## Données et autorisations

Les plantes, mesures, alertes et réglages restent sur l’appareil. Senvia n’impose ni compte utilisateur, ni synchronisation cloud, ni envoi des mesures vers un service distant.

L’accès Bluetooth est nécessaire pour détecter les capteurs, s’y connecter et lire leurs données. Les notifications sont facultatives et servent uniquement aux alertes locales. Sur Android 11 et les versions antérieures, le système peut également demander l’autorisation de localisation pour effectuer un scan BLE ; Senvia ne collecte ni ne stocke la position de l’appareil.

## Stack

- Ionic 8 et Vue 3 ;
- TypeScript, Vite et Pinia ;
- Capacitor 8 ;
- `@capacitor-community/bluetooth-le` ;
- `@capacitor-community/sqlite` et `sql.js` pour le navigateur ;
- Capacitor Preferences, Local Notifications, Haptics et Toast.

## Prérequis

- Node.js 22.12 ou version LTS plus récente ;
- npm ;
- Android Studio et le SDK Android pour une compilation native ;
- JDK 21, requis par Capacitor 8 ;
- un appareil Android avec Bluetooth LE pour valider les lectures réelles ;
- Chrome ou Edge avec Web Bluetooth pour les essais web compatibles.

Le BLE web dépend du support Web Bluetooth du navigateur. La validation finale des permissions, du scan, des lectures et des notifications doit être faite sur un appareil Android réel.

## Installation

```bash
npm install
npm run dev
```

L'application web est ensuite disponible par défaut sur `http://localhost:5173`.

La commande de préparation copie automatiquement `sql-wasm.wasm` dans `public/assets` avant le développement et le build.

## Commandes

```bash
npm run dev
npm run build
npm run lint
npm run test:unit:run
npm run test:e2e
```

Pour les tests E2E, démarrer le serveur Vite dans un autre terminal avant `npm run test:e2e`.
Chrome doit être installé sur la machine qui exécute ces tests.

## Android

L'identifiant Android est `io.senvia.app`.

Après une modification des dépendances Capacitor ou du build web :

```bash
npm run build
npx cap sync android
npx cap open android
```

Le dossier `android/` fait partie du projet et doit être versionné. Les permissions BLE et notifications sont déclarées dans `android/app/src/main/AndroidManifest.xml`.

Les données locales ne sont pas incluses dans les sauvegardes Android : la base SQLite contient l’historique des plantes et n’est pas chiffrée. Une désinstallation efface donc les plantes, mesures et alertes enregistrées.

### Installer et mettre à jour l’application

Pour une installation personnelle depuis Android Studio, la signature debug générée automatiquement suffit. Une clé release dédiée devient utile pour conserver une identité de signature stable entre plusieurs machines ou distribuer manuellement des APK construits au fil du temps.

Le guide [Compiler et installer Senvia sur Android](docs/RELEASE.md) détaille les deux méthodes, la vérification de la signature, l’installation par USB et la mise à jour sans perte de données.

## Stockage et architecture

- `src/database/` : schéma, migrations, connexion SQLite et repositories ;
- `src/services/` : BLE, alertes, notifications, préférences et opérations atomiques ;
- `src/stores/` : état Pinia et orchestration de l'interface ;
- `src/views/` : écrans Ionic ;
- `src/utils/plant-health.util.ts` : calcul du score et du statut de santé.

L'association plante-capteur et l'enregistrement d'une mesure utilisent des transactions SQLite. Des triggers maintiennent également la cohérence entre `plants.sensor_id` et `sensor_devices.plant_id`.

## Données de démonstration

Les données de démonstration sont créées uniquement en mode développement. Un build de production démarre avec une base métier vide.

Le bouton de réinitialisation des données de démonstration n'est visible qu'en développement.

## Notifications et synchronisation

Les alertes sont créées à partir des seuils de la plante, de la fraîcheur des données et du niveau de batterie. Un problème persistant met à jour le même épisode au lieu de créer des doublons. Une aggravation repasse l'alerte en non lue et peut déclencher une nouvelle notification.

Le retrait ou le remplacement d'un capteur résout ses alertes actives sans supprimer l'historique. Les alertes résolues et lues depuis plus de 90 jours sont nettoyées automatiquement. La vue permet aussi de marquer toutes les alertes comme lues et d'effacer manuellement l'historique résolu déjà lu.

Le moteur d'alertes s'exécute au démarrage, après une synchronisation et au retour au premier plan. La synchronisation au retour au premier plan est disponible sur plateforme native. Les capteurs associés sont lus successivement afin d'éviter plusieurs connexions BLE concurrentes. Aucun scan BLE permanent en arrière-plan n'est utilisé dans la V1.

## Limites V1

- aucune synchronisation cloud ni sauvegarde distante ;
- aucune prise en charge iOS validée dans le dépôt ;
- compatibilité limitée aux variantes HHCC Flower Care validées sur appareil réel ;
- les tests automatisés ne remplacent pas les essais BLE et notifications sur appareil réel.

## Licence

Senvia est distribué sous licence MIT. Consultez le fichier [`LICENSE`](LICENSE) pour les conditions de réutilisation et le [journal des changements](CHANGELOG.md) pour le suivi des versions.
