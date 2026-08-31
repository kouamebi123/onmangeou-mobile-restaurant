# OnMangeOu — application mobile restaurant

Dépôt autonome de l'exploitation restaurant Android/iOS.

## Référence

- Spécification maître : `docs/reference/OnMangeOu_Specification_Technique_Maitre.md`
- Tokens de marque : `docs/reference/onmangeou-tokens.json`

## Périmètre

Connexion OTP, entitlements, établissements, catalogue (création de plat, rupture) et création d'organisation. Les commandes, la caisse et les modules avancés appartiennent aux tranches suivantes.

## Commandes

```bash
pnpm start
pnpm typecheck
pnpm test
```

API : `EXPO_PUBLIC_API_URL` (défaut `http://localhost:3000/api/v1`).

## Règles impératives

- TypeScript strict, aucun `any`.
- Textes utilisateur uniquement via i18n `fr-CI`.
- Navigation construite depuis `GET /merchant/entitlements`. Ne pas coder les offres.
- Modules non activés invisibles.
- Écritures critiques avec `Idempotency-Key`.
- Jetons dans `expo-secure-store`.
