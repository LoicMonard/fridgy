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
  // Insert foyer
  const { data: foyer, error: foyerError } = await supabase
    .from('foyers')
    .insert({ nom: nom.trim(), created_by: userId })
    .select('id')
    .single();

  if (foyerError) throw foyerError;

  // Add user as admin
  const { error: membreError } = await supabase
    .from('foyer_membres')
    .insert({ foyer_id: foyer.id, user_id: userId, role: 'admin' });

  if (membreError) throw membreError;

  return foyer.id as string;
}

export async function joinFoyer(foyerId: string, userId: string): Promise<void> {
  // Check foyer exists
  const { data: foyer, error: checkError } = await supabase
    .from('foyers')
    .select('id')
    .eq('id', foyerId.trim())
    .maybeSingle();

  if (checkError) throw checkError;
  if (!foyer) throw new Error('FOYER_NOT_FOUND');

  // Add user as membre
  const { error } = await supabase
    .from('foyer_membres')
    .insert({ foyer_id: foyerId.trim(), user_id: userId, role: 'membre' });

  if (error) {
    if (error.code === '23505') throw new Error('ALREADY_MEMBER');
    throw error;
  }
}
