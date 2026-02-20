import type { OFFProduct, ScannedProduct } from '../types';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v0/product';

// Maps OFF category tags to normalized ingredient tags
const CATEGORY_TO_TAG: Record<string, string> = {
  'en:milks': 'lait',
  'en:yogurts': 'yaourt',
  'en:cheeses': 'fromage',
  'en:butters': 'beurre',
  'en:eggs': 'oeuf',
  'en:breads': 'pain',
  'en:pastas': 'pates',
  'en:rices': 'riz',
  'en:flours': 'farine',
  'en:sugars': 'sucre',
  'en:salts': 'sel',
  'en:olive-oils': 'huile-olive',
  'en:vegetable-oils': 'huile',
  'en:tomatoes': 'tomate',
  'en:carrots': 'carotte',
  'en:onions': 'oignon',
  'en:potatoes': 'pomme-de-terre',
  'en:chickens': 'poulet',
  'en:beefs': 'boeuf',
  'en:porks': 'porc',
  'en:salmons': 'saumon',
  'en:tunas': 'thon',
  'en:chocolates': 'chocolat',
  'en:coffees': 'cafe',
  'en:teas': 'the',
  'en:juices': 'jus',
  'en:waters': 'eau',
  'en:beers': 'biere',
  'en:wines': 'vin',
};

function extractIngredientTag(categoriesTags?: string[]): string | undefined {
  if (!categoriesTags) return undefined;
  for (const tag of categoriesTags) {
    if (CATEGORY_TO_TAG[tag]) return CATEGORY_TO_TAG[tag];
  }
  return undefined;
}

function extractNom(product: OFFProduct['product']): string {
  return (
    product.product_name_fr ||
    product.product_name ||
    'Produit inconnu'
  ).trim();
}

export async function fetchProductByEan(ean: string): Promise<ScannedProduct | null> {
  const response = await fetch(`${OFF_API_BASE}/${ean}.json`);

  if (!response.ok) {
    throw new Error(`OFF API error: ${response.status}`);
  }

  const data: OFFProduct = await response.json();

  if (data.status === 0) {
    return null; // Product not found in OFF
  }

  const { product } = data;

  return {
    ean,
    nom: extractNom(product),
    marque: product.brands?.split(',')[0].trim(),
    categorie: product.categories?.split(',')[0].trim(),
    ingredientTag: extractIngredientTag(product.categories_tags),
    imageUrl: product.image_front_url || product.image_url,
  };
}
