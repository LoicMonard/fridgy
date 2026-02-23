import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ExpiringItem {
  id: string;
  nom: string;
  lieu: 'frigo' | 'congelateur' | 'placard';
  datePeremption: string; // ISO YYYY-MM-DD
  daysLeft: number;
}

export interface RecentItem {
  id: string;
  nom: string;
  quantite: number;
  unite: string;
  lieu: 'frigo' | 'congelateur' | 'placard';
}

export interface HomeData {
  expiring: ExpiringItem[];
  recent: RecentItem[];
}

function computeDaysLeft(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(isoDate);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86_400_000);
}

export function useHomeData() {
  const [data, setData] = useState<HomeData>({ expiring: [], recent: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: membre } = await supabase
        .from('foyer_membres')
        .select('foyer_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!membre?.foyer_id) return;

      const foyerId = membre.foyer_id as string;

      // Compute threshold: today + 3 days
      const threshold = new Date();
      threshold.setDate(threshold.getDate() + 3);
      const thresholdISO = threshold.toISOString().split('T')[0];

      const [expiringRes, recentRes] = await Promise.all([
        supabase
          .from('stock_items')
          .select('id, date_peremption, lieu, nom_custom, produits(nom)')
          .eq('foyer_id', foyerId)
          .not('date_peremption', 'is', null)
          .lte('date_peremption', thresholdISO)
          .order('date_peremption', { ascending: true }),
        supabase
          .from('stock_items')
          .select('id, quantite, unite, lieu, nom_custom, produits(nom)')
          .eq('foyer_id', foyerId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const mapNom = (row: { nom_custom: unknown; produits: unknown }) => {
        const produit = row.produits as { nom: string } | null;
        return (row.nom_custom as string | null) ?? produit?.nom ?? '—';
      };

      setData({
        expiring: (expiringRes.data ?? []).map((row) => ({
          id: row.id as string,
          nom: mapNom(row as any),
          lieu: row.lieu as 'frigo' | 'congelateur' | 'placard',
          datePeremption: row.date_peremption as string,
          daysLeft: computeDaysLeft(row.date_peremption as string),
        })),
        recent: (recentRes.data ?? []).map((row) => ({
          id: row.id as string,
          nom: mapNom(row as any),
          quantite: Number(row.quantite),
          unite: row.unite as string,
          lieu: row.lieu as 'frigo' | 'congelateur' | 'placard',
        })),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, refetch: load };
}
