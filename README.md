# OnMangeOù — restaurant

Application mobile d'exploitation. Navigation selon les entitlements API.

```bash
pnpm install --no-frozen-lockfile
pnpm start:go:clear
pnpm typecheck
```

API : voir `.env.example`.

Migration SDK 54 : le verrouillage pnpm n'a pas pu être régénéré dans
l'environnement de préparation. Après cette première installation, vérifier
les tests et les exports puis committer `pnpm-lock.yaml`. Les installations
suivantes pourront utiliser `--frozen-lockfile`. La CI reste bloquée tant
que le verrouillage n'est pas synchronisé.

Scanner le QR code avec Expo Go sur le téléphone (même Wi-Fi que le Mac).
Le port 8083 évite le conflit habituel avec Docker sur 8081.
Configuration, publication EAS Update et limites de compatibilité :
[guide Expo](docs/EXPO_DEPLOYMENT.md).
