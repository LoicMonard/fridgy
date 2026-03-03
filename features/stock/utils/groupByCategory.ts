import { StockItemDisplay } from '@/features/stock/hooks/useStock';

// Mapping tag → catégorie d'affichage
// Sera enrichi au fil des 213 tags — fallback sur "Autres"
const TAG_CATEGORY_MAP: Record<string, string> = {
  // Légumes
  tomate: 'Légumes', tomate_cerise: 'Légumes', carotte: 'Légumes',
  courgette: 'Légumes', aubergine: 'Légumes', poivron: 'Légumes',
  oignon: 'Légumes', oignon_rouge: 'Légumes', ail: 'Légumes',
  poireau: 'Légumes', brocoli: 'Légumes', chou: 'Légumes',
  chou_fleur: 'Légumes', epinard: 'Légumes', salade: 'Légumes',
  concombre: 'Légumes', celeri: 'Légumes', navet: 'Légumes',
  radis: 'Légumes', mais: 'Légumes', petit_pois: 'Légumes',
  haricot_vert: 'Légumes', asperge: 'Légumes', artichaut: 'Légumes',
  fenouil: 'Légumes', betterave: 'Légumes', patate_douce: 'Légumes',
  pomme_de_terre: 'Légumes', champignon: 'Légumes',

  // Fruits
  pomme: 'Fruits', poire: 'Fruits', banane: 'Fruits', orange: 'Fruits',
  citron: 'Fruits', citron_vert: 'Fruits', fraise: 'Fruits',
  framboise: 'Fruits', myrtille: 'Fruits', raisin: 'Fruits',
  melon: 'Fruits', pasteque: 'Fruits', peche: 'Fruits',
  abricot: 'Fruits', prune: 'Fruits', mangue: 'Fruits',
  ananas: 'Fruits', kiwi: 'Fruits', avocat: 'Fruits',

  // Viandes & poissons
  poulet: 'Produits frais', blanc_poulet: 'Produits frais',
  cuisse_poulet: 'Produits frais', boeuf: 'Produits frais',
  steak_hache: 'Produits frais', porc: 'Produits frais',
  lardons: 'Produits frais', jambon: 'Produits frais',
  bacon: 'Produits frais', saumon: 'Produits frais',
  thon: 'Produits frais', crevette: 'Produits frais',
  sardine: 'Produits frais', cabillaud: 'Produits frais',
  agneau: 'Produits frais', dinde: 'Produits frais',
  canard: 'Produits frais',

  // Produits laitiers
  lait: 'Produits laitiers', beurre: 'Produits laitiers',
  creme: 'Produits laitiers', yaourt: 'Produits laitiers',
  fromage: 'Produits laitiers', emmental: 'Produits laitiers',
  gruyere: 'Produits laitiers', camembert: 'Produits laitiers',
  brie: 'Produits laitiers', parmesan: 'Produits laitiers',
  mozzarella: 'Produits laitiers', feta: 'Produits laitiers',
  oeuf: 'Produits laitiers',

  // Épicerie sèche
  farine: 'Produits secs', sucre: 'Produits secs',
  sel: 'Produits secs', poivre: 'Produits secs',
  huile: 'Produits secs', vinaigre: 'Produits secs',
  pates: 'Produits secs', riz: 'Produits secs',
  lentille: 'Produits secs', haricot: 'Produits secs',
  pois_chiche: 'Produits secs', quinoa: 'Produits secs',
  couscous: 'Produits secs', semoule: 'Produits secs',
  pain: 'Produits secs', biscuit: 'Produits secs',
  chocolat: 'Produits secs', cafe: 'Produits secs',
  the: 'Produits secs', miel: 'Produits secs',
  confiture: 'Produits secs', sauce_tomate: 'Produits secs',
  moutarde: 'Produits secs', mayonnaise: 'Produits secs',
};

export interface StockSection {
  title: string;
  data: StockItemDisplay[];
}

const CATEGORY_ORDER = [
  'Légumes', 'Fruits', 'Produits frais', 'Produits laitiers', 'Produits secs', 'Autres',
];

export function groupByCategory(
  items: StockItemDisplay[],
  searchQuery: string = '',
): StockSection[] {
  const query = searchQuery.toLowerCase().trim();
  const filtered = query
    ? items.filter((item) => item.nom.toLowerCase().includes(query))
    : items;

  const map: Record<string, StockItemDisplay[]> = {};

  for (const item of filtered) {
    const category = item.ingredientTag
      ? (TAG_CATEGORY_MAP[item.ingredientTag] ?? 'Autres')
      : 'Autres';

    if (!map[category]) map[category] = [];
    map[category].push(item);
  }

  return CATEGORY_ORDER
    .filter((cat) => map[cat]?.length > 0)
    .map((cat) => ({ title: cat, data: map[cat] }));
}
