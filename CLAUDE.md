# Fridgy — Instructions pour Claude Code

## Présentation du projet

Application mobile B2C de gestion de stock frigo/placard avec suggestions de recettes.
Cible : marché français. Solo dev. Design complet dans `frigo-app-design.md`.

## Stack

- **Mobile** : React Native + Expo (Dev Build obligatoire, pas Expo Go)
- **Backend** : Supabase (Postgres + Auth) — Supabase-first, pas de local-first
- **Navigation** : expo-router (tab bar 5 onglets)
- **i18n** : i18next + react-i18next + expo-localization
- **LLM proxy** : Vercel Edge Function + Gemini Flash 2.0
- **Auth sociale** : @react-native-google-signin/google-signin + expo-apple-authentication (natif, pas web)
- **Monétisation** : AdMob (bannières) + react-native-iap (one-time "Remove Ads")

## Structure des dossiers

Architecture **Feature-based + Atomic Design hybride** :

- `components/` → composants UI génériques (Atomic Design)
- `features/` → logique métier par domaine (hooks, services, composants spécifiques)

```
fridgy/
├── app/                        # expo-router (screens — UI only, logique dans features/)
│   ├── (tabs)/
│   │   ├── index.tsx           # Accueil
│   │   ├── stock.tsx           # Stock
│   │   ├── add.tsx             # Ajouter
│   │   ├── recipes.tsx         # Recettes
│   │   └── settings.tsx        # Réglages
│   └── (auth)/
│       ├── login.tsx
│       └── register.tsx
├── components/                 # Atomic Design — UI générique et réutilisable
│   ├── atoms/                  # Button, Input, Badge, Text, Icon
│   ├── molecules/              # ProductCard, RecipeCard, ExpiryBadge, ScanButton
│   └── organisms/              # StockList, RecipeGrid, TabBar
├── features/                   # Logique métier par domaine
│   ├── auth/
│   │   ├── components/         # LoginForm, RegisterForm (organisms spécifiques)
│   │   ├── hooks/              # useAuth, useSession
│   │   ├── services/           # authService.ts (appels Supabase)
│   │   └── types.ts
│   ├── stock/
│   │   ├── components/
│   │   ├── hooks/              # useStock, useExpiry
│   │   ├── services/           # stockService.ts
│   │   ├── utils/              # expiryUtils.ts ← TESTÉ
│   │   └── types.ts
│   ├── recipes/
│   │   ├── components/
│   │   ├── hooks/              # useRecipes, useScoring
│   │   ├── services/           # recipesService.ts, scoringService.ts
│   │   ├── utils/              # scoringUtils.ts ← TESTÉ
│   │   └── types.ts
│   ├── scanning/
│   │   ├── hooks/              # useBarcodeScan, useReceiptScan
│   │   ├── services/           # openFoodFactsService.ts, ocrService.ts
│   │   └── types.ts
│   └── foyer/
│       ├── hooks/              # useFoyer
│       ├── services/           # foyerService.ts
│       └── types.ts
├── lib/
│   ├── supabase.ts             # client Supabase
│   └── i18n/                  # config i18n + locales/fr.json
├── supabase/
│   └── schema.sql              # schéma DB complet
├── scripts/                    # seed recettes batch LLM
└── __tests__/                  # tests unitaires (Jest)
    ├── stock/
    │   └── expiryUtils.test.ts
    └── recipes/
        └── scoringUtils.test.ts
```

### Règles d'architecture

- Les **screens** (`app/`) ne contiennent que du JSX — zéro logique métier
- La logique vit dans les **hooks** (`useStock`, `useRecipes`...)
- Les appels Supabase sont isolés dans les **services** (`stockService.ts`)
- Les **utils** contiennent la logique pure (sans side effects) → ce sont eux qui sont testés
- Les **atoms** ne connaissent pas Supabase, les features, ni i18n

## Stratégie de tests

### Philosophie : teste le modèle, pas la vue

**TDD obligatoire sur la logique métier critique** — écris le test avant le code pour :

- `scoringUtils.ts` → algorithme de scoring des recettes (cœur du produit)
- `expiryUtils.ts` → calculs J-3, J-1, badges de péremption
- `ingredientUtils.ts` → normalisation des ingrédients (pluriels, synonymes)
- `stockUtils.ts` → décrément du stock après "J'ai cuisiné ça"

**Ne pas tester en MVP :**

- Composants UI (trop fragiles, trop coûteux)
- Requêtes Supabase (tests d'intégration → v2)
- Flows E2E (Maestro → post-MVP)

### Stack de tests

- **Jest** (inclus avec Expo) → runner
- **React Native Testing Library** → si tests de composants nécessaires plus tard

### Quand écrire les tests

- **Avant d'implémenter** les utils métier (TDD)
- **Jamais après** : la dette de test ne se rembourse pas

### Exemple

```typescript
// __tests__/recipes/scoringUtils.test.ts
describe('scoringRecipe', () => {
  it('retourne 1.0 si tous les ingrédients requis sont présents', () => { ... })
  it('retourne 0.5 si la moitié des ingrédients requis sont présents', () => { ... })
  it('ignore les ingrédients optionnels dans le score', () => { ... })
  it('retourne 0 si aucun ingrédient ne matche', () => { ... })
})
```

---

## Conventions

- **TypeScript strict** — pas de `any`
- **i18n obligatoire** — aucune string UI hardcodée, tout passe par `t('clé')`
- **Supabase-first** — toutes les données en base, pas de state local persistant
- **Foyer-centric** — toujours utiliser `foyer_id`, jamais `user_id` pour les données partagées
- **RLS activé** — chaque requête Supabase est protégée par Row Level Security

## Variables d'environnement

Voir `.env.example` — ne jamais commiter les vraies clés.

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=        # côté Vercel Edge Function uniquement
```

## Commandes utiles

```bash
npm run start          # démarrer le dev server
npm run android        # lancer sur Android
npm run ios            # lancer sur iOS
```

## Data model (résumé)

10 tables Supabase : `profiles`, `foyers`, `foyer_membres`, `produits`, `stock_items`,
`ingredients`, `ingredient_synonymes`, `recettes`, `recette_ingredients`, `foyer_recettes_favorites`.
Détail complet dans `frigo-app-design.md` section 5.

## Décisions importantes

- **Pas de local-first** : l'app nécessite une connexion
- **Instructions recettes relatives** : "la moitié des carottes" pas "3 carottes" (pas de scaling LLM en MVP)
- **Scoring recettes côté serveur** : requête SQL avec score ≥ 0.5, LIMIT 10 — jamais côté client
- **Ticket de caisse** : OCR on-device (MLKit) → Edge Function → Gemini Flash → confirmation utilisateur
- **Social login natif** : nécessite Dev Build, pas Expo Go

## Issues GitHub

Toutes les tâches sont trackées sur https://github.com/LoicMonard/fridgy/issues (21 issues).
Travailler dans l'ordre des issues quand possible.

---

## Git Flow

### Branches

```
main        → code stable uniquement, protégée (jamais de push direct)
develop     → branche d'intégration, base de toutes les features
feature/    → une feature = une branche depuis develop
fix/        → un bugfix = une branche depuis develop
chore/      → maintenance, config, docs
```

**Nommage des branches :**

```
feature/issue-{numéro}-{description-courte}
fix/issue-{numéro}-{description-courte}
chore/{description-courte}

Exemples :
  feature/issue-3-expo-router-setup
  feature/issue-9-barcode-scanning
  fix/issue-11-stock-list-peremption
  chore/update-dependencies
```

### Workflow par issue

```
1. Assigner l'issue à soi-même sur GitHub
2. Créer la branche depuis develop :
     git checkout develop && git pull
     git checkout -b feature/issue-{N}-{description}
3. Développer + commiter régulièrement
4. Ouvrir une PR vers develop avec "Refs #N" dans la description
5. Squash-merger la PR avec --delete-branch
6. Fermer l'issue manuellement : gh issue close N --comment "Done via PR #X"
7. Revenir sur develop et pull
```

> **Note :** `Closes #N` ne ferme l'issue automatiquement que lors d'un merge
> dans la branche par défaut (`main`). Comme les PRs ciblent `develop`,
> il faut fermer les issues manuellement après merge.

### Conventions de commits (Conventional Commits)

```
feat(scope):     nouvelle feature
fix(scope):      correction de bug
chore(scope):    maintenance, config, dépendances
docs(scope):     documentation
refactor(scope): refactoring sans changement de comportement
style(scope):    formatage uniquement

Exemples :
  feat(auth): add Google Sign In native integration
  feat(stock): implement barcode scan with Open Food Facts
  fix(recipes): correct scoring query for optional ingredients
  chore(deps): install expo-router and configure navigation
  docs(setup): add Supabase schema SQL file
```

**Règles :**

- Message en anglais
- Scope = nom de la feature (auth, stock, recipes, scanning, notifications, foyer, i18n...)
- Corps du message si besoin d'expliquer le "pourquoi"
- Toujours référencer l'issue dans le commit ou la PR

### Releases (develop → main)

```
Quand develop est stable et testable :
  git checkout main
  git merge develop --no-ff
  git tag v0.x.0
  git push && git push --tags
```

### Règles absolues

- Ne jamais push directement sur `main`
- Ne jamais commiter `.env` ou les clés API
- Toujours partir d'une issue avant de créer une branche
- Un PR = une issue = une branche
