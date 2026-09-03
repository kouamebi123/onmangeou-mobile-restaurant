# Notifications et avis

SDK 54 est conservé. Les notifications utilisent expo-notifications ~0.32.17.
Les photos et signalements d’avis utilisent les mêmes composants et couleurs que
les autres écrans. Les autorisations et la modération sont vérifiées par l’API.

## Push : version native requise

Les notifications distantes sont désactivées dans Expo Go et sur le web.
Construire une nouvelle version native après cette modification ; une mise à jour
OTA seule ne peut pas ajouter le module natif.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm exec expo export --platform all
npx eas-cli@23.2.0 build --profile preview --platform android
```

Pour iOS, utiliser le profil adapté et un appareil/enregistrement Apple compatible.
Configurer les credentials FCM v1/APNs dans le projet EAS déjà associé au dépôt.
Pour Android, créer dans EAS la variable fichier GOOGLE_SERVICES_JSON contenant
le google-services.json Firebase de cette application (package Android correspondant).
Cette configuration cliente est distincte de la clé de compte de service FCM v1.
Affecter ces variables aux environnements EAS utilisés pour les builds.
Aucun secret fournisseur ne doit être ajouté aux variables EXPO_PUBLIC_*.
Le serveur doit avoir déployé la migration correspondante et activé PUSH_ENABLED=true.
Les profils EAS activent ONMANGEOU_NATIVE_RUNTIME=1 : leur runtime est calculé par
fingerprint pour éviter des mises à jour incompatibles avec les modules natifs.
Pour mettre à jour ces nouvelles versions, utiliser pnpm update:native:preview.
Conserver exactement les mêmes paramètres natifs pour le build et la mise à jour.
Sans ce paramètre, les commandes Expo Go existantes conservent la politique SDK 54.
Ne pas envoyer une mise à jour Expo Go aux anciennes versions natives utilisant
la politique sdkVersion ; reconstruire ces versions natives avant migration.
Le guide complet figure dans le backend : docs/reviews-and-push.md.

Après installation, se connecter puis activer les notifications dans la carte
Notifications du profil/menu. L’autorisation système est demandée au clic, pas
automatiquement au démarrage. Le texte de confirmation indique l’inscription de
l’appareil, pas une livraison garantie.

La reprise au premier plan et le renouvellement de jeton respectent la désactivation.
Les mutations d’inscription sont sérialisées entre la carte et le gestionnaire global.
Une notification reçue rafraîchit les listes ; le clic ouvre un écran connu de
l’application et non une URL arbitraire fournie par le message.

Recette indispensable : tester commande/réservation avec deux appareils, réception,
clic, désactivation, déconnexion et changement de compte. Les tests automatisés
et exports ne prouvent pas une livraison réelle sur téléphone.
