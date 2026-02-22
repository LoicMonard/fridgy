import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserFoyer } from '@/features/foyer/services/foyerService';

export interface FoyerInfo {
  id: string;
  nom: string;
}

export function useFoyer(userId: string | undefined) {
  const [foyer, setFoyer] = useState<FoyerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setFoyer(null);
      setLoading(false);
      return;
    }

    getUserFoyer(userId)
      .then(setFoyer)
      .finally(() => setLoading(false));
  }, [userId]);

  return { foyer, loading, hasFoyer: !!foyer };
}
