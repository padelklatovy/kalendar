-- ============================================================
-- PADEL KLATOVY — Klubový kalendář
-- Struktura tabulky pro Supabase (PostgreSQL)
-- ============================================================
-- Spusť v Supabase: Project → SQL Editor → New query
--
-- Můžeš použít úplně nový projekt, nebo klidně existující projekt
-- Padel Klatovy Hub (zlgqsndoreimophthvpw) — tabulka "events" nijak
-- nekoliduje s tabulkou "news" ani ostatními, takže se to dá později
-- snadno propojit (např. Hub by mohl zobrazovat nejbližší akci).

create extension if not exists "pgcrypto";

create table if not exists events (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  category              text not null,
  -- 'turnaj' | 'komunita' | 'prednaska' | 'trenink' | 'open_match'
  -- | 'zdravy_hrac' | 'firemni' | 'klubovy_zivot'

  date                  date not null,
  time_from             time not null,
  time_to               time not null,
  location              text,

  description_short     text,
  description_long      text,

  capacity              integer,
  signed_up_count       integer default 0,
  price                 numeric,
  is_free               boolean default false,

  organizer             text,     -- pořadatel / kdo akci vede
  phone                 text,
  whatsapp              text,     -- nepovinné, override klubového čísla

  photo_url             text,
  tags                  jsonb default '[]'::jsonb,     -- pole textových štítků
  schedule              jsonb default '[]'::jsonb,     -- pole {time, item}
  what_to_bring         text,

  status                text not null default 'otevreno',
  -- 'otevreno' | 'posledni_mista' | 'plno' | 'zruseno' | 'probehlo'

  visibility            text not null default 'verejne',
  -- 'verejne' | 'skryte'

  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index if not exists events_date_idx on events (date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table events enable row level security;

create policy "Public can read visible events"
  on events for select
  using (visibility = 'verejne');

-- --------------------------------------------------------------
-- POZNÁMKA K ZABEZPEČENÍ ADMINISTRACE (důležité, přečti si to)
-- --------------------------------------------------------------
-- admin.html v této verzi ověřuje heslo jen v prohlížeči (config.js
-- -> ADMIN_PASSWORD). Pro provoz v rámci důvěryhodné komunity klubu
-- je to v pořádku, ale nechrání to zápis do databáze před technicky
-- zdatným návštěvníkem se znalostí tvého Supabase anon klíče.
create policy "Anon can manage events (v1 - jednoduchý provoz)"
  on events for all
  using (true)
  with check (true);

-- --------------------------------------------------------------
-- DOPORUČENÉ ZPEVNĚNÍ DO BUDOUCNA (volitelné)
-- --------------------------------------------------------------
-- drop policy "Anon can manage events (v1 - jednoduchý provoz)" on events;
--
-- create policy "Only authenticated admin can write"
--   on events for all
--   using (auth.role() = 'authenticated')
--   with check (auth.role() = 'authenticated');
--
-- V administraci by pak jednoduché heslo nahradilo Supabase Auth
-- (supabase.auth.signInWithPassword({email, password})).
