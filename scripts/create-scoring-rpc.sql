-- Supabase RPC : scoring de recettes par rapport au stock du foyer
-- Exécuter via : scripts/run-sql.mjs scripts/create-scoring-rpc.sql

CREATE OR REPLACE FUNCTION get_scored_recipes(
  p_foyer_id  uuid,
  p_limit     integer DEFAULT 10,
  p_min_score numeric DEFAULT 0.5
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
    AND ROUND(s.matched_required::numeric / s.total_required::numeric, 2) >= p_min_score
  ORDER BY score DESC, s.matched_required DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_scored_recipes TO authenticated;
