-- =====================================================================
-- Données fictives de démonstration — petite association (~30 bénévoles)
--   3 admins + 10 bénévoles · 1 événement par semaine (maraudes en alternance
--   avec des ateliers « paniers repas ») · stocks cohérents · actus · dons
-- À exécuter APRÈS la migration init. Dates relatives à aujourd'hui.
-- Pour tout retirer avant le lancement : voir la fin du fichier.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Personnes : comptes d'authentification + profils
--    Seuls admin@demo.test et benevole@demo.test ont un mot de passe.
--    Remplacer <MOT_DE_PASSE_ADMIN_TEST> et <MOT_DE_PASSE_BENEVOLE_TEST> avant exécution
--    (jamais de vrais mots de passe dans ce fichier : il est versionné).
-- ---------------------------------------------------------------------
create temp table _people on commit drop as
select * from (values
  ('Camille Roussel',  'admin@demo.test',              'admin',     '06 39 98 00 01', '{permis_b,premiers_secours}', 'Mardi soir, week-end',      190, '<MOT_DE_PASSE_ADMIN_TEST>'),
  ('Hélène Marchand',  'helene.marchand@exemple.test', 'admin',     '06 39 98 00 02', '{cuisine,social}',            'Mercredi soir, samedi',     200, null),
  ('Julien Faure',     'julien.faure@exemple.test',    'admin',     '06 39 98 00 03', '{permis_b,sante}',            'Mardi soir, dimanche',      210, null),
  ('Alex Garnier',     'benevole@demo.test',           'volunteer', '06 39 98 00 11', '{cuisine}',                   'Mardi soir',                120, '<MOT_DE_PASSE_BENEVOLE_TEST>'),
  ('Sophie Lemaire',   'sophie.lemaire@exemple.test',  'volunteer', '06 39 98 00 12', '{cuisine,langues}',           'Samedi après-midi',         150, null),
  ('Karim Haddad',     'karim.haddad@exemple.test',    'volunteer', '06 39 98 00 13', '{permis_b,langues}',          'Mardi soir, vendredi soir', 140, null),
  ('Inès Moreau',      'ines.moreau@exemple.test',     'volunteer', '06 39 98 00 14', '{premiers_secours,social}',   'Mardi soir',                100, null),
  ('Thomas Girard',    'thomas.girard@exemple.test',   'volunteer', '06 39 98 00 15', '{permis_b}',                  'Flexible',                  90,  null),
  ('Léa Fontaine',     'lea.fontaine@exemple.test',    'volunteer', '06 39 98 00 16', '{cuisine}',                   'Samedi après-midi',         75,  null),
  ('Mamadou Diallo',   'mamadou.diallo@exemple.test',  'volunteer', '06 39 98 00 17', '{langues,permis_b}',          'Mardi soir, week-end',      60,  null),
  ('Clara Dubois',     'clara.dubois@exemple.test',    'volunteer', '06 39 98 00 18', '{sante}',                     'Mardi soir',                45,  null),
  ('Paul Mercier',     'paul.mercier@exemple.test',    'volunteer', '06 39 98 00 19', '{}',                          'Samedi après-midi',         30,  null),
  ('Nora Benali',      'nora.benali@exemple.test',     'volunteer', '06 39 98 00 20', '{cuisine,social}',            'Flexible',                  20,  null)
) as t(full_name, email, role, phone, skills, availability, days_ago, pw);

create temp table _ids on commit drop as
select gen_random_uuid() as id, p.* from _people p;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
  phone_change, phone_change_token, reauthentication_token)
select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  case when pw is null then null else extensions.crypt(pw, extensions.gen_salt('bf')) end, now(),
  '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('full_name', full_name),
  now() - (days_ago || ' days')::interval, now(),
  '', '', '', '', '', '', '', ''
from _ids;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), now(), now(), now()
from _ids;

-- Le déclencheur on_auth_user_created a créé les profils : on les complète
update public.profiles pr set
  role = i.role::public.user_role, phone = i.phone, skills = i.skills::text[], availability = i.availability,
  charter_signed_at = now() - ((i.days_ago - 7) || ' days')::interval,
  created_at = now() - (i.days_ago || ' days')::interval
from _ids i where pr.id = i.id;

-- ---------------------------------------------------------------------
-- 2) Événements : un par semaine, de -10 à +8 semaines
--    semaine paire  → maraude (mardi 19h30)
--    semaine impaire → atelier paniers repas (samedi 14h, ouvert au public)
-- ---------------------------------------------------------------------
insert into public.events (slug, title, description, type, status, starts_at, ends_at, location, meeting_point,
                           is_public, public_capacity, volunteer_slots, created_by)
select
  to_char(s.starts_local, 'YYYY-MM-DD') || case when s.is_maraude then '-maraude' else '-atelier-paniers' end,
  case when s.is_maraude
       then 'Maraude du mardi — ' || case when (s.k / 2) % 2 = 0 then 'Presqu''île' else 'Part-Dieu' end
       else 'Atelier paniers repas' end,
  case when s.is_maraude
       then 'Distribution de repas chauds, boissons et kits d''hygiène en binômes. Briefing à 19h30, départ à 20h, retour vers 23h.'
       else 'On prépare ensemble les paniers repas distribués lors des prochaines maraudes : tri des denrées, conditionnement, étiquetage. Ouvert à toutes et tous, aucune compétence requise.' end,
  (case when s.is_maraude then 'maraude' else 'distribution' end)::public.event_type,
  (case when s.starts_local at time zone 'Europe/Paris' < now() then 'done' else 'published' end)::public.event_status,
  s.starts_local at time zone 'Europe/Paris',
  s.ends_local   at time zone 'Europe/Paris',
  case when s.is_maraude
       then case when (s.k / 2) % 2 = 0 then 'Lyon 2e, Presqu''île et place Bellecour' else 'Lyon 3e, quartier de la gare Part-Dieu' end
       else 'Local de l''association, 15 rue de Marignan, 69003 Lyon' end,
  'Local de l''association, 15 rue de Marignan, 69003 Lyon',
  not s.is_maraude,
  case when s.is_maraude then null else 12 end,
  case when s.is_maraude then 6 else 8 end,
  (select id from public.profiles where role = 'admin' order by created_at limit 1)
from (
  select k, k % 2 = 0 as is_maraude,
    case when k % 2 = 0
         then date_trunc('week', now() at time zone 'Europe/Paris') + k * interval '7 days' + interval '1 day 19 hours 30 minutes'
         else date_trunc('week', now() at time zone 'Europe/Paris') + k * interval '7 days' + interval '5 days 14 hours' end as starts_local,
    case when k % 2 = 0
         then date_trunc('week', now() at time zone 'Europe/Paris') + k * interval '7 days' + interval '1 day 23 hours'
         else date_trunc('week', now() at time zone 'Europe/Paris') + k * interval '7 days' + interval '5 days 17 hours 30 minutes' end as ends_local
  from generate_series(-10, 8) as k
) s;

-- ---------------------------------------------------------------------
-- 3) Équipes : présents sur les événements passés, inscrits sur les à venir
-- ---------------------------------------------------------------------
insert into public.volunteer_shifts (event_id, profile_id, task, status)
select ranked.event_id, ranked.profile_id,
       case when ranked.rn = 1 then 'Référent·e' end,
       (case when ranked.past then 'attended' else 'confirmed' end)::public.shift_status
from (
  select e.id as event_id, p.id as profile_id, e.starts_at < now() as past,
         row_number() over (partition by e.id order by md5(e.id::text || p.id::text)) as rn,
         case when e.type = 'maraude'
              then case when e.starts_at < now() then 5 + abs(hashtext(e.id::text)) % 3 else 2 + abs(hashtext(e.id::text)) % 4 end
              else case when e.starts_at < now() then 6 + abs(hashtext(e.id::text)) % 3 else 3 + abs(hashtext(e.id::text)) % 4 end
         end as target
  from public.events e cross join public.profiles p
  where p.is_active
) ranked
where ranked.rn <= ranked.target;

-- ---------------------------------------------------------------------
-- 4) Comptes-rendus des maraudes passées (statistiques anonymes)
-- ---------------------------------------------------------------------
insert into public.maraude_reports (event_id, zone, people_met, meals_given, hot_drinks, hygiene_kits, clothes_given,
                                    blankets_given, referrals_115, volunteers_count, temperature_c, notes, created_by)
select e.id, e.location,
  28 + h % 19,
  31 + h % 19 + (h / 7) % 8,
  28 + h % 19 + (h / 11) % 10,
  6 + (h / 13) % 9,
  (h / 17) % 15,
  (h / 19) % 4,
  (h / 23) % 4,
  (select count(*) from public.volunteer_shifts s where s.event_id = e.id and s.status = 'attended'),
  7 + (h / 29) % 10,
  (array['RAS. Bon accueil général.', 'Soirée calme, beaucoup d''échanges.', 'Besoin de duvets signalé sur le secteur.',
         'Nouvelle équipe en binôme, très bien passé.'])[1 + h % 4],
  (select id from public.profiles where role = 'admin' order by created_at limit 1)
from (select e.*, abs(hashtext(e.id::text)) as h from public.events e) e
where e.type = 'maraude' and e.status = 'done';

-- ---------------------------------------------------------------------
-- 5) Stocks cohérents avec l'activité (~40 personnes par maraude)
--    colonnes : article, catégorie, unité, seuil, emplacement,
--               stock initial, réassort, sortie/maraude, sortie/atelier, DLC (jours)
-- ---------------------------------------------------------------------
create temp table _stock (name text, category text, unit text, thr numeric, loc text,
                          init numeric, restock numeric, use_m numeric, use_a numeric, dlc int) on commit drop;
insert into _stock values
  ('Sandwichs',               'alimentaire', 'unité',   30, 'Frigo',         240,  60, 40,  0,   3),
  ('Soupe en brique',         'alimentaire', 'L',       24, 'Réserve A',      96,  48, 12,  0, 150),
  ('Plats cuisinés en boîte', 'alimentaire', 'boîte',   30, 'Réserve A',     150,   0,  0, 20, 400),
  ('Pâtes',                   'alimentaire', 'kg',      15, 'Réserve A',      60,   0,  0,  6, 300),
  ('Riz',                     'alimentaire', 'kg',      15, 'Réserve A',      40,   0,  0,  5, 300),
  ('Compotes',                'alimentaire', 'unité',   40, 'Réserve A',     300, 100, 20, 15, 180),
  ('Biscuits',                'alimentaire', 'paquet',  20, 'Réserve A',     100,   0,  8,  4, 200),
  ('Café soluble',            'boisson',     'boîte',    4, 'Étagère A',      14,   0,  1,  0, 365),
  ('Thé',                     'boisson',     'boîte',    4, 'Étagère A',      12,   0,  1,  0, 365),
  ('Lait UHT',                'boisson',     'L',        6, 'Étagère A',      36,   0,  3,  0, 120),
  ('Sucre',                   'boisson',     'kg',       3, 'Étagère A',       8,   0,  0.5, 0, null),
  ('Bouteilles d''eau',       'boisson',     'unité',   48, 'Réserve B',     240, 120, 24,  0, 365),
  ('Kits hygiène',            'hygiene',     'unité',   25, 'Étagère B',      60,  40, 10,  0, null),
  ('Savons',                  'hygiene',     'unité',   20, 'Étagère B',      80,   0,  0,  6, null),
  ('Dentifrices',             'hygiene',     'unité',   15, 'Étagère B',      40,   0,  0,  3, 500),
  ('Brosses à dents',         'hygiene',     'unité',   15, 'Étagère B',      40,   0,  0,  3, null),
  ('Protections périodiques', 'hygiene',     'paquet',  10, 'Étagère B',      24,   0,  2,  0, null),
  ('Mouchoirs',               'hygiene',     'paquet',  20, 'Étagère B',      60,   0,  5,  0, null),
  ('Gel hydroalcoolique',     'hygiene',     'flacon',   5, 'Étagère B',      12,   0,  1,  0, 400),
  ('Chaussettes',             'vetements',   'paire',   30, 'Bac vêtements', 120,  60, 10,  0, null),
  ('Bonnets',                 'vetements',   'unité',   15, 'Bac vêtements',  40,   0,  4,  0, null),
  ('Gants',                   'vetements',   'paire',   15, 'Bac vêtements',  40,   0,  4,  0, null),
  ('Sous-vêtements',          'vetements',   'lot',     10, 'Bac vêtements',  30,   0,  2,  0, null),
  ('Manteaux',                'vetements',   'unité',    6, 'Bac vêtements',  20,   0,  1,  0, null),
  ('Couvertures de survie',   'couchage',    'unité',   20, 'Réserve B',      60,   0,  5,  0, null),
  ('Duvets',                  'couchage',    'unité',    6, 'Réserve B',      14,   0,  1,  0, null),
  ('Gobelets',                'materiel',    'unité',  100, 'Étagère C',     800,   0, 80,  0, null),
  ('Sacs papier repas',       'materiel',    'unité',   60, 'Étagère C',     300, 200, 40, 25, null),
  ('Gants jetables',          'materiel',    'boîte',    3, 'Étagère C',      14,   0,  1,  1, null),
  ('Sacs poubelle',           'materiel',    'rouleau',  3, 'Étagère C',      16,   0,  1,  1, null);

insert into public.stock_items (name, category, unit, min_threshold, location)
select name, category::public.stock_category, unit, thr, loc from _stock;

-- Stock initial (dons reçus ou achats), il y a ~11 semaines
insert into public.stock_movements (item_id, delta, reason, expires_on, note, created_at)
select i.id, s.init,
       (case when s.category in ('alimentaire','boisson') and s.name not in ('Sandwichs') then 'don_recu' else 'achat' end)::public.movement_reason,
       case when s.dlc is not null and s.name <> 'Sandwichs' then current_date + s.dlc end,
       'Stock de départ', now() - interval '75 days'
from _stock s join public.stock_items i on i.name = s.name and i.unit = s.unit;

-- Réassorts (collecte / achat) il y a ~4 semaines ; sandwichs avec DLC courte
insert into public.stock_movements (item_id, delta, reason, expires_on, note, created_at)
select i.id, s.restock, 'achat'::public.movement_reason,
       case when s.dlc is not null then current_date + least(s.dlc, case when s.name = 'Sandwichs' then 3 else s.dlc end) end,
       'Réassort collecte du mois', now() - interval '30 days'
from _stock s join public.stock_items i on i.name = s.name and i.unit = s.unit
where s.restock > 0;

-- Sorties : une par article utilisé à chaque maraude / atelier terminé
insert into public.stock_movements (item_id, delta, reason, event_id, note, created_at)
select i.id,
       - case when e.type = 'maraude' then s.use_m else s.use_a end,
       'distribution'::public.movement_reason, e.id,
       case when e.type = 'maraude' then 'Distribution maraude' else 'Préparation paniers repas' end,
       e.ends_at
from public.events e
join _stock s on (case when e.type = 'maraude' then s.use_m else s.use_a end) > 0
join public.stock_items i on i.name = s.name and i.unit = s.unit
where e.status = 'done';

-- Quelques pertes (denrées périmées)
insert into public.stock_movements (item_id, delta, reason, note, created_at)
select i.id, -8, 'perime'::public.movement_reason, 'DLC dépassée', now() - interval '12 days'
from public.stock_items i where i.name = 'Sandwichs'
union all
select i.id, -4, 'perime'::public.movement_reason, 'Briques abîmées', now() - interval '20 days'
from public.stock_items i where i.name = 'Soupe en brique';

-- ---------------------------------------------------------------------
-- 6) Actualités, dons et un message de contact
-- ---------------------------------------------------------------------
insert into public.posts (slug, title, excerpt, content, status, published_at, author_id)
select p.slug, p.title, p.excerpt, p.content, 'published'::public.content_status, now() - (p.days || ' days')::interval,
       (select id from public.profiles where role = 'admin' order by created_at limit 1)
from (values
  ('premier-atelier-paniers-repas', 'Premier atelier paniers repas : un vrai succès',
   'Une douzaine de bénévoles réunis un samedi après-midi pour préparer les paniers de la semaine.', 6,
   E'Samedi dernier, **douze personnes** se sont retrouvées au local pour préparer les paniers repas distribués lors des maraudes.\n\n## Au programme\n\n- Tri et contrôle des dates limites\n- Conditionnement des denrées sèches\n- Préparation des kits d''hygiène\n\nMerci à tous ! Le prochain atelier est déjà dans l''agenda.'),
  ('besoin-de-duvets-et-de-chaussettes', 'Nos besoins du moment : duvets et chaussettes chaudes',
   'Avec les premiers froids, nos stocks de couchage et de vêtements chauds baissent vite.', 15,
   E'Les nuits se rafraîchissent et nous distribuons davantage de duvets et de chaussettes à chaque maraude.\n\n## Comment nous aider\n\n- Déposer des duvets propres au local\n- Offrir des chaussettes neuves\n- Participer à la prochaine collecte\n\nToute l''équipe vous remercie.'),
  ('bienvenue-aux-nouveaux-benevoles', 'Bienvenue aux nouveaux bénévoles',
   'Trois nouvelles recrues ont rejoint les maraudes ce mois-ci.', 28,
   E'Ce mois-ci, **trois nouveaux bénévoles** ont rejoint l''équipe. Ils ont déjà participé à leur première maraude, en binôme avec des bénévoles expérimentés.\n\nVous aussi, venez nous rencontrer lors d''un prochain atelier.')
) as p(slug, title, excerpt, days, content);

insert into public.donations (helloasso_payment_id, helloasso_order_id, amount_cents, is_recurring, donor_first_name,
                              donor_last_name, donor_email, is_company, paid_at)
select 900000 + n, 800000 + n,
  (array[10,20,20,30,50,15,100,25,40,5,60,20])[1 + n % 12] * 100,
  n % 5 = 0,
  (array['Marie','Pierre','Sandrine','David','Émilie','Nicolas','Isabelle','Antoine','Julie','Olivier'])[1 + n % 10],
  (array['Lambert','Roux','Vincent','Muller','Robin','Clement','Gauthier','Perrin'])[1 + (n * 3) % 8],
  case when n % 13 = 0 then 'contact@' || (array['lambert','roux','vincent','muller','robin','clement','gauthier','perrin'])[1 + (n * 3) % 8] || '-services.fr'
       else translate(lower((array['Marie','Pierre','Sandrine','David','Emilie','Nicolas','Isabelle','Antoine','Julie','Olivier'])[1 + n % 10]), 'é', 'e')
            || case n % 4 when 0 then '.' when 1 then '.' when 2 then '' else '_' end
            || (array['lambert','roux','vincent','muller','robin','clement','gauthier','perrin'])[1 + (n * 3) % 8]
            || case when n % 4 = 1 then (10 + (n * 7) % 80)::text else '' end
            || '@' || (array['gmail.com','outlook.fr','orange.fr','free.fr','hotmail.fr','yahoo.fr','laposte.net','sfr.fr','wanadoo.fr','gmail.com'])[1 + n % 10]
  end,
  n % 13 = 0,
  now() - ((n * 4.5) || ' days')::interval
from generate_series(1, 30) as n;

insert into public.contact_messages (full_name, email, subject, message)
values ('Boulangerie du Centre', 'contact@boulangerie.exemple.test', 'don_nature',
        'Bonjour, nous souhaiterions vous donner nos invendus chaque soir. Comment procéder ?');

-- ---------------------------------------------------------------------
-- Pour retirer ces données de démonstration avant le lancement :
--   delete from public.donations where helloasso_payment_id between 900001 and 900030;
--   delete from public.contact_messages where email like '%@exemple.test';
--   delete from public.posts where slug in ('premier-atelier-paniers-repas',
--     'besoin-de-duvets-et-de-chaussettes','bienvenue-aux-nouveaux-benevoles');
--   delete from public.stock_items;      -- supprime aussi les mouvements
--   delete from public.events;           -- supprime inscriptions, créneaux, comptes-rendus
--   delete from auth.users where email like '%@exemple.test' or email like '%@demo.test';
-- ---------------------------------------------------------------------
