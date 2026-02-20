# FrigoApp — Design Document

> Document généré suite à une session de brainstorming structuré.
> Date : 19 février 2026

---

## 1. Résumé du projet

Application mobile B2C de gestion de stock frigo/placard, ciblant le marché français. L'objectif est de résoudre les 4 douleurs fondamentales des utilisateurs : achats en double, gaspillage alimentaire (dates de péremption ratées), ne pas savoir quoi cuisiner avec ce qu'on a, et la friction de saisie qui tue toutes les apps concurrentes.

**Concurrent principal identifié** : Frigo Magic — concept validé, mais app en décrépitude (bug navigation Android non corrigé depuis oct. 2025, recettes mal matchées, pas de vrai stock management). Le marché existe et est sous-servi.

---

## 2. Contexte & Contraintes

- **Développeur** : solo fullstack, React Native possible
- **Horizon MVP** : 3-4 semaines (avec IA comme accélérateur)
- **Cible** : B2C grand public, marché français
- **Croissance** : organique prioritaire, petit budget pub possible
- **Monétisation** : app gratuite + bannières AdMob + IAP one-time "remove ads" (~2,99€)

---

## 3. Non-goals (MVP)

- Widget home screen
- Planning de repas sur la semaine
- Liste de courses collaborative en temps réel
- Statistiques de gaspillage
- Scan de ticket amélioré par enseigne
- Scaling des instructions de recettes via LLM

---

## 4. Stack Technique

| Composant     | Choix                                                                 | Raison                                                             |
| ------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Mobile        | React Native + Expo (Dev Build)                                       | Cross-platform, familier, build simplifié                          |
| Backend       | Supabase (Postgres + Auth)                                            | Gratuit, scalable, API auto-générée                                |
| LLM proxy     | Vercel Edge Function                                                  | Stateless, déploiement 10 min, gratuit                             |
| LLM           | Gemini Flash 2.0                                                      | Free tier généreux, rapide                                         |
| Produits      | Open Food Facts API                                                   | Gratuit, open source, millions de produits                         |
| Scan barcode  | expo-camera + barcode scanner                                         | On-device, gratuit, aucun appel réseau                             |
| OCR ticket    | MLKit (react-native-mlkit-ocr)                                        | On-device, gratuit                                                 |
| Notifications | expo-notifications                                                    | Natif, pas de backend requis                                       |
| Auth sociale  | @react-native-google-signin/google-signin + expo-apple-authentication | Login natif (pas web), obligatoire sur iOS pour Sign in with Apple |
| i18n          | i18next + react-i18next + expo-localization                           | Setup dès le départ, coût faible, retrofit douloureux              |
| Monétisation  | AdMob + react-native-iap                                              | Standards du marché                                                |

> **Expo Development Build requis** (pas Expo Go) pour les social logins natifs. Standard pour toute app en production.

**Pas de local-first** : toutes les données vivent dans Supabase. L'offline est hors scope MVP.

---

## 5. Data Model

### Tables

```sql
-- Utilisateurs (géré par Supabase Auth)
profiles
  id              uuid PK (= auth.users.id)
  is_premium      boolean
  preferences     jsonb   -- veggie, vegan, sans gluten...
  created_at      timestamp

-- Foyers partagés
foyers
  id              uuid PK
  nom             text
  created_by      uuid → profiles.id
  created_at      timestamp

foyer_membres
  foyer_id        uuid → foyers.id
  user_id         uuid → profiles.id
  role            text  -- 'admin' | 'membre'
  PRIMARY KEY (foyer_id, user_id)

-- Cache produits (Open Food Facts + ticket + manuel)
produits
  id              uuid PK
  ean             text UNIQUE nullable
  nom             text
  marque          text
  categorie       text
  image_url       text
  source          text  -- 'open_food_facts' | 'llm_ticket' | 'manuel'
  created_at      timestamp

-- Stock du foyer
stock_items
  id              uuid PK
  foyer_id        uuid → foyers.id
  added_by        uuid → profiles.id
  produit_id      uuid → produits.id nullable
  nom_custom      text  -- si pas de produit reconnu
  ingredient_tag  text → ingredients.tag
  quantite        numeric
  unite           text  -- 'pièce' | 'g' | 'ml' | 'cs' | ...
  date_peremption date
  lieu            text  -- 'frigo' | 'congelateur' | 'placard'
  created_at      timestamp

-- Tags normalisés pour le matching recettes
ingredients
  tag             text PK  -- 'carotte', 'oeuf', 'lait'...
  categorie       text     -- 'légume', 'protéine', 'laitage'...

ingredient_synonymes
  synonyme        text PK  -- 'carottes', 'carotte râpée', 'carotte bio'
  ingredient_tag  text → ingredients.tag

-- Recettes (table globale partagée entre tous les users)
recettes
  id              uuid PK
  titre           text
  langue          text DEFAULT 'fr'  -- pour l'internationalisation future
  portions_base   integer
  temps_prep_min  integer
  temps_cuisson_min integer
  instructions_json jsonb  -- étapes avec quantités relatives (voir structure ci-dessous)
  preferences     text[]   -- ['veggie', 'sans gluten'...]
  source          text     -- 'seed' | 'llm_generated'
  created_at      timestamp

-- Pour le scoring SQL (séparé du JSONB)
recette_ingredients
  recette_id      uuid → recettes.id
  ingredient_tag  text → ingredients.tag
  quantite_totale numeric
  unite           text
  est_optionnel   boolean DEFAULT false
  PRIMARY KEY (recette_id, ingredient_tag)

-- Favoris au niveau foyer
foyer_recettes_favorites
  foyer_id        uuid → foyers.id
  recette_id      uuid → recettes.id
  saved_by        uuid → profiles.id
  created_at      timestamp
  PRIMARY KEY (foyer_id, recette_id)
```

### Structure JSONB des instructions recettes

```json
{
  "portions": 2,
  "etapes": [
    {
      "ordre": 1,
      "instruction": "Coupez la moitié des carottes en petits morceaux pour la sauce",
      "duration_minutes": 5,
      "ingredients": [{ "tag": "carotte", "quantite": 3, "unite": "pièce" }]
    },
    {
      "ordre": 2,
      "instruction": "Coupez le reste des carottes en gros morceaux pour le plat",
      "duration_minutes": 5,
      "ingredients": [{ "tag": "carotte", "quantite": 3, "unite": "pièce" }]
    }
  ]
}
```

> Note : les instructions utilisent un langage **relatif** ("la moitié des carottes", "le reste") plutôt que des quantités absolues, pour éviter le problème de scaling sans appel LLM supplémentaire.

### Index critiques

```sql
CREATE INDEX idx_stock_foyer ON stock_items(foyer_id);
CREATE INDEX idx_stock_peremption ON stock_items(date_peremption);
CREATE INDEX idx_recette_ingredients_tag ON recette_ingredients(ingredient_tag);
```

---

## 6. Algorithme de suggestion de recettes

```
1. Client envoie → liste des ingredient_tags du stock du foyer

2. Supabase calcule le score côté DB :

   SELECT
     r.id, r.titre,
     COUNT(*) FILTER (
       WHERE ri.ingredient_tag = ANY(:stock_tags) AND NOT ri.est_optionnel
     ) * 1.0 /
     COUNT(*) FILTER (WHERE NOT ri.est_optionnel) AS score
   FROM recettes r
   JOIN recette_ingredients ri ON r.id = ri.recette_id
   -- filtre préférences alimentaires du foyer
   GROUP BY r.id
   HAVING score >= 0.5
   ORDER BY score DESC
   LIMIT 10

3. Si < 3 résultats → appel LLM (Gemini Flash) :
   - Prompt : liste des ingrédients disponibles + préférences
   - LLM génère des recettes avec structure JSONB complète
   - Stockage en base (recettes + recette_ingredients)
   - Retour à l'utilisateur

4. Les recettes LLM s'accumulent → les appels futurs servent depuis la base
```

**Cold start** : seed de 200-300 recettes françaises communes générées en batch avant le lancement.

---

## 7. Pipeline scan ticket de caisse

```
1. Utilisateur prend une photo du ticket
2. MLKit OCR on-device → texte brut extrait
3. Envoi à la Vercel Edge Function
4. Appel Gemini Flash :
   "Voici le texte d'un ticket de caisse français.
    Pour chaque ligne produit, retourne :
    { nom, ingredient_tag, quantite_estimee, unite, duree_conservation_jours }"
5. Retour : liste de produits interprétés
6. Écran de confirmation : l'utilisateur valide / corrige / supprime
7. Ajout en masse dans stock_items
```

**Fallback** : si OCR ou LLM échoue → message clair + redirection vers scan code-barres ou saisie manuelle.

---

## 8. Navigation & Écrans

### Tab bar principale

```
🏠 Accueil  |  📦 Stock  |  ➕ Ajouter  |  🍳 Recettes  |  ⚙️ Réglages
```

### Détail des écrans

**Accueil**

- Alertes produits expirant dans les 3 jours (J-3, J-1)
- Raccourci "Qu'est-ce que je cuisine ?"
- Derniers produits ajoutés

**Stock**

- Liste par lieu : Frigo / Congélateur / Placard
- Badge coloré de péremption sur chaque item
- Swipe pour modifier quantité ou supprimer

**Ajouter** (bottom sheet)

- Scan code-barres
- Scan ticket de caisse
- Saisie manuelle

**Recettes**

- Suggestions scorées (% affiché)
- Ingrédients manquants → ajout à liste de courses
- Onglet Favoris du foyer
- Détail : ingrédients + étapes + bouton "J'ai cuisiné ça"

**Réglages**

- Gérer le foyer (inviter des membres via lien/code)
- Préférences alimentaires
- Paramètres notifications
- Supprimer les pubs (IAP)

### Flow critique : "J'ai cuisiné ça"

```
Tap bouton → affiche les ingrédients utilisés avec quantités
→ utilisateur confirme
→ décrémente stock_items correspondants
→ supprime les items à 0
```

---

## 9. Monétisation

- **Téléchargement** : gratuit
- **Publicité** : bannières AdMob (non-intrusif, pas d'interstitiels)
- **IAP** : one-time purchase "Remove Ads" ~2,99€ via react-native-iap
  - Lié à l'Apple ID / Google Account (pas besoin de compte propre)
  - Bouton "Restaurer les achats" obligatoire sur iOS
  - `is_premium` stocké dans `profiles`

---

## 10. Decision Log

| Décision                                                                     | Alternatives écartées                      | Raison                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| Supabase-first (pas local-first)                                             | SQLite + sync custom                       | Trop complexe pour un solo dev MVP                      |
| Comptes obligatoires dès le départ                                           | Mode anonyme                               | Nécessaire pour foyer partagé + favoris                 |
| Scan ticket via OCR + LLM                                                    | Matching direct Open Food Facts            | Noms de produits trop abrégés sur tickets               |
| LLM via Vercel Edge Function                                                 | LLM on-device                              | Précision, simplicité, free tier généreux               |
| JSONB pour instructions recettes                                             | Schéma relationnel normalisé               | Gestion des quantités par étape, flexible               |
| Table `recette_ingredients` séparée du JSONB                                 | Scoring depuis JSONB                       | Performance du scoring SQL                              |
| Instructions relatives (pas scalées)                                         | Templating, regénération LLM à l'affichage | MVP : 80% valeur sans complexité                        |
| Modèle foyer dès le départ                                                   | user_id migré plus tard                    | Migration trop coûteuse à faire après                   |
| Free + pub + IAP remove ads                                                  | Abonnement, app payante                    | Pas de friction au download, LTV réaliste               |
| Seed 200-300 recettes avant lancement                                        | Cold start naturel                         | Évite appels LLM massifs pour les 1000 premiers users   |
| Scoring SQL côté serveur                                                     | Scoring côté client                        | Ne pas rapatrier toutes les recettes                    |
| Score flexible (≥ 50%)                                                       | Seuil strict 100%                          | Meilleure UX, recettes "presque faisables" visibles     |
| Social login natif (@react-native-google-signin + expo-apple-authentication) | OAuth web via expo-auth-session            | UX native identique à Capacitor, pas de browser popup   |
| i18n dès le départ (i18next)                                                 | Retrofit plus tard                         | Coût faible au départ, très douloureux à ajouter après  |
| Colonne `langue` sur recettes                                                | Table de traductions séparée               | Simple pour MVP, extensible pour marchés internationaux |

---

## 11. Prochaines étapes (implémentation suggérée)

1. Setup Supabase + schéma DB + RLS policies
2. Setup Expo Dev Build + navigation tab bar + i18n (fr.json)
3. Auth (email/password + Google natif + Apple natif + création foyer)
4. Scan code-barres + Open Food Facts
5. Stock CRUD (ajout, modification, suppression)
6. Alertes de péremption (expo-notifications)
7. Seed recettes (batch LLM)
8. Algorithme scoring + écran recettes
9. Scan ticket de caisse (OCR + Edge Function + LLM)
10. IAP + AdMob
11. Gestion foyer (invitations)
