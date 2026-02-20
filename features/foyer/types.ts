export type FoyerRole = 'admin' | 'membre';

export interface FoyerMember {
  foyerId: string;
  userId: string;
  role: FoyerRole;
}
