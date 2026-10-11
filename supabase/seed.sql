-- Données de démonstration (développement uniquement — ne pas exécuter en production)

insert into stock_items (name, category, unit, min_threshold, location) values
  ('Sandwichs',            'alimentaire', 'unité',  40, 'Frigo'),
  ('Soupe en brique',      'alimentaire', 'L',      20, 'Étagère A'),
  ('Café soluble',         'boisson',     'paquet',  5, 'Étagère A'),
  ('Bouteilles d''eau',    'boisson',     'unité',  60, 'Réserve'),
  ('Kit hygiène',          'hygiene',     'unité',  30, 'Étagère B'),
  ('Protections périodiques','hygiene',   'paquet', 15, 'Étagère B'),
  ('Chaussettes',          'vetements',   'paire',  50, 'Bac vêtements'),
  ('Bonnets',              'vetements',   'unité',  20, 'Bac vêtements'),
  ('Couvertures de survie','couchage',    'unité',  25, 'Réserve'),
  ('Duvets',               'couchage',    'unité',  10, 'Réserve'),
  ('Gobelets',             'materiel',    'unité', 100, 'Étagère C');

insert into stock_movements (item_id, delta, reason, expires_on, note)
select id, qty, 'don_recu', exp, 'Stock initial'
from (values
  ('Sandwichs', 35, current_date + 2),
  ('Soupe en brique', 48, current_date + 120),
  ('Café soluble', 12, current_date + 365),
  ('Bouteilles d''eau', 200, current_date + 300),
  ('Kit hygiène', 22, null),
  ('Protections périodiques', 30, null),
  ('Chaussettes', 140, null),
  ('Bonnets', 18, null),
  ('Couvertures de survie', 60, null),
  ('Duvets', 7, null),
  ('Gobelets', 400, null)
) as v(name, qty, exp)
join stock_items i on i.name = v.name;

insert into events (slug, title, description, type, status, starts_at, ends_at, location, meeting_point, is_public, public_capacity, volunteer_slots) values
  ('maraude-mardi', 'Maraude du mardi soir', 'Distribution de repas chauds et de kits hygiène.', 'maraude', 'published',
    date_trunc('day', now()) + interval '2 day 19 hour', date_trunc('day', now()) + interval '2 day 23 hour',
    'Centre-ville', 'Local de l''association', false, null, 8),
  ('grande-collecte-hiver', 'Grande collecte d''hiver', 'Venez déposer vêtements chauds, duvets et produits d''hygiène.', 'collecte', 'published',
    date_trunc('day', now()) + interval '9 day 10 hour', date_trunc('day', now()) + interval '9 day 17 hour',
    'Parvis de la mairie', 'Stand de l''association', true, 200, 6),
  ('soiree-decouverte', 'Soirée découverte du bénévolat', 'Rencontrez l''équipe et découvrez comment vous engager.', 'evenement_public', 'published',
    date_trunc('day', now()) + interval '14 day 19 hour', date_trunc('day', now()) + interval '14 day 21 hour',
    'Maison des associations', null, true, 40, 3);

insert into posts (slug, title, excerpt, content, status, published_at) values
  ('lancement-du-site', 'Notre nouveau site est en ligne',
   'Actualités, événements, dons : tout est maintenant au même endroit.',
   E'Nous sommes heureux de vous présenter notre nouveau site.\n\nVous pouvez désormais suivre nos actions, vous inscrire à nos événements et nous soutenir en quelques clics.',
   'published', now());
