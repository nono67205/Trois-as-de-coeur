-- =====================================================================
-- Schéma initial — site de l'association (maraudes)
-- À exécuter via `supabase db push` ou dans l'éditeur SQL de Supabase.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type user_role as enum ('volunteer', 'coordinator', 'admin');
create type content_status as enum ('draft', 'published', 'archived');
create type event_type as enum ('maraude', 'collecte', 'distribution', 'formation', 'evenement_public', 'reunion');
create type event_status as enum ('draft', 'published', 'cancelled', 'done');
create type shift_status as enum ('confirmed', 'waitlist', 'cancelled', 'attended', 'no_show');
create type stock_category as enum ('alimentaire', 'boisson', 'hygiene', 'vetements', 'couchage', 'materiel', 'autre');
create type movement_reason as enum ('don_recu', 'achat', 'distribution', 'perime', 'perte', 'ajustement');

-- ---------------------------------------------------------------------
-- Profils (1-1 avec auth.users) — bénévoles, coordinateurs, admins
-- ---------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null default '',
  phone         text,
  role          user_role not null default 'volunteer',
  skills        text[] not null default '{}',          -- ex: {'permis_b','premiers_secours','cuisine'}
  availability  text,                                   -- texte libre : "mardi soir, week-end"
  charter_signed_at timestamptz,                        -- charte bénévole signée
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('coordinator','admin') and is_active);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and is_active);
$$;

-- Crée automatiquement le profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Un bénévole ne peut pas changer son propre rôle
create or replace function public.protect_role()
returns trigger language plpgsql as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Seul un admin peut modifier un rôle';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on profiles
  for each row execute function public.protect_role();

-- ---------------------------------------------------------------------
-- Actualités
-- ---------------------------------------------------------------------
create table posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  excerpt      text,
  content      text not null default '',              -- Markdown
  cover_url    text,
  cover_alt    text,                                   -- texte alternatif obligatoire si image
  status       content_status not null default 'draft',
  published_at timestamptz,
  author_id    uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index posts_published_idx on posts (status, published_at desc);

-- ---------------------------------------------------------------------
-- Événements (maraudes, collectes, formations, événements publics…)
-- ---------------------------------------------------------------------
create table events (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  description     text not null default '',
  type            event_type not null,
  status          event_status not null default 'draft',
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  location        text,                                -- adresse publique
  meeting_point   text,                                -- point de RDV (visible bénévoles inscrits)
  is_public       boolean not null default false,      -- ouvert aux inscriptions du grand public
  public_capacity int check (public_capacity is null or public_capacity >= 0),
  volunteer_slots int check (volunteer_slots is null or volunteer_slots >= 0),
  required_skills text[] not null default '{}',
  cover_url       text,
  cover_alt       text,
  created_by      uuid references profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index events_starts_idx on events (status, starts_at);

-- Inscriptions du grand public (sans compte)
create table event_registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  full_name     text not null check (length(full_name) between 2 and 120),
  email         text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone         text,
  seats         int not null default 1 check (seats between 1 and 10),
  gdpr_consent  boolean not null check (gdpr_consent),
  newsletter_optin boolean not null default false,
  cancel_token  uuid not null default gen_random_uuid(),
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (event_id, email)
);

-- Créneaux bénévoles
create table volunteer_shifts (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references events(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  task        text,                                    -- ex: chauffeur, cuisine, terrain, référent
  status      shift_status not null default 'confirmed',
  created_at  timestamptz not null default now(),
  unique (event_id, profile_id)
);

-- ---------------------------------------------------------------------
-- Stocks & inventaire
-- ---------------------------------------------------------------------
create table stock_items (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      stock_category not null,
  unit          text not null default 'unité',         -- unité, kg, L, paquet…
  min_threshold numeric not null default 0,            -- alerte stock bas
  location      text,                                  -- local, étagère…
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (name, unit)
);

create table stock_movements (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references stock_items(id) on delete cascade,
  delta       numeric not null check (delta <> 0),     -- + entrée / - sortie
  reason      movement_reason not null,
  expires_on  date,                                    -- DLC / DDM pour l'alimentaire
  event_id    uuid references events(id) on delete set null,
  note        text,
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index stock_movements_item_idx on stock_movements (item_id, created_at desc);

create view stock_levels with (security_invoker = true) as
select i.id, i.name, i.category, i.unit, i.min_threshold, i.location,
       coalesce(sum(m.delta), 0) as quantity,
       coalesce(sum(m.delta), 0) <= i.min_threshold as is_low,
       min(m.expires_on) filter (where m.delta > 0 and m.expires_on >= current_date) as next_expiry
from stock_items i
left join stock_movements m on m.item_id = i.id
where i.is_active
group by i.id;

-- ---------------------------------------------------------------------
-- Comptes-rendus de maraude — STATISTIQUES ANONYMES UNIQUEMENT
-- Aucune donnée nominative sur les personnes rencontrées.
-- ---------------------------------------------------------------------
create table maraude_reports (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null unique references events(id) on delete cascade,
  zone           text,
  people_met     int not null default 0 check (people_met >= 0),
  meals_given    int not null default 0 check (meals_given >= 0),
  hot_drinks     int not null default 0 check (hot_drinks >= 0),
  hygiene_kits   int not null default 0 check (hygiene_kits >= 0),
  clothes_given  int not null default 0 check (clothes_given >= 0),
  blankets_given int not null default 0 check (blankets_given >= 0),
  referrals_115  int not null default 0 check (referrals_115 >= 0),  -- orientations SAMU social / structures
  volunteers_count int not null default 0 check (volunteers_count >= 0),
  temperature_c  numeric,
  notes          text,                                  -- observations générales, sans nom
  created_by     uuid references profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Dons (alimentés par le webhook HelloAsso)
-- ---------------------------------------------------------------------
create table donations (
  id                  uuid primary key default gen_random_uuid(),
  helloasso_payment_id bigint unique,
  helloasso_order_id  bigint,
  amount_cents        int not null check (amount_cents > 0),
  is_recurring        boolean not null default false,
  donor_first_name    text,
  donor_last_name     text,
  donor_email         text,
  is_company          boolean not null default false,
  paid_at             timestamptz not null,
  raw                 jsonb,                            -- payload brut pour audit
  created_at          timestamptz not null default now()
);
create index donations_paid_idx on donations (paid_at desc);

-- Dons en nature (hors stock — ex : un véhicule, un local prêté)
-- → gérés via stock_movements reason = 'don_recu'

-- ---------------------------------------------------------------------
-- Messages de contact & newsletter
-- ---------------------------------------------------------------------
create table contact_messages (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  email      text not null,
  subject    text not null,                             -- benevolat, partenariat, don_nature, signalement, autre
  message    text not null check (length(message) <= 5000),
  handled    boolean not null default false,
  created_at timestamptz not null default now()
);

create table newsletter_subscribers (
  email        text primary key,
  confirmed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Statistiques publiques (compteurs d'impact affichés sur l'accueil)
-- ---------------------------------------------------------------------
create view public_impact with (security_invoker = false) as
select
  (select count(*) from events where type = 'maraude' and status = 'done')  as maraudes_done,
  (select coalesce(sum(meals_given), 0) from maraude_reports)                as meals_given,
  (select coalesce(sum(people_met), 0) from maraude_reports)                 as people_met,
  (select count(*) from profiles where is_active)                             as volunteers;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table profiles              enable row level security;
alter table posts                 enable row level security;
alter table events                enable row level security;
alter table event_registrations   enable row level security;
alter table volunteer_shifts      enable row level security;
alter table stock_items           enable row level security;
alter table stock_movements       enable row level security;
alter table maraude_reports       enable row level security;
alter table donations             enable row level security;
alter table contact_messages      enable row level security;
alter table newsletter_subscribers enable row level security;

-- Profils
create policy "profil: lecture soi-même ou staff" on profiles for select
  using (id = auth.uid() or public.is_staff());
create policy "profil: modification soi-même ou admin" on profiles for update
  using (id = auth.uid() or public.is_admin());

-- Actualités
create policy "posts: public lit les publiés" on posts for select
  using (status = 'published' and published_at <= now());
create policy "posts: staff gère" on posts for all
  using (public.is_staff()) with check (public.is_staff());

-- Événements
create policy "events: public lit les publics publiés" on events for select
  using (status in ('published','done') and is_public);
create policy "events: bénévoles lisent tous les publiés" on events for select
  using (auth.uid() is not null and status in ('published','done'));
create policy "events: staff gère" on events for all
  using (public.is_staff()) with check (public.is_staff());

-- Inscriptions publiques : écriture via server action (service role), lecture staff
create policy "registrations: staff lit et gère" on event_registrations for all
  using (public.is_staff()) with check (public.is_staff());

-- Créneaux bénévoles
create policy "shifts: bénévole voit les siens, staff tout" on volunteer_shifts for select
  using (profile_id = auth.uid() or public.is_staff());
create policy "shifts: bénévole s'inscrit lui-même" on volunteer_shifts for insert
  with check (profile_id = auth.uid() or public.is_staff());
create policy "shifts: bénévole modifie les siens" on volunteer_shifts for update
  using (profile_id = auth.uid() or public.is_staff());
create policy "shifts: staff supprime" on volunteer_shifts for delete
  using (public.is_staff());

-- Stocks : lecture bénévoles, écriture staff
create policy "stock_items: bénévoles lisent" on stock_items for select using (auth.uid() is not null);
create policy "stock_items: staff gère" on stock_items for all using (public.is_staff()) with check (public.is_staff());
create policy "stock_movements: bénévoles lisent" on stock_movements for select using (auth.uid() is not null);
create policy "stock_movements: staff gère" on stock_movements for all using (public.is_staff()) with check (public.is_staff());

-- Comptes-rendus : bénévoles inscrits peuvent saisir, staff gère
create policy "reports: bénévoles lisent" on maraude_reports for select using (auth.uid() is not null);
create policy "reports: bénévole de la maraude ou staff saisit" on maraude_reports for insert
  with check (public.is_staff() or exists (
    select 1 from volunteer_shifts s where s.event_id = maraude_reports.event_id and s.profile_id = auth.uid()));
create policy "reports: staff modifie" on maraude_reports for update using (public.is_staff());

-- Dons : admins uniquement (données personnelles des donateurs)
create policy "donations: admin lit" on donations for select using (public.is_admin());

-- Contact / newsletter : écriture via server action (service role), lecture staff
create policy "contact: staff gère" on contact_messages for all using (public.is_staff()) with check (public.is_staff());
create policy "newsletter: admin gère" on newsletter_subscribers for all using (public.is_admin()) with check (public.is_admin());

-- Vue publique d'impact accessible à tous
grant select on public_impact to anon, authenticated;

-- Remplissage des créneaux (compteurs seulement, sans identité) pour les bénévoles connectés
create view event_fill with (security_invoker = false) as
select e.id as event_id,
       count(s.id) filter (where s.status = 'confirmed') as volunteers_confirmed,
       count(s.id) filter (where s.status = 'waitlist')  as volunteers_waitlist
from events e
left join volunteer_shifts s on s.event_id = e.id
group by e.id;
revoke all on event_fill from anon;
grant select on event_fill to authenticated;

-- ---------------------------------------------------------------------
-- Stockage (images des actus / événements)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media: lecture publique" on storage.objects for select using (bucket_id = 'media');
create policy "media: staff upload" on storage.objects for insert with check (bucket_id = 'media' and public.is_staff());
create policy "media: staff supprime" on storage.objects for delete using (bucket_id = 'media' and public.is_staff());
