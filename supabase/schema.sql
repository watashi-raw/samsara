-- ============================================================
--  SAMSARA · esquema de base de datos (Supabase / Postgres)
--  Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Registro diario ----------
create table if not exists public.entries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day                date not null,
  moon_phase         text,                       -- new, waxing_crescent, first_quarter, ...
  moon_illumination  numeric(5,2),               -- 0 a 100
  flow               text check (flow is null or flow in ('none','spotting','light','medium','heavy')),
  pain               smallint check (pain is null or pain between 0 and 5),
  libido             smallint check (libido is null or libido between 0 and 5),
  sleep_hours        numeric(3,1) check (sleep_hours is null or sleep_hours between 0 and 24),
  mood               text[] not null default '{}',
  energy             text[] not null default '{}',
  symptoms           text[] not null default '{}',
  breast             text[] not null default '{}',
  activities         text[] not null default '{}',
  care               text[] not null default '{}',
  sex                text,
  discharge_status   text,
  discharge_touch    text,
  discharge_smell    text,
  digestion          text,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, day)
);
-- si ya habías creado la tabla antes, esto agrega la columna nueva
alter table public.entries add column if not exists libido smallint check (libido is null or libido between 0 and 5);
create index if not exists entries_user_day on public.entries (user_id, day desc);

-- ---------- Catálogo editable de opciones ----------
create table if not exists public.catalog (
  id        uuid primary key default gen_random_uuid(),
  category  text not null,
  key       text not null,
  label     text not null,
  icon      text not null default 'dot',
  sort      int  not null default 0,
  active    boolean not null default true,
  unique (category, key)
);

-- ---------- updated_at automático ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

-- ---------- Seguridad (RLS): solo usuarios autenticados, cada quien lo suyo ----------
alter table public.entries enable row level security;
alter table public.catalog enable row level security;

drop policy if exists "entries_own" on public.entries;
create policy "entries_own" on public.entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "catalog_select" on public.catalog;
drop policy if exists "catalog_insert" on public.catalog;
drop policy if exists "catalog_update" on public.catalog;
drop policy if exists "catalog_delete" on public.catalog;
create policy "catalog_select" on public.catalog for select to authenticated using (true);
create policy "catalog_insert" on public.catalog for insert to authenticated with check (true);
create policy "catalog_update" on public.catalog for update to authenticated using (true) with check (true);
create policy "catalog_delete" on public.catalog for delete to authenticated using (true);

-- ---------- Vista de apoyo: días con regla y ciclo ----------
create or replace view public.v_period_days as
  select user_id, day, flow, moon_phase, pain
  from public.entries
  where flow in ('spotting','light','medium','heavy');

-- ---------- Semilla del catálogo ----------
insert into public.catalog (category, key, label, icon, sort) values
  ('mood','cranky','Bad vibes','cranky',0),
  ('mood','horny','Horny','fire',1),
  ('mood','chill','Chill','leaf',2),
  ('mood','lovely','Soft','heart',3),
  ('mood','sensual','Sensual','wave',4),
  ('mood','apathetic','Meh','minus',5),
  ('mood','depressed','Down','rain',6),
  ('mood','ugly','Flop era','frown',7),
  ('mood','anxious','Overthinking','spiral',8),
  ('mood','sensitive','Sensible','sensitive',9),
  ('energy','energetic','Full energy','bolt',10),
  ('energy','thoughtful','En mi cabeza','cloud',11),
  ('energy','tired','Drenada','battery',12),
  ('energy','sleepy','Modo sleepy','zzz',13),
  ('symptoms','acne','Granitos','acne',14),
  ('symptoms','cramps','Cólicos','cramps',15),
  ('symptoms','backache','Espalda rota','spine',16),
  ('symptoms','insomnia','Insomnio','eye',17),
  ('symptoms','fatigue','Sin batería','battery-low',18),
  ('symptoms','dry_skin','Piel seca','cracks',19),
  ('symptoms','abdominal_pain','Panza mal','belly',20),
  ('symptoms','craving','Cravings','icecream',21),
  ('symptoms','headache','Cabeza','head',22),
  ('symptoms','bloating','Inflada','balloon',23),
  ('symptoms','nausea','Náusea','nausea',24),
  ('symptoms','dizziness','Mareo','dizzy',25),
  ('symptoms','hot_flashes','Calores','thermo',26),
  ('breast','heavy','Pesadas','weight',27),
  ('breast','lighter','Ligeras','feather',28),
  ('breast','sensible','Sensibles','alert',29),
  ('breast','swollen','Hinchadas','swollen',30),
  ('activities','exercise','Gym','dumbbell',31),
  ('activities','walk','Hot girl walk','footprints',32),
  ('activities','yoga','Yoga / stretch','lotus',33),
  ('activities','rest','Bed rotting','bed',34),
  ('activities','social','Social','people',35),
  ('activities','work','Grind','briefcase',36),
  ('activities','travel','Viaje','plane',37),
  ('activities','alcohol','Drinks','glass',38),
  ('activities','coffee','Café','cup',39),
  ('activities','meditation','Meditación','circle-dot',40),
  ('activities','creative','Creativa','pen',41),
  ('activities','selfcare','Self care','sparkle',42),
  ('care','painkiller','Pastilla pal dolor','pill',43),
  ('care','pill','Anticonceptivo','pills',44),
  ('care','supplement','Suplemento','leaf-plus',45),
  ('care','doctor','Cita médica','cross',46),
  ('sex','once','Una vez','heart',47),
  ('sex','more','Round 2+','hearts',48),
  ('sex','solo','Self love','star',49),
  ('sex','none','Nada de nada','x',50),
  ('discharge_status','dry','Seco','sun',51),
  ('discharge_status','normal','Normal','dot',52),
  ('discharge_status','too_much','Mucho','drops',53),
  ('discharge_status','bloody','Con sangre','drop-fill',54),
  ('discharge_status','clean','Limpio','sparkle',55),
  ('discharge_touch','creamy','Cremoso','cloud',56),
  ('discharge_touch','watery','Aguado','waves',57),
  ('discharge_touch','egg_white','Clara de huevo','egg',58),
  ('discharge_touch','sticky','Pegajoso','sticky',59),
  ('discharge_smell','none','Sin olor','circle',60),
  ('discharge_smell','strong','Fuerte','wind',61),
  ('discharge_smell','fetid','Feo','alert',62),
  ('discharge_smell','strange','Raro','question',63),
  ('digestion','normal','Normal','check',64),
  ('digestion','constipation','Estreñida','stop',65),
  ('digestion','diarrhea','Diarrea','waves-down',66)
on conflict (category, key) do update set label = excluded.label, icon = excluded.icon;
