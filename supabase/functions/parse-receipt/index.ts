import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface ParsedItem {
  nom: string;
  ingredient_tag: string | null;
  quantite_estimee: number;
  unite: string;
  duree_conservation_jours: number | null;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

const PROMPT = `Tu es un assistant qui analyse une photo de ticket de caisse français.
Identifie tous les produits alimentaires visibles et retourne un tableau JSON.

Pour chaque produit alimentaire, retourne un objet avec ces champs :
- nom : string — nom lisible (corrige les abréviations, ex: "YAO FRT 4X125" → "Yaourt aux fruits 4x125g")
- ingredient_tag : string | null — tag normalisé en minuscules sans accents (ex: "yaourt", "lait", "beurre"), null si incertain
- quantite_estimee : number — quantité estimée (défaut 1)
- unite : string — "unite", "kg", "g", "L", "mL", "lot"
- duree_conservation_jours : number | null — estimation selon le type de produit, null si inconnu

Règles :
- Ignore les articles non alimentaires (produits ménagers, hygiène, etc.)
- Ignore les lignes de prix, totaux, remises
- Retourne UNIQUEMENT le tableau JSON, sans texte autour`;

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
    // Verify JWT via Supabase Auth
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
      { global: { headers: { Authorization: authHeader } } },
    );

    const { error: authError } = await supabase.auth.getUser();
    if (authError) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body — image sent as base64
    const { imageBase64, mimeType = 'image/jpeg' } =
      await req.json() as { imageBase64?: string; mimeType?: string };

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call Gemini Flash Vision
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: PROMPT },
          ],
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('[parse-receipt] Gemini error:', err);
      return new Response(JSON.stringify({ error: 'LLM_ERROR' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const geminiData = await geminiRes.json() as GeminiResponse;
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';

    let items: ParsedItem[] = [];
    try {
      items = JSON.parse(rawText) as ParsedItem[];
    } catch {
      console.error('[parse-receipt] Failed to parse Gemini JSON:', rawText);
      return new Response(JSON.stringify({ error: 'PARSE_ERROR', raw: rawText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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
