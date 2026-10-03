# OnMangeOù — restaurant

Application mobile d'exploitation. Navigation selon les entitlements API.

```bash
pnpm install --frozen-lockfile
pnpm start:go:clear
pnpm typecheck
pnpm lint
pnpm test
```

API : voir `.env.example`.

Scanner le QR code avec Expo Go sur le téléphone (même Wi-Fi que le Mac).
Le port 8083 évite le conflit avec l'application client, qui occupe le 8081.
Configuration, publication EAS Update et limites de compatibilité :
[guide Expo](docs/EXPO_DEPLOYMENT.md).
