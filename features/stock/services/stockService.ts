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

    const expiryDate = item.dureeConservationJours
      ? new Date(Date.now() + item.dureeConservationJours * 86_400_000)
          .toISOString()
          .split('T')[0]
      : null;

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
