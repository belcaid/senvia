# Senvia

Senvia est une application mobile personnelle de suivi de plantes utilisant un capteur Bluetooth Low Energy de type **Flower Care / HHCC**.

L’objectif du projet est de proposer une application **simple**, **locale**, **offline-first** et **sans compte utilisateur**, permettant de surveiller l’état des plantes à partir des mesures du capteur :

- température,
- humidité du sol,
- lumière,
- fertilité / conductivité.

## Objectif du projet

Senvia a été pensé comme un outil personnel pour :

- associer une plante à un capteur BLE,
- lire les mesures du capteur,
- historiser les données localement,
- calculer un statut de santé,
- générer des alertes utiles,
- consulter l’évolution des mesures dans le temps.

Le projet pourra être ouvert en open source par la suite.

## Fonctionnalités prévues

### V1
- ajout, modification et suppression de plantes
- association plante ↔ capteur BLE
- lecture des mesures du capteur Flower Care / HHCC
- dashboard avec aperçu des plantes
- statut global de santé par plante
- historique local des mesures
- alertes locales
- gestion des favoris
- thème clair / sombre
- réglages généraux
- fonctionnement sans compte
- fonctionnement hors ligne


## Stack technique

- **Ionic Framework**
- **Vue 3**
- **TypeScript**
- **Capacitor**
- **Pinia**
- **Bluetooth LE** via `@capacitor-community/bluetooth-le`
- **SQLite** pour le stockage métier
- **@capacitor/preferences** pour les réglages
- **@capacitor/local-notifications**
- **@capacitor/haptics**
- **@capacitor/splash-screen**
- **@capacitor/status-bar**
- **@capacitor/toast**

## Principes du projet

Senvia repose sur les principes suivants :

- **offline-first**
- **sans compte utilisateur**
- **sans dépendance serveur obligatoire**
- **stockage local**
- **consommation BLE raisonnée**
- **interface simple et lisible**