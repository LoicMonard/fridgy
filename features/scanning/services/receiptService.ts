import { supabase } from '@/lib/supabase';
import type { ReceiptProduct } from '../types';

interface EdgeFunctionItem {
  nom: string;
  ingredient_tag: string | null;
  quantite_estimee: number;
  unite: string;
  duree_conservation_jours: number | null;
}

export async function parseReceiptImage(
  imageBase64: string,
  mimeType = 'image/jpeg',
): Promise<ReceiptProduct[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('parse-receipt', {
    body: { imageBase64, mimeType },
    headers: {
      Authorization: `Bearer ${session?.access_token}`,
    },
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
