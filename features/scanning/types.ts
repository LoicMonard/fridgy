export interface OFFProduct {
  code: string;
  status: number; // 1 = found, 0 = not found
  product: {
    product_name: string;
    product_name_fr?: string;
    brands?: string;
    categories?: string;
    categories_tags?: string[];
    image_url?: string;
    image_front_url?: string;
  };
}

export interface ScannedProduct {
  ean: string;
  nom: string;
  marque?: string;
  categorie?: string;
  ingredientTag?: string;
  imageUrl?: string;
}

export interface ReceiptProduct {
  nom: string;
  ingredientTag?: string;
  quantiteEstimee?: number;
  unite?: string;
  dureeConservationJours?: number;
}

export type Lieu = 'frigo' | 'congelateur' | 'placard';
export type Unite = 'pièce' | 'g' | 'kg' | 'ml' | 'L' | 'boîte' | 'sachet';

export interface ReceiptItemDraft {
  nom: string;
  ingredientTag?: string;
  quantite: number;
  unite: string;
  dureeConservationJours?: number;
  lieu: Lieu;
}

export interface StockItemDraft {
  scannedProduct: ScannedProduct;
  quantite: number;
  unite: Unite;
  datePeremption: string | null; // ISO date YYYY-MM-DD
  lieu: Lieu;
}
