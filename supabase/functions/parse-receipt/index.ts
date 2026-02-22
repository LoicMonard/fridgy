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

const SYSTEM_PROMPT = `Tu es un assistant qui analyse le texte brut extrait par OCR d'un ticket de caisse français.
Tu dois identifier les produits alimentaires et retourner un tableau JSON.

Pour chaque produit alimentaire identifié, retourne un objet avec ces champs :
- nom : string — nom lisible du produit (corrige les abréviations OCR, ex: "YAO FRT 4X125" → "Yaourt aux fruits 4x125g")
- ingredient_tag : string | null — tag normalisé en minuscules sans accents (ex: "yaourt", "lait", "beurre"), null si incertain
- quantite_estimee : number — quantité estimée (défaut 1)
- unite : string — "unite", "kg", "g", "L", "mL", "lot"
- duree_conservation_jours : number | null — estimation de durée de conservation en jours selon le type de produit, null si inconnu

Règles :
- Ignore les articles non alimentaires (produits ménagers, hygiène, etc.)
- Ignore les lignes de prix, totaux, remises
- Retourne UNIQUEMENT le tableau JSON, sans texte autour`;

Deno.serve(async (req) => {
  // CORS preflight
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

    // Parse request body
    const { ocrText } = await req.json() as { ocrText?: string };
    if (!ocrText?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing ocrText' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Call Gemini Flash
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) throw new Error('GEMINI_API_KEY not configured');

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: ocrText }] }],
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
