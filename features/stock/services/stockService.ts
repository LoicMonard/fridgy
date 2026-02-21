import { supabase } from '@/lib/supabase';
import type { ScannedProduct, StockItemDraft } from '@/features/scanning/types';

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
