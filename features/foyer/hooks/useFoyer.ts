import { useEffect, useState } from 'react';
import { getUserFoyer } from '@/features/foyer/services/foyerService';

export interface FoyerInfo {
  id: string;
  nom: string;
}

export function useFoyer(userId: string | undefined) {
  const [foyer, setFoyer] = useState<FoyerInfo | null>(null);
  // tracks which userId the current foyer state was fetched for
  const [fetchedFor, setFetchedFor] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!userId) {
      setFoyer(null);
      setFetchedFor(undefined);
      return;
    }

    getUserFoyer(userId)
      .then((result) => {
        setFoyer(result);
        setFetchedFor(userId);
      })
      .catch(() => {
        setFoyer(null);
        setFetchedFor(userId);
      });
  }, [userId]);

  // loading is true whenever userId is set but we haven't finished fetching for it yet.
  // this is computed at render time so _layout.tsx sees loading=true immediately when
  // userId transitions from undefined to a real value, avoiding the race condition where
  // hasFoyer=false triggers createFoyer before the initial fetch completes.
  const loading = userId ? fetchedFor !== userId : false;

  return { foyer, loading, hasFoyer: !!foyer };
}
