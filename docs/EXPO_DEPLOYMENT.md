# Expo / EAS — onmangeou-restaurant

Projet : https://expo.dev/accounts/manu99/projects/onmangeou-restaurant
Identifiant : `88a9ebeb-d938-4fb8-b688-cc09d506f326`.
La configuration du dépôt pointe vers ce projet existant ; l'accès distant reste à vérifier avec un jeton autorisé.

## Tester sur téléphone avec Expo Go

Toute la pile mobile est alignée sur le SDK 54 du client (React Native 0.81.5).
Expo Go installé sur le téléphone doit prendre en charge ce SDK.
Ne pas lancer une mise à niveau vers Expo latest pour ces tests.

```sh
git pull
pnpm install --no-frozen-lockfile
pnpm start:go:clear
```

Scanner le QR code depuis le téléphone, sur le même Wi-Fi que le Mac.
Pour cette migration, régénérer et committer pnpm-lock.yaml après l'installation
et les vérifications : l'installation de préparation a été interrompue avant
sa mise à jour. La CI utilise --frozen-lockfile et échouera tant que ce fichier
ne correspond pas à package.json. Ne pas désactiver ce contrôle en CI.
Le port 8083 évite le conflit Docker habituel sur 8081. Si nécessaire :
`pnpm exec expo start --go --port 8084 --clear`.
Laisser Metro ouvert. Pas besoin de Xcode pour scanner le QR code ;
`--ios` concerne le simulateur du Mac.

Définir dans le fichier local .env :
`EXPO_PUBLIC_API_URL=https://onmangeou-backend-api-production.up.railway.app/api/v1`.
Ne jamais mettre de secrets dans EXPO_PUBLIC. Les essais utilisent l'API Railway
réelle : utiliser un compte et des données de test identifiables.

## Publier une preview sans garder Metro ouvert

L'URL updates et runtimeVersion.policy=sdkVersion ciblent le projet restaurant.
Configurer dans Expo, environnement **preview**, la variable publique
`EXPO_PUBLIC_API_URL` avec l'URL Railway ci-dessus (visibilité plain text).
Le bloc env d'eas.json ne configure que les builds, pas les updates.
Avec --environment preview, les variables EAS remplacent celles du .env local.

```sh
npx eas-cli@23.2.0 login
npx eas-cli@23.2.0 project:info
pnpm typecheck
pnpm lint
pnpm test
pnpm export:mobile
pnpm update:preview --message "Restaurant SDK 54"
```

Vérifier que project:info indique manu99 et l'identifiant restaurant ci-dessus.
Dans le projet Expo > Updates > preview, ouvrir la preview Expo Go compatible
ou scanner son QR code. Se connecter au compte autorisé si nécessaire.
Une publication JavaScript n'est pas un build APK/IPA.
Les anciens binaires SDK 57 doivent être reconstruits pour SDK 54.
À SDK constant, reconstruire aussi après un changement de module natif :
la politique sdkVersion ne détecte pas ces changements.

Sur Android, une version Expo Go adaptée est disponible via https://expo.dev/go.
Sur iPhone physique, une ancienne version n'est pas installable depuis l'App Store :
si Expo Go ne prend plus en charge SDK 54, un build dédié sera nécessaire.
L'URL updates ne contourne pas la compatibilité native.

## Secret requis
Créer un jeton personnel Expo pour un compte autorisé sur le projet.
Dans GitHub : Settings > Secrets and variables > Actions > New repository secret.
Nom : `EXPO_TOKEN`. Ne jamais mettre sa valeur dans le code, une variable EXPO_PUBLIC, un ticket ou un message.

## Utilisation
Dans Actions > Expo EAS > Run workflow, choisir la branche main.
1. operation=verify : vérifie les tests, le jeton et la liaison, sans lancer de build.
   operation=update : publie manuellement une preview iOS et Android sur la branche
   EAS preview. Les champs platform/profile ne concernent que les builds.
2. operation=build, platform=android, profile=preview : construit un APK installable.
3. platform=ios : nécessite les certificats/profils Apple et, pour preview, les appareils enregistrés.
Le profil production prépare les binaires pour les stores mais ne les soumet pas.

Le workflow attend le résultat du build (limite 90 minutes). Un délai dépassé ou
l'annulation de GitHub Actions n'annule pas nécessairement le build distant :
contrôler le tableau de bord Expo avant de relancer.

## Premier build et signature
Si les identifiants de signature ne sont pas encore configurés, le mode non interactif échouera.
Sur un poste de confiance, dans le dépôt mis à jour :
```sh
npx eas-cli@23.2.0 login
npx eas-cli@23.2.0 project:info
npx eas-cli@23.2.0 build --platform android --profile preview
```
Valider la création du keystore si nécessaire. Pour iOS, refaire la configuration
avec --platform ios et le compte Apple approprié. Ne pas désactiver la signature.
Les builds peuvent consommer les quotas/crédits du compte.

## Environnements
L'API Railway avec /api/v1 est définie dans le profil EAS de base.
Les profils preview et production utilisent leurs environnements Expo respectifs.

Le profil development existant nécessite expo-dev-client, qui n'est pas installé :
il n'est volontairement pas proposé par ce workflow.
La CI vérifie les exports iOS, Android et web. Aucun git push ne publie
automatiquement d'update : utiliser la commande ou l'action manuelle.
Un build EAS est distinct du lancement Expo Go et de la soumission aux stores.

## Validation sur appareil

Les exports ne remplacent pas un test réel : vérifier connexion OTP, onboarding,
navigation, commandes et sélection d'image (permission, annulation et upload).
La livraison SMS et les permissions du téléphone ne sont pas validées par la CI.

Référence : https://docs.expo.dev/build/building-on-ci/
