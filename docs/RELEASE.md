# Compiler et installer Senvia sur Android

Senvia est publié sous forme de code source et peut être installé manuellement sur un appareil Android. Ce guide ne concerne pas une publication sur Google Play.

## Prérequis

- Node.js 22.12 ou une version LTS plus récente ;
- npm ;
- Android Studio avec le SDK Android ;
- JDK 21 ;
- une tablette ou un téléphone Android avec le débogage USB activé.

## Préparer le projet Android

Depuis la racine du dépôt :

```bash
npm ci
npm run build
npx cap sync android
npx cap open android
```

La commande `cap sync` copie le dernier build web et met à jour les plugins natifs. Elle doit être relancée après chaque modification de l’application avant de reconstruire l’APK.

## Installer une version debug

Pour un usage personnel sur ses propres appareils, aucune clé release n’est nécessaire. Android Studio signe automatiquement l’application avec une clé debug locale.

Après avoir connecté l’appareil en USB et accepté la demande de débogage, le sélectionner dans Android Studio puis utiliser **Run**. La même opération met à jour une installation debug existante sans effacer ses données, à condition d’utiliser la même clé debug.

L’installation peut aussi être effectuée en ligne de commande :

```bash
./android/gradlew -p android assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

L’option `-r` remplace l’application existante tout en conservant ses données locales.

## Utiliser une signature release durable — facultatif

Une clé release dédiée est utile pour construire des APK possédant la même signature sur plusieurs machines ou pendant une longue période. Elle n’est pas obligatoire pour lancer l’application depuis Android Studio.

La clé ne doit être créée qu’une fois :

```bash
keytool -genkeypair -v \
  -keystore android/senvia-release.jks \
  -alias senvia \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Senvia, O=Senvia"
cp android/keystore.properties.example android/keystore.properties
```

Les mots de passe sont ensuite renseignés dans `android/keystore.properties`. La clé et ce fichier sont exclus de Git et doivent être sauvegardés dans un emplacement sûr. Perdre la clé empêche de mettre à jour une application signée avec celle-ci sans désinstaller l’ancienne version, ce qui efface les données locales.

Pour construire l’APK release :

```bash
./android/gradlew -p android lintRelease assembleRelease
```

L’APK est généré dans :

```text
android/app/build/outputs/apk/release/app-release.apk
```

Sa signature et sa somme peuvent être vérifiées avec les outils du SDK Android :

```bash
apksigner verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk
shasum -a 256 android/app/build/outputs/apk/release/app-release.apk
```

## Installer ou mettre à jour l’APK release

Vérifier que l’appareil est reconnu :

```bash
adb devices
```

Première installation :

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

Mise à jour sans effacer les données :

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Une version debug et une version release ne peuvent pas se remplacer si elles utilisent des signatures différentes. Il ne faut pas désinstaller l’application pour résoudre cette erreur sans avoir accepté la perte des plantes, mesures et alertes enregistrées.

## Numéro de version

Pour identifier une nouvelle version, les valeurs suivantes doivent rester cohérentes :

- `version` dans `package.json`, affichée dans les réglages ;
- `versionName` dans `android/app/build.gradle` ;
- `versionCode` dans `android/app/build.gradle`, augmenté à chaque nouvelle APK destinée à remplacer la précédente.

## Vérifications recommandées

Avant de conserver ou partager une APK :

```bash
npm audit
npm run lint
npm run test:unit:run
npm run build
npx cap sync android
./android/gradlew -p android lintRelease
```

Un test sur appareil réel doit couvrir au minimum :

- premier démarrage et redémarrage hors ligne ;
- création, modification, favoris et suppression d’une plante ;
- autorisations Bluetooth et notifications, y compris après un refus initial ;
- scan, association, dissociation puis nouvelle association d’un Flower Care ;
- lecture des mesures et retour de l’application au premier plan ;
- alertes nouvelles, lues, suivies puis résolues ;
- conservation des données après fermeture et après mise à jour ;
- affichage en portrait et paysage avec les barres système.

## Play Protect et sources inconnues

Une APK auto-signée et installée hors Google Play peut être signalée comme provenant d’un développeur inconnu. Le nom affiché dans l’application ne modifie pas la réputation du certificat auprès de Play Protect.

L’autorisation d’installer des applications inconnues doit être accordée uniquement à la source utilisée, par exemple le gestionnaire de fichiers ou le navigateur, puis retirée après l’installation. Il n’est pas recommandé de désactiver Play Protect globalement. Une APK installée manuellement doit provenir d’un build maîtrisé dont la signature et la somme ont été vérifiées.
