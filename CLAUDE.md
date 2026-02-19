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
```
fridgy/
├── app/                  # expo-router (screens)
│   ├── (tabs)/           # tab bar navigation
│   │   ├── index.tsx     # Accueil
│   │   ├── stock.tsx     # Stock
│   │   ├── add.tsx       # Ajouter
│   │   ├── recipes.tsx   # Recettes
│   │   └── settings.tsx  # Réglages
│   └── (auth)/           # auth screens
├── components/           # composants réutilisables
├── features/             # logique métier par feature
│   ├── auth/
│   ├── stock/
│   ├── recipes/
│   └── scanning/
├── lib/
│   ├── supabase.ts       # client Supabase
│   └── i18n/             # config i18n + locales
├── supabase/
│   └── schema.sql        # schéma DB complet
└── scripts/              # seed recettes, etc.
```

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
4. Ouvrir une PR vers develop avec "Closes #N" dans la description
5. Merger la PR → l'issue se ferme automatiquement
6. Supprimer la branche après merge
```

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
