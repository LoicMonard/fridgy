import { createClient } from 'jsr:@supabase/supabase-js@2';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'meta-llama/llama-4-maverick-17b-128e-instruct';

interface ParsedItem {
  nom: string;
  ingredient_tag: string | null;
  quantite_estimee: number;
  unite: string;
  duree_conservation_jours: number | null;
}

interface GroqResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

const PROMPT = `Tu es un assistant qui analyse une photo de ticket de caisse français.
Identifie tous les produits alimentaires visibles et retourne un objet JSON avec une clé "items" contenant un tableau.

Pour chaque produit alimentaire, retourne un objet avec ces champs :
- nom : string — nom lisible (corrige les abréviations, ex: "YAO FRT 4X125" → "Yaourt aux fruits 4x125g")
- ingredient_tag : string | null — tag normalisé en minuscules sans accents (ex: "yaourt", "lait", "beurre"), null si incertain
- quantite_estimee : number — quantité estimée (défaut 1)
- unite : string — "unite", "kg", "g", "L", "mL", "lot"
- duree_conservation_jours : number | null — estimation selon le type de produit, null si inconnu

Règles :
- Ignore les articles non alimentaires (produits ménagers, hygiène, etc.)
- Ignore les lignes de prix, totaux, remises
- Retourne UNIQUEMENT ce format JSON : {"items": [...]}}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  const t0 = Date.now();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const token = authHeader.replace('Bearer ', '');
    const tAuth0 = Date.now();
    const { error: authError } = await supabase.auth.getUser(token);
    console.log(`[parse-receipt] auth: ${Date.now() - tAuth0}ms`);

    if (authError) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { imageBase64, mimeType = 'image/jpeg' } =
      await req.json() as { imageBase64?: string; mimeType?: string };

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[parse-receipt] image size: ${Math.round(imageBase64.length / 1024)}KB (base64)`);

    const groqKey = Deno.env.get('GROQ_API_KEY');
    if (!groqKey) throw new Error('GROQ_API_KEY not configured');

    const tLlm0 = Date.now();
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
              {
                type: 'text',
                text: PROMPT,
              },
            ],
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });
    console.log(`[parse-receipt] groq: ${Date.now() - tLlm0}ms`);

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('[parse-receipt] Groq error:', err);
      return new Response(JSON.stringify({ error: 'LLM_ERROR' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const groqData = await groqRes.json() as GroqResponse;
    const rawText = groqData.choices?.[0]?.message?.content ?? '';
    console.log('[parse-receipt] raw response:', rawText.slice(0, 300));

    // Strip markdown code blocks if present
    const cleaned = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[parse-receipt] Failed to parse JSON:', cleaned);
      return new Response(JSON.stringify({ error: 'PARSE_ERROR', raw: cleaned }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const items: ParsedItem[] = Array.isArray(parsed)
      ? parsed as ParsedItem[]
      : (parsed as { items?: ParsedItem[] }).items ?? [];

    console.log(`[parse-receipt] total: ${Date.now() - t0}ms — ${items.length} items`);

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[parse-receipt] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'INTERNAL_ERROR' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
