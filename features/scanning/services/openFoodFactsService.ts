import type { OFFProduct, ScannedProduct } from '../types';

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v0/product';

// Maps OFF category tags to normalized ingredient tags.
// Ordre important : du plus spécifique au plus générique — le premier match gagne.
const CATEGORY_TO_TAG: Record<string, string> = {
  // Fromages spécifiques (avant 'en:cheeses' générique)
  'en:emmentals': 'emmental',
  'en:gruyeres': 'gruyere',
  'en:parmesans': 'parmesan',
  'en:mozzarellas': 'mozzarella',

  // Produits laitiers
  'en:milks': 'lait',
  'en:yogurts': 'yaourt',
  'en:cheeses': 'fromage',
  'en:butters': 'beurre',
  'en:creams': 'creme',
  'en:coconut-milks': 'lait_de_coco',

  // Œufs
  'en:eggs': 'oeuf',

  // Viandes
  'en:chickens': 'poulet',
  'en:beef': 'boeuf',
  'en:beefs': 'boeuf',
  'en:porks': 'porc',
  'en:veal': 'veau',
  'en:lamb': 'agneau',
  'en:duck': 'canard',
  'en:turkeys': 'dinde',
  'en:bacons': 'lardons',
  'en:hams': 'jambon',
  'en:sausages': 'saucisse',

  // Poissons
  'en:salmons': 'saumon',
  'en:tunas': 'thon',
  'en:cod': 'cabillaud',
  'en:sardines': 'sardine',
  'en:shrimps': 'crevette',
  'en:mussels': 'moule',

  // Féculents
  'en:pastas': 'pates',
  'en:rices': 'riz',
  'en:semolinas': 'semoule',
  'en:flours': 'farine',
  'en:breads': 'pain',
  'en:sandwich-breads': 'pain_de_mie',

  // Légumes
  'en:tomatoes': 'tomate',
  'en:carrots': 'carotte',
  'en:courgettes': 'courgette',
  'en:aubergines': 'aubergine',
  'en:peppers': 'poivron',
  'en:onions': 'oignon',
  'en:garlics': 'ail',
  'en:shallots': 'echalote',
  'en:leeks': 'poireau',
  'en:broccolis': 'brocoli',
  'en:spinachs': 'epinard',
  'en:mushrooms': 'champignon',
  'en:potatoes': 'pomme_de_terre',
  'en:sweet-potatoes': 'patate_douce',
  'en:green-beans': 'haricot_vert',
  'en:peas': 'petits_pois',
  'en:lettuces': 'salade',
  'en:cabbages': 'chou',
  'en:cauliflowers': 'chou_fleur',
  'en:cucumbers': 'concombre',
  'en:asparaguses': 'asperge',

  // Légumineuses
  'en:lentils': 'lentille',
  'en:chickpeas': 'pois_chiche',
  'en:white-beans': 'haricot_blanc',
  'en:kidney-beans': 'haricot_rouge',

  // Condiments & huiles
  'en:olive-oils': 'huile_olive',
  'en:vegetable-oils': 'huile',
  'en:tomato-sauces': 'sauce_tomate',
  'en:mustards': 'moutarde',
  'en:vinegars': 'vinaigre',
  'en:soy-sauces': 'sauce_soja',
  'en:mayonnaises': 'mayonnaise',

  // Épices
  'en:salts': 'sel',
  'en:peppers-spice': 'poivre',

  // Sucre & épicerie
  'en:sugars': 'sucre',
  'en:honeys': 'miel',
  'en:chocolates': 'chocolat',

  // Boissons culinaires
  'en:beers': 'biere',
  'en:white-wines': 'vin_blanc',
  'en:red-wines': 'vin_rouge',
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
