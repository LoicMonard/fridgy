export type StockLocation = 'frigo' | 'congelateur' | 'placard';
export type StockUnit = 'pièce' | 'g' | 'ml' | 'cs' | 'cl' | 'kg' | 'l';

export interface StockItem {
  id: string;
  foyerId: string;
  addedBy: string;
  produitId?: string;
  nomCustom?: string;
  ingredientTag?: string;
  quantite: number;
  unite: StockUnit;
  datePeremption?: string;
  lieu: StockLocation;
  createdAt: string;
}

export interface Produit {
  id: string;
  ean?: string;
  nom: string;
  marque?: string;
  categorie?: string;
  imageUrl?: string;
  source: 'open_food_facts' | 'llm_ticket' | 'manuel';
}
