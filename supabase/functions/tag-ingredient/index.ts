/**
 * Edge Function: tag-ingredient
 *
 * Déduit le tag normalisé d'un produit depuis son nom via Gemini.
 * Retourne uniquement un tag existant dans la table `ingredients`, ou null.
 *
 * Invocation : supabase.functions.invoke('tag-ingredient', { body: { nom } })
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

function buildPrompt(nom: string, tags: string[]): string {
  return `Tu es un expert en classification d'ingrédients de cuisine française.

Produit : "${nom}"

Voici la liste exacte des tags disponibles :
${tags.join(', ')}

Règles STRICTES :
- Retourne le tag le PLUS SPÉCIFIQUE qui correspond exactement au produit.
- Si le produit est un type de fromage précis pour lequel un tag existe (emmental, gruyere, parmesan, mozzarella), utilise CE tag précis — jamais "fromage".
- N'utilise "fromage" que si le nom est générique (ex: "fromage râpé", "fromage fondu", "fromage à tartiner").
- Si le produit n'est pas un ingrédient de cuisine (boisson sucrée, plat cuisiné complet, produit ménager...), retourne null.
- Retourne UNIQUEMENT le tag exact de la liste ou le mot null. Rien d'autre.

Exemples :
"Emmental râpé Président" → emmental
"Parmesan Galbani 100g" → parmesan
"Fromage râpé 4 fromages" → fromage
"Kiri" → fromage
"Lait demi-écrémé Lactel" → lait
"Escalopes de poulet" → poulet
"Coca-Cola 1,5L" → null
"Nutella" → null`;
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { nom } = await req.json() as { nom?: string };
    if (!nom?.trim()) {
      return new Response(JSON.stringify({ tag: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

    // Fetch available tags
    const { data: ingredients, error: ingError } = await supabase
      .from('ingredients')
      .select('tag')
      .order('tag');

    if (ingError || !ingredients?.length) {
      console.error('[tag-ingredient] Failed to fetch tags:', ingError);
      return new Response(JSON.stringify({ tag: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tags = ingredients.map((i: { tag: string }) => i.tag);
    const tagSet = new Set(tags);

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(nom, tags) }] }],
        generationConfig: {
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!geminiRes.ok) {
      console.error('[tag-ingredient] Gemini error:', await geminiRes.text());
      return new Response(JSON.stringify({ tag: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const geminiData = await geminiRes.json() as GeminiResponse;
    const raw = (geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim().toLowerCase();

    // Validate: must be in the tag list
    const tag = raw === 'null' || !tagSet.has(raw) ? null : raw;

    console.log(`[tag-ingredient] "${nom}" → ${tag ?? 'null'}`);

    return new Response(JSON.stringify({ tag }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[tag-ingredient] Unexpected error:', err);
    return new Response(JSON.stringify({ tag: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
