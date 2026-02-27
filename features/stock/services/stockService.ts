import { supabase } from '@/lib/supabase';
import type { ReceiptItemDraft, ScannedProduct, StockItemDraft } from '@/features/scanning/types';

async function resolveIngredientTag(nom: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const { data, error } = await supabase.functions.invoke('tag-ingredient', {
      body: { nom },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error || !data?.tag) return null;
    return data.tag as string;
  } catch {
    return null;
  }
}

async function resolveAndUpdateTag(stockItemId: string, nom: string): Promise<void> {
  const tag = await resolveIngredientTag(nom);
  if (!tag) return;
  await supabase.from('stock_items').update({ ingredient_tag: tag }).eq('id', stockItemId);
}

async function upsertProduit(scannedProduct: ScannedProduct): Promise<string> {
  const { ean, nom, marque, categorie, imageUrl } = scannedProduct;

  // Try to find existing produit by EAN
  if (ean) {
    const { data: existing } = await supabase
      .from('produits')
      .select('id')
      .eq('ean', ean)
      .maybeSingle();

    if (existing) return existing.id as string;
  }

  // Insert new produit
  const { data, error } = await supabase
    .from('produits')
    .insert({
      ean: ean || null,
      nom,
      marque: marque || null,
      categorie: categorie || null,
      image_url: imageUrl || null,
      source: ean ? 'open_food_facts' : 'manuel',
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function addToStock(
  draft: StockItemDraft,
  foyerId: string,
  addedBy: string,
): Promise<void> {
  const produitId = await upsertProduit(draft.scannedProduct);

  const knownTag = draft.scannedProduct.ingredientTag || null;

  const { data: inserted, error } = await supabase.from('stock_items').insert({
    foyer_id: foyerId,
    added_by: addedBy,
    produit_id: produitId,
    ingredient_tag: knownTag,
    quantite: draft.quantite,
    unite: draft.unite,
    date_peremption: draft.datePeremption || null,
    lieu: draft.lieu,
  }).select('id').single();

  if (error) throw error;

  // Fire-and-forget : résoudre le tag en arrière-plan si non connu
  if (!knownTag && inserted?.id) {
    resolveAndUpdateTag(inserted.id as string, draft.scannedProduct.nom);
  }
}

export async function cookRecipe(
  recipeIngredients: { ingredient_tag: string; quantite_totale: number; unite: string }[],
  foyerId: string,
): Promise<void> {
  for (const ri of recipeIngredients) {
    const { data: stockItems } = await supabase
      .from('stock_items')
      .select('id, quantite, unite')
      .eq('foyer_id', foyerId)
      .eq('ingredient_tag', ri.ingredient_tag)
      .order('date_peremption', { ascending: true, nullsFirst: false });

    if (!stockItems || stockItems.length === 0) continue;

    let remaining = ri.quantite_totale;
    for (const item of stockItems) {
      if (remaining <= 0) break;
      const qty = Number(item.quantite);
      const sameUnit = (item.unite as string) === ri.unite;

      if (sameUnit && qty > remaining) {
        await supabase
          .from('stock_items')
          .update({ quantite: qty - remaining })
          .eq('id', item.id as string);
        remaining = 0;
      } else {
        await supabase.from('stock_items').delete().eq('id', item.id as string);
        remaining = sameUnit ? remaining - qty : 0;
      }
    }
  }
}

export async function addReceiptItemsToStock(
  items: ReceiptItemDraft[],
  foyerId: string,
  addedBy: string,
): Promise<void> {
  for (const item of items) {
    const { data: produit, error: produitError } = await supabase
      .from('produits')
      .insert({ nom: item.nom, source: 'llm_ticket' })
      .select('id')
      .single();

    if (produitError) throw produitError;

    const expiryDate = item.datePeremption
      ?? (item.dureeConservationJours
        ? new Date(Date.now() + item.dureeConservationJours * 86_400_000)
            .toISOString()
            .split('T')[0]
        : null);

    const knownTag = item.ingredientTag ?? null;

    const { data: insertedItem, error: stockError } = await supabase.from('stock_items').insert({
      foyer_id: foyerId,
      added_by: addedBy,
      produit_id: produit.id,
      ingredient_tag: knownTag,
      quantite: item.quantite,
      unite: item.unite,
      date_peremption: expiryDate,
      lieu: item.lieu,
    }).select('id').single();

    if (stockError) throw stockError;

    // Fire-and-forget : résoudre le tag en arrière-plan si non connu
    if (!knownTag && insertedItem?.id) {
      resolveAndUpdateTag(insertedItem.id as string, item.nom);
    }
  }
}
