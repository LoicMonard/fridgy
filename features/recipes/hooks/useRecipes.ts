import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface ScoredRecipe {
  id: string;
  titre: string;
  score: number; // 0–1
  matchedCount: number;
  totalCount: number;
  missingTags: string[];
  tempsPrepMin: number | null;
  tempsCuissonMin: number | null;
  portionsBase: number;
  preferences: string[];
}

export interface FavoriteRecipe {
  id: string;
  titre: string;
  tempsPrepMin: number | null;
  tempsCuissonMin: number | null;
  portionsBase: number;
}

export function useRecipes() {
  const [suggestions, setSuggestions] = useState<ScoredRecipe[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
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

      const foyerId = membre.foyer_id as string;

      const [rpcRes, favRes] = await Promise.all([
        supabase.rpc('get_scored_recipes', { p_foyer_id: foyerId, p_limit: 20 }),
        supabase
          .from('foyer_recettes_favorites')
          .select('recettes(id, titre, temps_prep_min, temps_cuisson_min, portions_base)')
          .eq('foyer_id', foyerId),
      ]);

      if (rpcRes.data) {
        setSuggestions(
          (rpcRes.data as any[]).map((r) => ({
            id: r.id as string,
            titre: r.titre as string,
            score: Number(r.score),
            matchedCount: Number(r.matched_count),
            totalCount: Number(r.total_count),
            missingTags: (r.missing_tags as string[]) ?? [],
            tempsPrepMin: r.temps_prep_min as number | null,
            tempsCuissonMin: r.temps_cuisson_min as number | null,
            portionsBase: r.portions_base as number,
            preferences: (r.preferences as string[]) ?? [],
          })),
        );
      }

      if (favRes.data) {
        setFavorites(
          (favRes.data as any[])
            .map((row) => row.recettes)
            .filter(Boolean)
            .map((r: any) => ({
              id: r.id as string,
              titre: r.titre as string,
              tempsPrepMin: r.temps_prep_min as number | null,
              tempsCuissonMin: r.temps_cuisson_min as number | null,
              portionsBase: r.portions_base as number,
            })),
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return {
    suggestions,
    favorites,
    loading,
    refreshing,
    refetch: () => load(true),
  };
}
