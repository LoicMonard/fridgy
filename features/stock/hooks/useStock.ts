import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface StockItemDisplay {
  id: string;
  nom: string;
  quantite: number;
  unite: string;
  datePeremption: string | null; // ISO YYYY-MM-DD
  lieu: 'frigo' | 'congelateur' | 'placard';
  ingredientTag: string | null;
}

export function useStock() {
  const [items, setItems] = useState<StockItemDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStock = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: membre } = await supabase
        .from('foyer_membres')
        .select('foyer_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!membre?.foyer_id) return;

      const { data, error } = await supabase
        .from('stock_items')
        .select('id, quantite, unite, date_peremption, lieu, ingredient_tag, nom_custom, produits(nom)')
        .eq('foyer_id', membre.foyer_id)
        .order('date_peremption', { ascending: true, nullsFirst: false });

      if (error) throw error;

      setItems(
        (data ?? []).map((row) => {
          const produit = row.produits as unknown as { nom: string } | null;
          return {
            id: row.id as string,
            nom: (row.nom_custom as string | null) ?? produit?.nom ?? '—',
            quantite: Number(row.quantite),
            unite: row.unite as string,
            datePeremption: row.date_peremption as string | null,
            lieu: row.lieu as 'frigo' | 'congelateur' | 'placard',
            ingredientTag: row.ingredient_tag as string | null,
          };
        }),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  async function deleteItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await supabase.from('stock_items').delete().eq('id', id);
  }

  return {
    items,
    loading,
    refreshing,
    refetch: () => loadStock(true),
    deleteItem,
  };
}
