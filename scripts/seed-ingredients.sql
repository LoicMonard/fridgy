-- Seed ingredients table with normalized French food tags
-- Run via: supabase db execute --file scripts/seed-ingredients.sql
-- Or paste directly in Supabase SQL editor

INSERT INTO ingredients (tag, categorie) VALUES
  -- Produits laitiers
  ('lait',            'Produits laitiers'),
  ('beurre',          'Produits laitiers'),
  ('creme',           'Produits laitiers'),
  ('fromage',         'Produits laitiers'),
  ('emmental',        'Produits laitiers'),
  ('gruyere',         'Produits laitiers'),
  ('parmesan',        'Produits laitiers'),
  ('mozzarella',      'Produits laitiers'),
  ('yaourt',          'Produits laitiers'),
  ('lait_de_coco',    'Produits laitiers'),

  -- Œufs
  ('oeuf',            'Œufs'),

  -- Viandes
  ('poulet',          'Viandes'),
  ('boeuf',           'Viandes'),
  ('porc',            'Viandes'),
  ('veau',            'Viandes'),
  ('agneau',          'Viandes'),
  ('lapin',           'Viandes'),
  ('canard',          'Viandes'),
  ('dinde',           'Viandes'),
  ('lardons',         'Viandes'),
  ('jambon',          'Viandes'),
  ('saucisse',        'Viandes'),

  -- Poissons & fruits de mer
  ('saumon',          'Poissons'),
  ('thon',            'Poissons'),
  ('cabillaud',       'Poissons'),
  ('sardine',         'Poissons'),
  ('crevette',        'Poissons'),
  ('moule',           'Poissons'),
  ('coquille_saint_jacques', 'Poissons'),

  -- Légumes
  ('carotte',         'Légumes'),
  ('tomate',          'Légumes'),
  ('courgette',       'Légumes'),
  ('aubergine',       'Légumes'),
  ('poivron',         'Légumes'),
  ('oignon',          'Légumes'),
  ('ail',             'Légumes'),
  ('echalote',        'Légumes'),
  ('poireau',         'Légumes'),
  ('brocoli',         'Légumes'),
  ('epinard',         'Légumes'),
  ('champignon',      'Légumes'),
  ('pomme_de_terre',  'Légumes'),
  ('patate_douce',    'Légumes'),
  ('haricot_vert',    'Légumes'),
  ('petits_pois',     'Légumes'),
  ('salade',          'Légumes'),
  ('chou',            'Légumes'),
  ('chou_fleur',      'Légumes'),
  ('celeri',          'Légumes'),
  ('concombre',       'Légumes'),
  ('radis',           'Légumes'),
  ('asperge',         'Légumes'),
  ('artichaut',       'Légumes'),
  ('betterave',       'Légumes'),
  ('navet',           'Légumes'),
  ('panais',          'Légumes'),

  -- Légumineuses
  ('lentille',        'Légumineuses'),
  ('pois_chiche',     'Légumineuses'),
  ('haricot_blanc',   'Légumineuses'),
  ('haricot_rouge',   'Légumineuses'),

  -- Féculents
  ('pates',           'Féculents'),
  ('riz',             'Féculents'),
  ('semoule',         'Féculents'),
  ('farine',          'Féculents'),
  ('pain',            'Féculents'),
  ('pain_de_mie',     'Féculents'),

  -- Fruits
  ('pomme',           'Fruits'),
  ('poire',           'Fruits'),
  ('banane',          'Fruits'),
  ('orange',          'Fruits'),
  ('citron',          'Fruits'),
  ('fraise',          'Fruits'),
  ('framboise',       'Fruits'),
  ('raisin',          'Fruits'),
  ('peche',           'Fruits'),
  ('abricot',         'Fruits'),
  ('cerise',          'Fruits'),
  ('mangue',          'Fruits'),
  ('ananas',          'Fruits'),

  -- Condiments & sauces
  ('huile_olive',     'Condiments'),
  ('huile',           'Condiments'),
  ('sauce_tomate',    'Condiments'),
  ('concentre_tomate','Condiments'),
  ('moutarde',        'Condiments'),
  ('vinaigre',        'Condiments'),
  ('sauce_soja',      'Condiments'),
  ('mayonnaise',      'Condiments'),

  -- Épices & aromates
  ('sel',             'Épices'),
  ('poivre',          'Épices'),
  ('cumin',           'Épices'),
  ('curry',           'Épices'),
  ('paprika',         'Épices'),
  ('curcuma',         'Épices'),
  ('herbes_de_provence', 'Épices'),
  ('thym',            'Épices'),
  ('laurier',         'Épices'),
  ('basilic',         'Épices'),
  ('persil',          'Épices'),
  ('coriandre',       'Épices'),
  ('romarin',         'Épices'),
  ('cannelle',        'Épices'),
  ('noix_de_muscade', 'Épices'),

  -- Produits secs & sucre
  ('sucre',           'Épicerie'),
  ('sucre_roux',      'Épicerie'),
  ('miel',            'Épicerie'),
  ('chocolat',        'Épicerie'),
  ('levure',          'Épicerie'),
  ('bouillon',        'Épicerie'),
  ('creme_de_coco',   'Épicerie'),

  -- Fruits secs & noix
  ('noix',            'Fruits secs'),
  ('amande',          'Fruits secs'),
  ('noisette',        'Fruits secs'),
  ('noix_de_cajou',   'Fruits secs'),
  ('raisin_sec',      'Fruits secs'),
  ('olive',           'Fruits secs'),

  -- Boissons culinaires
  ('vin_blanc',       'Boissons'),
  ('vin_rouge',       'Boissons'),
  ('biere',           'Boissons')

ON CONFLICT (tag) DO NOTHING;
