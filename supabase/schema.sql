-- ============================================================
-- Fridgy — Schéma Supabase complet
-- À exécuter dans le SQL Editor du dashboard Supabase
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES (extend auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium      boolean NOT NULL DEFAULT false,
  preferences     jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (new.id);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 2. FOYERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE foyers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             text NOT NULL,
  created_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE foyer_membres (
  foyer_id        uuid NOT NULL REFERENCES foyers(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('admin', 'membre')) DEFAULT 'membre',
  PRIMARY KEY (foyer_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- 3. PRODUITS (cache Open Food Facts + ticket + manuel)
-- ────────────────────────────────────────────────────────────
CREATE TABLE produits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ean             text UNIQUE,
  nom             text NOT NULL,
  marque          text,
  categorie       text,
  image_url       text,
  source          text NOT NULL CHECK (source IN ('open_food_facts', 'llm_ticket', 'manuel')),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- 4. INGRÉDIENTS (tags normalisés pour matching recettes)
-- ────────────────────────────────────────────────────────────
CREATE TABLE ingredients (
  tag             text PRIMARY KEY,
  categorie       text
);

CREATE TABLE ingredient_synonymes (
  synonyme        text PRIMARY KEY,
  ingredient_tag  text NOT NULL REFERENCES ingredients(tag) ON DELETE CASCADE
);

-- ────────────────────────────────────────────────────────────
-- 5. STOCK
-- ────────────────────────────────────────────────────────────
CREATE TABLE stock_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foyer_id        uuid NOT NULL REFERENCES foyers(id) ON DELETE CASCADE,
  added_by        uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  produit_id      uuid REFERENCES produits(id) ON DELETE SET NULL,
  nom_custom      text,
  ingredient_tag  text REFERENCES ingredients(tag) ON DELETE SET NULL,
  quantite        numeric NOT NULL DEFAULT 1,
  unite           text NOT NULL DEFAULT 'pièce',
  date_peremption date,
  lieu            text NOT NULL CHECK (lieu IN ('frigo', 'congelateur', 'placard')) DEFAULT 'frigo',
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nom_required CHECK (produit_id IS NOT NULL OR nom_custom IS NOT NULL)
);

CREATE INDEX idx_stock_foyer ON stock_items(foyer_id);
CREATE INDEX idx_stock_peremption ON stock_items(date_peremption);

-- ────────────────────────────────────────────────────────────
-- 6. RECETTES
-- ────────────────────────────────────────────────────────────
CREATE TABLE recettes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre               text NOT NULL,
  langue              text NOT NULL DEFAULT 'fr',
  portions_base       integer NOT NULL DEFAULT 2,
  temps_prep_min      integer,
  temps_cuisson_min   integer,
  instructions_json   jsonb NOT NULL,
  preferences         text[] NOT NULL DEFAULT '{}',
  source              text NOT NULL CHECK (source IN ('seed', 'llm_generated')) DEFAULT 'seed',
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recette_ingredients (
  recette_id          uuid NOT NULL REFERENCES recettes(id) ON DELETE CASCADE,
  ingredient_tag      text NOT NULL REFERENCES ingredients(tag) ON DELETE CASCADE,
  quantite_totale     numeric NOT NULL,
  unite               text NOT NULL,
  est_optionnel       boolean NOT NULL DEFAULT false,
  PRIMARY KEY (recette_id, ingredient_tag)
);

CREATE INDEX idx_recette_ingredients_tag ON recette_ingredients(ingredient_tag);

-- ────────────────────────────────────────────────────────────
-- 7. FAVORIS
-- ────────────────────────────────────────────────────────────
CREATE TABLE foyer_recettes_favorites (
  foyer_id        uuid NOT NULL REFERENCES foyers(id) ON DELETE CASCADE,
  recette_id      uuid NOT NULL REFERENCES recettes(id) ON DELETE CASCADE,
  saved_by        uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (foyer_id, recette_id)
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE foyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE foyer_membres ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recettes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recette_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE foyer_recettes_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_synonymes ENABLE ROW LEVEL SECURITY;

-- profiles : lecture/écriture uniquement par le proprio
CREATE POLICY "profiles: own row" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Helper : retourne les foyer_ids de l'utilisateur sans déclencher RLS (évite la récursion)
CREATE OR REPLACE FUNCTION get_user_foyer_ids(uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT foyer_id FROM foyer_membres WHERE user_id = uid;
$$;

-- foyers : INSERT libre (authentifié), SELECT/UPDATE/DELETE via helper
CREATE POLICY "foyers: insert authenticated" ON foyers
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "foyers: members select" ON foyers
  FOR SELECT USING (id IN (SELECT get_user_foyer_ids(auth.uid())));

CREATE POLICY "foyers: members update" ON foyers
  FOR UPDATE USING (id IN (SELECT get_user_foyer_ids(auth.uid())));

CREATE POLICY "foyers: members delete" ON foyers
  FOR DELETE USING (id IN (SELECT get_user_foyer_ids(auth.uid())));

-- foyer_membres : INSERT sur sa propre ligne, SELECT/DELETE via helper
CREATE POLICY "foyer_membres: insert own" ON foyer_membres
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "foyer_membres: select same foyer" ON foyer_membres
  FOR SELECT USING (foyer_id IN (SELECT get_user_foyer_ids(auth.uid())));

CREATE POLICY "foyer_membres: delete same foyer" ON foyer_membres
  FOR DELETE USING (foyer_id IN (SELECT get_user_foyer_ids(auth.uid())));

-- stock_items : accès par foyer
CREATE POLICY "stock_items: foyer members" ON stock_items
  FOR ALL USING (
    foyer_id IN (SELECT get_user_foyer_ids(auth.uid()))
  );

-- produits : lecture publique (cache partagé), écriture authentifiée
CREATE POLICY "produits: read all" ON produits
  FOR SELECT USING (true);

CREATE POLICY "produits: insert authenticated" ON produits
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- recettes : lecture publique
CREATE POLICY "recettes: read all" ON recettes
  FOR SELECT USING (true);

CREATE POLICY "recettes: insert authenticated" ON recettes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- recette_ingredients : lecture publique
CREATE POLICY "recette_ingredients: read all" ON recette_ingredients
  FOR SELECT USING (true);

CREATE POLICY "recette_ingredients: insert authenticated" ON recette_ingredients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ingredients & synonymes : lecture publique
CREATE POLICY "ingredients: read all" ON ingredients
  FOR SELECT USING (true);

CREATE POLICY "ingredient_synonymes: read all" ON ingredient_synonymes
  FOR SELECT USING (true);

-- foyer_recettes_favorites : accès par foyer
CREATE POLICY "favorites: foyer members" ON foyer_recettes_favorites
  FOR ALL USING (
    foyer_id IN (SELECT get_user_foyer_ids(auth.uid()))
  );

-- ============================================================
-- FONCTION SCORING RECETTES
-- ============================================================

-- Fonction principale utilisée par l'app (useRecipes hook).
-- Retourne les recettes avec score >= 0.5 par rapport au stock du foyer.
-- Filtre les produits périmés. Exposée via supabase.rpc('get_scored_recipes').
-- Source of truth : scripts/create-scoring-rpc.sql
CREATE OR REPLACE FUNCTION get_scored_recipes(
  p_foyer_id  uuid,
  p_limit     integer DEFAULT 10
)
RETURNS TABLE (
  id                uuid,
  titre             text,
  score             numeric,
  matched_count     bigint,
  total_count       bigint,
  missing_tags      text[],
  temps_prep_min    integer,
  temps_cuisson_min integer,
  portions_base     integer,
  preferences       text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stock_tags AS (
    SELECT DISTINCT ingredient_tag
    FROM   stock_items
    WHERE  foyer_id = p_foyer_id
      AND  ingredient_tag IS NOT NULL
      AND  (date_peremption IS NULL OR date_peremption >= CURRENT_DATE)
  ),
  scored AS (
    SELECT
      r.id,
      r.titre,
      r.temps_prep_min,
      r.temps_cuisson_min,
      r.portions_base,
      r.preferences,
      COUNT(ri.ingredient_tag) FILTER (WHERE ri.est_optionnel = false)
        AS total_required,
      COUNT(ri.ingredient_tag) FILTER (
        WHERE ri.est_optionnel = false
          AND ri.ingredient_tag IN (SELECT ingredient_tag FROM stock_tags)
      ) AS matched_required,
      ARRAY_REMOVE(
        ARRAY_AGG(ri.ingredient_tag) FILTER (
          WHERE ri.est_optionnel = false
            AND ri.ingredient_tag NOT IN (SELECT ingredient_tag FROM stock_tags)
        ),
        NULL
      ) AS missing
    FROM recettes r
    JOIN recette_ingredients ri ON ri.recette_id = r.id
    GROUP BY r.id
  )
  SELECT
    s.id,
    s.titre,
    CASE
      WHEN s.total_required = 0 THEN 0
      ELSE ROUND(s.matched_required::numeric / s.total_required::numeric, 2)
    END                         AS score,
    s.matched_required          AS matched_count,
    s.total_required            AS total_count,
    COALESCE(s.missing, '{}')   AS missing_tags,
    s.temps_prep_min,
    s.temps_cuisson_min,
    s.portions_base,
    s.preferences
  FROM scored s
  WHERE s.total_required > 0
    AND ROUND(s.matched_required::numeric / s.total_required::numeric, 2) >= 0.5
  ORDER BY score DESC, s.matched_required DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_scored_recipes TO authenticated;
