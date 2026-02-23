import { supabase } from '@/lib/supabase';
import type { ReceiptItemDraft, ScannedProduct, StockItemDraft } from '@/features/scanning/types';

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

  const { error } = await supabase.from('stock_items').insert({
    foyer_id: foyerId,
    added_by: addedBy,
    produit_id: produitId,
    ingredient_tag: draft.scannedProduct.ingredientTag || null,
    quantite: draft.quantite,
    unite: draft.unite,
    date_peremption: draft.datePeremption || null,
    lieu: draft.lieu,
  });

  if (error) throw error;
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

    const { error: stockError } = await supabase.from('stock_items').insert({
      foyer_id: foyerId,
      added_by: addedBy,
      produit_id: produit.id,
      ingredient_tag: item.ingredientTag ?? null,
      quantite: item.quantite,
      unite: item.unite,
      date_peremption: expiryDate,
      lieu: item.lieu,
    });

    if (stockError) throw stockError;
  }
}
