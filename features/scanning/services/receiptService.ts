import { supabase } from '@/lib/supabase';
import type { ReceiptProduct } from '../types';

interface EdgeFunctionItem {
  nom: string;
  ingredient_tag: string | null;
  quantite_estimee: number;
  unite: string;
  duree_conservation_jours: number | null;
}

export async function parseReceiptOcr(ocrText: string): Promise<ReceiptProduct[]> {
  const { data, error } = await supabase.functions.invoke('parse-receipt', {
    body: { ocrText },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  return (data.items as EdgeFunctionItem[]).map((item) => ({
    nom: item.nom,
    ingredientTag: item.ingredient_tag ?? undefined,
    quantiteEstimee: item.quantite_estimee ?? 1,
    unite: item.unite ?? 'unite',
    dureeConservationJours: item.duree_conservation_jours ?? undefined,
  }));
}
