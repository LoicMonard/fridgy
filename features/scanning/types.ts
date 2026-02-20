export interface OpenFoodFactsProduct {
  code: string;
  product: {
    product_name: string;
    brands?: string;
    categories?: string;
    image_url?: string;
  };
  status: number;
}

export interface ReceiptProduct {
  nom: string;
  ingredientTag?: string;
  quantiteEstimee?: number;
  unite?: string;
  dureeConservationJours?: number;
}
