# Préparer une version Android

Senvia est distribué sous forme de code source sur GitHub et installé manuellement sur une tablette Android. Ce document ne décrit donc pas une publication Google Play.

## 1. Valider la version

Avant de créer un APK définitif :

```bash
npm ci
npm audit
npm run lint
npm run test:unit:run
npm run build
npx cap sync android
./android/gradlew -p android lintRelease
```

La checklist sur appareil réel doit couvrir au minimum :

- installation propre, premier démarrage et redémarrage hors ligne ;
- création, modification, favoris et suppression d’une plante ;
- autorisations Bluetooth et notifications, y compris après un refus initial ;
- scan, association, dissociation puis nouvelle association d’un Flower Care ;
- lecture des mesures, actualisation globale et retour au premier plan ;
- alertes nouvelles, lues, suivies puis résolues ;
- conservation des plantes et mesures après fermeture de l’application ;
- affichage téléphone et tablette, portrait et paysage, avec les barres système ;
- installation d’une mise à jour par-dessus la version précédente sans perte de données.

## 2. Gérer le numéro de version

Pour chaque version, synchroniser :

- `version` dans `package.json`, affiché dans les réglages ;
- `versionName` dans `android/app/build.gradle` ;
- `versionCode` dans `android/app/build.gradle`, qui doit augmenter à chaque APK.

Reporter les changements utiles dans `CHANGELOG.md`. Le tag Git ne doit être créé qu’après la validation sur appareil réel.

## 3. Créer et sauvegarder la clé de signature

Cette étape n’est nécessaire qu’une seule fois :

```bash
keytool -genkeypair -v \
  -keystore android/senvia-release.jks \
  -alias senvia \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Mehdi Belcaid, O=Senvia"
cp android/keystore.properties.example android/keystore.properties
```

Renseigner ensuite `storePassword` et `keyPassword` dans `android/keystore.properties`.

La clé, ses mots de passe et une copie de son empreinte doivent être sauvegardés hors du dépôt, idéalement dans deux emplacements sûrs. Une mise à jour Android doit impérativement être signée avec la même clé. Perdre cette clé oblige à désinstaller l’ancienne application, ce qui efface les données locales.

## 4. Construire et vérifier l’APK

Après `npm run build` et `npx cap sync android` :

```bash
./android/gradlew -p android clean lintRelease assembleRelease
```

L’APK attendu est :

```text
android/app/build/outputs/apk/release/app-release.apk
```

Vérifier sa signature avec `apksigner`, fourni par le SDK Android :

```bash
apksigner verify --verbose --print-certs android/app/build/outputs/apk/release/app-release.apk
shasum -a 256 android/app/build/outputs/apk/release/app-release.apk
```

Conserver l’empreinte SHA-256 du certificat et la somme du fichier avec les notes de version.

## 5. Installer par USB

Activer les options développeur et le débogage USB sur la tablette, accepter l’ordinateur, puis vérifier la connexion :

```bash
adb devices
```

Première installation :

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

Mise à jour en conservant les données :

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Ne pas désinstaller l’application pour résoudre une erreur de signature sans avoir accepté la perte des plantes, mesures et alertes. Une incompatibilité de signature signifie généralement que l’APK précédent était un build debug ou utilisait une autre clé.

## 6. Play Protect et sources inconnues

Un APK auto-signé et installé hors Google Play peut être présenté comme provenant d’un développeur inconnu. Le nom affiché dans Senvia ne modifie pas la réputation Play Protect du certificat.

Autoriser, si nécessaire, l’installation d’applications inconnues uniquement pour la source utilisée — gestionnaire de fichiers, navigateur ou outil ADB — puis retirer cette autorisation après l’installation. Ne pas désactiver Play Protect globalement. Continuer uniquement pour un APK construit localement dont la signature et la somme ont été vérifiées.

## 7. Finaliser dans Git

Quand les tests tablette sont terminés :

1. vérifier que le dépôt est propre et que la CI est verte ;
2. finaliser la section de version dans `CHANGELOG.md` ;
3. créer un tag annoté, par exemple `v1.0.0` ;
4. pousser le tag sur GitHub.

La clé `.jks` et `keystore.properties` ne doivent jamais apparaître dans un commit, une archive de code source ou un artefact CI.
