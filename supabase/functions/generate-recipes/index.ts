/**
 * Edge Function: generate-recipes
 *
 * Génère 5 recettes personnalisées basées sur les tags du stock du foyer courant.
 * Requiert un JWT valide (utilisateur authentifié).
 *
 * Invocation côté client :
 *   supabase.functions.invoke('generate-recipes')
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const RECIPES_TO_GENERATE = 3;

interface RecetteIngredient {
  tag: string;
  quantite: number;
  unite: string;
  est_optionnel: boolean;
}

interface RecetteGemini {
  titre: string;
  portions_base: number;
  temps_prep_min: number;
  temps_cuisson_min: number;
  preferences: string[];
  instructions: { etape: number; texte: string }[];
  ingredients: RecetteIngredient[];
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

function buildPrompt(tags: string[], count: number): string {
  return `Tu es un chef cuisinier expert en cuisine française du quotidien.

Génère exactement ${count} recettes françaises traditionnelles et familiales DISTINCTES (pas de restaurant).
Ces recettes sont pensées pour un utilisateur dont le stock contient ces ingrédients.
Utilise PRINCIPALEMENT les tags d'ingrédients de la liste fournie (tu peux en utiliser plusieurs par recette).

Liste des tags disponibles dans le stock :
${tags.join(', ')}

Retourne un objet JSON avec une clé "recettes" contenant un tableau de ${count} recettes.
Chaque recette doit avoir ces champs :
- titre: string (nom de la recette en français)
- portions_base: number (2 ou 4)
- temps_prep_min: number (entre 5 et 45)
- temps_cuisson_min: number (entre 0 et 90)
- preferences: string[] (valeurs possibles : "vegetarien", "vegan", "sans_gluten", "sans_lactose", ou tableau vide)
- instructions: tableau de {"etape": number, "texte": string} (4 à 7 étapes)
  - Les quantités dans les instructions doivent être RELATIVES ("la moitié des carottes", "le reste de la sauce")
  - JAMAIS de quantités absolues dans les instructions
- ingredients: tableau de {"tag": string, "quantite": number, "unite": string, "est_optionnel": boolean}
  - 3 à 7 ingrédients par recette
  - UNIQUEMENT des tags de la liste fournie
  - quantite : quantité totale pour portions_base personnes
  - unite : "g", "kg", "ml", "L", "unite", "cas" (cuillère à soupe), "cac" (cuillère à café), "pincee"

Règles :
- Chaque recette doit être différente
- Mélange des recettes végétariennes et carnées
- Cuisine familiale simple : gratin, quiche, soupe, tajine, risotto, etc.
- Retourne UNIQUEMENT le JSON valide : {"recettes": [...]}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    // Auth via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Anon client for RLS-protected reads
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Admin client for inserts (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Resolve foyer
    const { data: membre } = await supabase
      .from('foyer_membres')
      .select('foyer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membre?.foyer_id) {
      return new Response(JSON.stringify({ error: 'NO_FOYER' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const foyerId = membre.foyer_id as string;

    // Fetch stock tags for this foyer
    const { data: stockItems } = await supabase
      .from('stock_items')
      .select('ingredient_tag')
      .eq('foyer_id', foyerId)
      .not('ingredient_tag', 'is', null);

    const tags = [...new Set(
      (stockItems ?? [])
        .map((s: { ingredient_tag: string | null }) => s.ingredient_tag)
        .filter((t): t is string => Boolean(t)),
    )];

    if (tags.length === 0) {
      console.warn('[generate-recipes] NO_STOCK_TAGS for foyer', foyerId);
      return new Response(JSON.stringify({ error: 'NO_STOCK_TAGS' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

    console.log(`[generate-recipes] ${tags.length} tags en stock, génération de ${RECIPES_TO_GENERATE} recettes…`);

    // Call Gemini
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(tags, RECIPES_TO_GENERATE) }] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('[generate-recipes] Gemini error:', err);
      return new Response(JSON.stringify({ error: 'GEMINI_ERROR', detail: err }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const geminiData = await geminiRes.json() as GeminiResponse;
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    let parsed: { recettes?: RecetteGemini[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error('[generate-recipes] JSON parse error:', rawText.slice(0, 500));
      return new Response(JSON.stringify({ error: 'PARSE_ERROR' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const recettes = parsed.recettes ?? [];
    const tagSet = new Set(tags);
    let generated = 0;
    const errors: string[] = [];

    for (const r of recettes) {
      try {
        const validIngredients = (r.ingredients ?? []).filter((i) => tagSet.has(i.tag));
        if (validIngredients.length === 0) {
          console.warn(`[generate-recipes] Skipped "${r.titre}": no valid ingredient tags`);
          continue;
        }

        const { data: inserted, error: recetteError } = await supabaseAdmin
          .from('recettes')
          .insert({
            titre: r.titre,
            portions_base: r.portions_base ?? 4,
            temps_prep_min: r.temps_prep_min ?? null,
            temps_cuisson_min: r.temps_cuisson_min ?? null,
            instructions_json: r.instructions ?? [],
            preferences: r.preferences ?? [],
            source: 'llm_generated',
          })
          .select('id')
          .single();

        if (recetteError) throw recetteError;

        const { error: ingInsertError } = await supabaseAdmin
          .from('recette_ingredients')
          .insert(
            validIngredients.map((i) => ({
              recette_id: inserted.id,
              ingredient_tag: i.tag,
              quantite_totale: i.quantite,
              unite: i.unite,
              est_optionnel: i.est_optionnel ?? false,
            })),
          );

        if (ingInsertError) throw ingInsertError;

        generated++;
        console.log(`[generate-recipes] ✓ "${r.titre}" (${validIngredients.length} ingrédients)`);
      } catch (err) {
        errors.push(`"${r.titre}": ${(err as Error).message}`);
        console.error(`[generate-recipes] ✗ "${r.titre}":`, err);
      }
    }

    return new Response(JSON.stringify({ generated, total: recettes.length, errors }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[generate-recipes] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
