/**
 * Edge Function: seed-recipes
 *
 * Génère N recettes françaises via Gemini et les insère en base.
 * À appeler UNE seule fois (ou avec un count réduit pour tester).
 *
 * Invocation :
 *   supabase functions invoke seed-recipes --no-verify-jwt \
 *     --body '{"count": 10, "secret": "<SEED_SECRET>"}'
 *
 * La variable SEED_SECRET doit être définie via :
 *   supabase secrets set SEED_SECRET=<valeur>
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
Utilise UNIQUEMENT les tags d'ingrédients de la liste fournie.

Liste des tags disponibles :
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
    const body = await req.json() as { count?: number; secret?: string };
    const count = Math.min(body.count ?? 10, 50); // max 50 par appel

    // Secret check
    const expectedSecret = Deno.env.get('SEED_SECRET');
    if (expectedSecret && body.secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

    // Supabase client with service role to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Fetch available ingredient tags
    const { data: ingredients, error: ingError } = await supabase
      .from('ingredients')
      .select('tag')
      .order('tag');

    if (ingError) throw ingError;
    if (!ingredients || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No ingredients in DB. Run seed-ingredients.sql first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const tags = ingredients.map((i: { tag: string }) => i.tag);
    console.log(`[seed-recipes] ${tags.length} tags disponibles, génération de ${count} recettes…`);

    // Call Gemini
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(tags, count) }] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('[seed-recipes] Gemini error:', err);
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
      console.error('[seed-recipes] JSON parse error:', rawText.slice(0, 500));
      return new Response(JSON.stringify({ error: 'PARSE_ERROR' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const recettes = parsed.recettes ?? [];
    const tagSet = new Set(tags);
    const results = { inserted: 0, skipped: 0, errors: [] as string[] };

    for (const r of recettes) {
      try {
        // Validate & filter ingredients to known tags only
        const validIngredients = (r.ingredients ?? []).filter((i) => tagSet.has(i.tag));
        if (validIngredients.length === 0) {
          results.skipped++;
          console.warn(`[seed-recipes] Skipped "${r.titre}": no valid ingredient tags`);
          continue;
        }

        // Insert recette
        const { data: inserted, error: recetteError } = await supabase
          .from('recettes')
          .insert({
            titre: r.titre,
            portions_base: r.portions_base ?? 4,
            temps_prep_min: r.temps_prep_min ?? null,
            temps_cuisson_min: r.temps_cuisson_min ?? null,
            instructions_json: r.instructions ?? [],
            preferences: r.preferences ?? [],
            source: 'seed',
          })
          .select('id')
          .single();

        if (recetteError) throw recetteError;

        // Insert ingredients
        const { error: ingInsertError } = await supabase
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

        results.inserted++;
        console.log(`[seed-recipes] ✓ "${r.titre}" (${validIngredients.length} ingrédients)`);
      } catch (err) {
        results.errors.push(`"${r.titre}": ${(err as Error).message}`);
        console.error(`[seed-recipes] ✗ "${r.titre}":`, err);
      }
    }

    return new Response(JSON.stringify({ ...results, total: recettes.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[seed-recipes] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
