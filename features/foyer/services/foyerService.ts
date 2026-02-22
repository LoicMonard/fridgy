import { supabase } from '@/lib/supabase';

export async function getUserFoyer(userId: string): Promise<{ id: string; nom: string } | null> {
  const { data } = await supabase
    .from('foyer_membres')
    .select('foyer_id, foyers(id, nom)')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return null;
  const foyer = data.foyers as unknown as { id: string; nom: string } | null;
  return foyer ?? null;
}

export async function createFoyer(nom: string, userId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_foyer', {
    p_nom: nom.trim(),
    p_user_id: userId,
  });

  if (error) throw error;
  return data as string;
}

export async function joinFoyer(foyerId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('join_foyer', {
    p_foyer_id: foyerId.trim(),
    p_user_id: userId,
  });

  if (error) {
    if (error.message === 'FOYER_NOT_FOUND') throw new Error('FOYER_NOT_FOUND');
    if (error.message === 'ALREADY_MEMBER') throw new Error('ALREADY_MEMBER');
    throw error;
  }
}
