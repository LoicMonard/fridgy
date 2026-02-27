-- Seed ingredients table with normalized French food tags
-- Run via Supabase SQL editor
-- Tags : minuscules, sans accents, underscores

INSERT INTO ingredients (tag, categorie) VALUES

  -- ────────────────────────────────────────────
  -- Produits laitiers
  -- ────────────────────────────────────────────
  ('lait',              'Produits laitiers'),
  ('beurre',            'Produits laitiers'),
  ('creme',             'Produits laitiers'),
  ('fromage',           'Produits laitiers'),
  ('emmental',          'Produits laitiers'),
  ('gruyere',           'Produits laitiers'),
  ('parmesan',          'Produits laitiers'),
  ('mozzarella',        'Produits laitiers'),
  ('camembert',         'Produits laitiers'),
  ('brie',              'Produits laitiers'),
  ('roquefort',         'Produits laitiers'),
  ('chevre',            'Produits laitiers'),
  ('comte',             'Produits laitiers'),
  ('raclette',          'Produits laitiers'),
  ('cheddar',           'Produits laitiers'),
  ('ricotta',           'Produits laitiers'),
  ('mascarpone',        'Produits laitiers'),
  ('fromage_blanc',     'Produits laitiers'),
  ('yaourt',            'Produits laitiers'),
  ('lait_de_coco',      'Produits laitiers'),
  ('lait_d_amande',     'Produits laitiers'),
  ('lait_de_soja',      'Produits laitiers'),

  -- ────────────────────────────────────────────
  -- Œufs
  -- ────────────────────────────────────────────
  ('oeuf',              'Œufs'),

  -- ────────────────────────────────────────────
  -- Viandes
  -- ────────────────────────────────────────────
  ('poulet',            'Viandes'),
  ('boeuf',             'Viandes'),
  ('porc',              'Viandes'),
  ('veau',              'Viandes'),
  ('agneau',            'Viandes'),
  ('lapin',             'Viandes'),
  ('canard',            'Viandes'),
  ('dinde',             'Viandes'),
  ('lardons',           'Viandes'),
  ('jambon',            'Viandes'),
  ('jambon_cru',        'Viandes'),
  ('saucisse',          'Viandes'),
  ('chorizo',           'Viandes'),
  ('saucisson',         'Viandes'),
  ('merguez',           'Viandes'),
  ('boudin_noir',       'Viandes'),
  ('rillettes',         'Viandes'),
  ('mortadelle',        'Viandes'),
  ('andouille',         'Viandes'),
  ('foie',              'Viandes'),

  -- ────────────────────────────────────────────
  -- Poissons & fruits de mer
  -- ────────────────────────────────────────────
  ('saumon',                  'Poissons'),
  ('thon',                    'Poissons'),
  ('cabillaud',               'Poissons'),
  ('sardine',                 'Poissons'),
  ('maquereau',               'Poissons'),
  ('lieu_noir',               'Poissons'),
  ('daurade',                 'Poissons'),
  ('bar',                     'Poissons'),
  ('truite',                  'Poissons'),
  ('sole',                    'Poissons'),
  ('hareng',                  'Poissons'),
  ('crevette',                'Poissons'),
  ('moule',                   'Poissons'),
  ('coquille_saint_jacques',  'Poissons'),
  ('seiche',                  'Poissons'),
  ('calmar',                  'Poissons'),
  ('homard',                  'Poissons'),
  ('langoustine',             'Poissons'),
  ('huitre',                  'Poissons'),

  -- ────────────────────────────────────────────
  -- Légumes
  -- ────────────────────────────────────────────
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
  ('mache',           'Légumes'),
  ('roquette',        'Légumes'),
  ('chou',            'Légumes'),
  ('chou_fleur',      'Légumes'),
  ('chou_rouge',      'Légumes'),
  ('celeri',          'Légumes'),
  ('celeri_rave',     'Légumes'),
  ('concombre',       'Légumes'),
  ('radis',           'Légumes'),
  ('asperge',         'Légumes'),
  ('artichaut',       'Légumes'),
  ('betterave',       'Légumes'),
  ('navet',           'Légumes'),
  ('panais',          'Légumes'),
  ('fenouil',         'Légumes'),
  ('endive',          'Légumes'),
  ('mais',            'Légumes'),
  ('potiron',         'Légumes'),
  ('butternut',       'Légumes'),
  ('feve',            'Légumes'),

  -- ────────────────────────────────────────────
  -- Légumineuses
  -- ────────────────────────────────────────────
  ('lentille',        'Légumineuses'),
  ('pois_chiche',     'Légumineuses'),
  ('haricot_blanc',   'Légumineuses'),
  ('haricot_rouge',   'Légumineuses'),
  ('flageolet',       'Légumineuses'),
  ('pois_casses',     'Légumineuses'),

  -- ────────────────────────────────────────────
  -- Féculents & grains
  -- ────────────────────────────────────────────
  ('pates',           'Féculents'),
  ('riz',             'Féculents'),
  ('gnocchi',         'Féculents'),
  ('semoule',         'Féculents'),
  ('polenta',         'Féculents'),
  ('quinoa',          'Féculents'),
  ('boulgour',        'Féculents'),
  ('orge',            'Féculents'),
  ('epeautre',        'Féculents'),
  ('farine',          'Féculents'),
  ('fecule_de_mais',  'Féculents'),
  ('chapelure',       'Féculents'),
  ('pain',            'Féculents'),
  ('pain_de_mie',     'Féculents'),

  -- ────────────────────────────────────────────
  -- Fruits
  -- ────────────────────────────────────────────
  ('pomme',           'Fruits'),
  ('poire',           'Fruits'),
  ('banane',          'Fruits'),
  ('orange',          'Fruits'),
  ('citron',          'Fruits'),
  ('citron_vert',     'Fruits'),
  ('pamplemousse',    'Fruits'),
  ('fraise',          'Fruits'),
  ('framboise',       'Fruits'),
  ('myrtille',        'Fruits'),
  ('cassis',          'Fruits'),
  ('cerise',          'Fruits'),
  ('raisin',          'Fruits'),
  ('peche',           'Fruits'),
  ('abricot',         'Fruits'),
  ('prune',           'Fruits'),
  ('figue',           'Fruits'),
  ('mangue',          'Fruits'),
  ('ananas',          'Fruits'),
  ('kiwi',            'Fruits'),
  ('melon',           'Fruits'),
  ('pasteque',        'Fruits'),
  ('grenade',         'Fruits'),

  -- ────────────────────────────────────────────
  -- Condiments & sauces
  -- ────────────────────────────────────────────
  ('huile_olive',           'Condiments'),
  ('huile',                 'Condiments'),
  ('sauce_tomate',          'Condiments'),
  ('concentre_tomate',      'Condiments'),
  ('moutarde',              'Condiments'),
  ('vinaigre',              'Condiments'),
  ('vinaigre_balsamique',   'Condiments'),
  ('sauce_soja',            'Condiments'),
  ('mayonnaise',            'Condiments'),
  ('ketchup',               'Condiments'),
  ('pesto',                 'Condiments'),
  ('tapenade',              'Condiments'),
  ('harissa',               'Condiments'),
  ('sauce_worcestershire',  'Condiments'),

  -- ────────────────────────────────────────────
  -- Épices & aromates
  -- ────────────────────────────────────────────
  ('sel',                 'Épices'),
  ('poivre',              'Épices'),
  ('cumin',               'Épices'),
  ('curry',               'Épices'),
  ('paprika',             'Épices'),
  ('curcuma',             'Épices'),
  ('gingembre',           'Épices'),
  ('piment',              'Épices'),
  ('piment_d_espelette',  'Épices'),
  ('ras_el_hanout',       'Épices'),
  ('safran',              'Épices'),
  ('anis_etoile',         'Épices'),
  ('cardamome',           'Épices'),
  ('clou_de_girofle',     'Épices'),
  ('cannelle',            'Épices'),
  ('noix_de_muscade',     'Épices'),
  ('herbes_de_provence',  'Épices'),
  ('thym',                'Épices'),
  ('laurier',             'Épices'),
  ('romarin',             'Épices'),
  ('basilic',             'Épices'),
  ('persil',              'Épices'),
  ('coriandre',           'Épices'),
  ('estragon',            'Épices'),
  ('aneth',               'Épices'),
  ('menthe',              'Épices'),
  ('origan',              'Épices'),
  ('ciboulette',          'Épices'),

  -- ────────────────────────────────────────────
  -- Épicerie sèche & sucre
  -- ────────────────────────────────────────────
  ('sucre',             'Épicerie'),
  ('sucre_roux',        'Épicerie'),
  ('miel',              'Épicerie'),
  ('chocolat',          'Épicerie'),
  ('levure',            'Épicerie'),
  ('levure_chimique',   'Épicerie'),
  ('bicarbonate',       'Épicerie'),
  ('bouillon',          'Épicerie'),
  ('poudre_d_amande',   'Épicerie'),
  ('creme_de_coco',     'Épicerie'),
  ('tofu',              'Épicerie'),
  ('tempeh',            'Épicerie'),

  -- ────────────────────────────────────────────
  -- Fruits secs & oléagineux
  -- ────────────────────────────────────────────
  ('noix',              'Fruits secs'),
  ('amande',            'Fruits secs'),
  ('noisette',          'Fruits secs'),
  ('noix_de_cajou',     'Fruits secs'),
  ('pistache',          'Fruits secs'),
  ('noix_de_pecan',     'Fruits secs'),
  ('pignon_de_pin',     'Fruits secs'),
  ('raisin_sec',        'Fruits secs'),
  ('abricot_sec',       'Fruits secs'),
  ('datte',             'Fruits secs'),
  ('olive',             'Fruits secs'),
  ('noix_de_coco',      'Fruits secs'),

  -- ────────────────────────────────────────────
  -- Boissons culinaires
  -- ────────────────────────────────────────────
  ('vin_blanc',   'Boissons'),
  ('vin_rouge',   'Boissons'),
  ('biere',       'Boissons'),
  ('cidre',       'Boissons'),
  ('cognac',      'Boissons')

ON CONFLICT (tag) DO NOTHING;
