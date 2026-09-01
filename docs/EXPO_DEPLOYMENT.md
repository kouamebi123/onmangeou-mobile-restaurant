# Expo / EAS — onmangeou-restaurant

Projet : https://expo.dev/accounts/manu99/projects/onmangeou-restaurant
Identifiant : `88a9ebeb-d938-4fb8-b688-cc09d506f326`.
La configuration du dépôt pointe vers ce projet existant ; l'accès distant reste à vérifier avec un jeton autorisé.

## Secret requis
Créer un jeton personnel Expo pour un compte autorisé sur le projet.
Dans GitHub : Settings > Secrets and variables > Actions > New repository secret.
Nom : `EXPO_TOKEN`. Ne jamais mettre sa valeur dans le code, une variable EXPO_PUBLIC, un ticket ou un message.

## Utilisation
Dans Actions > Expo EAS > Run workflow, choisir la branche main.
1. operation=verify : vérifie les tests, le jeton et la liaison, sans lancer de build.
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
Aucune publication EAS Update/Expo Go n'est ajoutée. Un build EAS est distinct
du lancement dans Expo Go et de la soumission App Store / Google Play.

Référence : https://docs.expo.dev/build/building-on-ci/
