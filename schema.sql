-- =============================================================
-- AGENCY MGMT — SQL COMPLETO
-- Incolla tutto in Supabase → SQL Editor → Run
-- Se hai già le tabelle dal setup precedente, parti dalla
-- sezione "STEP 2 — ALTER TABLES" invece che da capo
-- =============================================================


-- =============================================================
-- STEP 1 — TABELLE (skip se esistono già)
-- =============================================================

create table if not exists schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

create table if not exists agents (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  -- percentuale mesi 1-12 contratto in esclusiva
  commission_pct_exclusive numeric(5,2) not null default 10,
  -- percentuale mesi 1-12 contratto non in esclusiva
  commission_pct_open      numeric(5,2) not null default 7,
  -- dal mese 13 in poi è sempre 5% per contratto
  -- (costante contrattuale, non serve colonna)
  created_at               timestamptz default now()
);

create table if not exists models (
  id         uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name  text not null,
  school_id  uuid references schools(id),
  agent_id   uuid references agents(id),
  notes      text,
  created_at timestamptz default now()
);

create table if not exists contracts (
  id           uuid primary key default gen_random_uuid(),
  model_id     uuid references models(id) not null,
  client_name  text not null,
  total_amount numeric(10,2) not null,
  start_date   date not null,
  end_date     date not null,
  -- true = inserimento in esclusiva con l'agenzia
  exclusive    boolean not null default true,
  status       text check (status in ('active','completed','cancelled')) default 'active',
  created_at   timestamptz default now()
);

create table if not exists school_commission_rules (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid references schools(id) not null,
  min_months     int not null,
  max_months     int,           -- null = senza limite
  commission_pct numeric(5,2) not null
);


-- =============================================================
-- STEP 2 — ALTER TABLES
-- Aggiunge le colonne mancanti se parti da un DB esistente.
-- Sicuro da eseguire anche se le colonne esistono già
-- (grazie a IF NOT EXISTS).
-- =============================================================

alter table agents
  add column if not exists commission_pct_exclusive numeric(5,2) not null default 10,
  add column if not exists commission_pct_open      numeric(5,2) not null default 7;

-- Migra il valore precedente se esiste la colonna vecchia
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name='agents' and column_name='commission_pct'
  ) then
    update agents
    set commission_pct_exclusive = commission_pct,
        commission_pct_open      = commission_pct
    where commission_pct_exclusive = 10
      and commission_pct_open = 7;
  end if;
end $$;

alter table contracts
  add column if not exists exclusive boolean not null default true;


-- =============================================================
-- STEP 3 — VIEW PROVVIGIONI (con logica contrattuale completa)
-- =============================================================

drop view if exists contract_commissions;

create view contract_commissions as
select
  c.id          as contract_id,
  c.client_name,
  c.total_amount,
  c.start_date,
  c.end_date,
  c.status,
  c.exclusive,
  m.id          as model_id,
  m.first_name || ' ' || m.last_name as model_name,
  m.school_id,
  s.name        as school_name,
  m.agent_id,
  ag.name       as agent_name,

  -- durata contratto in mesi interi
  (
    extract(year  from age(c.end_date, c.start_date)) * 12 +
    extract(month from age(c.end_date, c.start_date))
  )::int as duration_months,

  -- ── SCUOLA ──────────────────────────────────────────────
  -- percentuale dalla tabella regole, in base alla durata
  coalesce(r.commission_pct, 0) as school_pct,
  round(c.total_amount * coalesce(r.commission_pct, 0) / 100, 2) as school_amount,

  -- ── AGENTE ──────────────────────────────────────────────
  -- mesi 1-12: percentuale dipende da tipo contratto (esclusiva o no)
  -- mese 13+:  sempre 5%
  case
    when (
      extract(year  from age(c.end_date, c.start_date)) * 12 +
      extract(month from age(c.end_date, c.start_date))
    ) <= 12
    then
      case
        when c.exclusive then coalesce(ag.commission_pct_exclusive, 10)
        else                  coalesce(ag.commission_pct_open, 7)
      end
    else 5
  end as agent_pct,

  round(
    c.total_amount *
    case
      when (
        extract(year  from age(c.end_date, c.start_date)) * 12 +
        extract(month from age(c.end_date, c.start_date))
      ) <= 12
      then
        case
          when c.exclusive then coalesce(ag.commission_pct_exclusive, 10)
          else                  coalesce(ag.commission_pct_open, 7)
        end
      else 5
    end / 100, 2
  ) as agent_amount,

  -- ── AGENZIA ─────────────────────────────────────────────
  -- residuo: 100% - scuola% - agente%
  100
    - coalesce(r.commission_pct, 0)
    - case
        when (
          extract(year  from age(c.end_date, c.start_date)) * 12 +
          extract(month from age(c.end_date, c.start_date))
        ) <= 12
        then
          case
            when c.exclusive then coalesce(ag.commission_pct_exclusive, 10)
            else                  coalesce(ag.commission_pct_open, 7)
          end
        else 5
      end
  as agency_pct,

  round(
    c.total_amount * (
      100
      - coalesce(r.commission_pct, 0)
      - case
          when (
            extract(year  from age(c.end_date, c.start_date)) * 12 +
            extract(month from age(c.end_date, c.start_date))
          ) <= 12
          then
            case
              when c.exclusive then coalesce(ag.commission_pct_exclusive, 10)
              else                  coalesce(ag.commission_pct_open, 7)
            end
          else 5
        end
    ) / 100, 2
  ) as agency_amount

from contracts c
join  models m  on m.id = c.model_id
left join schools s  on s.id = m.school_id
left join agents  ag on ag.id = m.agent_id
left join school_commission_rules r
  on  r.school_id = m.school_id
  and (
    extract(year  from age(c.end_date, c.start_date)) * 12 +
    extract(month from age(c.end_date, c.start_date))
  ) >= r.min_months
  and (
    r.max_months is null
    or (
      extract(year  from age(c.end_date, c.start_date)) * 12 +
      extract(month from age(c.end_date, c.start_date))
    ) <= r.max_months
  );


-- =============================================================
-- STEP 4 — ROW LEVEL SECURITY
-- =============================================================

alter table schools                  enable row level security;
alter table agents                   enable row level security;
alter table models                   enable row level security;
alter table contracts                enable row level security;
alter table school_commission_rules  enable row level security;

-- Rimuove policy precedenti (idempotente)
drop policy if exists "agency_all"   on schools;
drop policy if exists "agency_all"   on agents;
drop policy if exists "agency_all"   on models;
drop policy if exists "agency_all"   on contracts;
drop policy if exists "agency_all"   on school_commission_rules;
drop policy if exists "school_read"  on models;
drop policy if exists "school_read"  on contracts;
drop policy if exists "school_read"  on school_commission_rules;

-- ── Agenzia: accesso completo ────────────────────────────────
create policy "agency_all" on schools
  for all using (auth.jwt() ->> 'role' = 'agency');

create policy "agency_all" on agents
  for all using (auth.jwt() ->> 'role' = 'agency');

create policy "agency_all" on models
  for all using (auth.jwt() ->> 'role' = 'agency');

create policy "agency_all" on contracts
  for all using (auth.jwt() ->> 'role' = 'agency');

create policy "agency_all" on school_commission_rules
  for all using (auth.jwt() ->> 'role' = 'agency');

-- ── Scuola: sola lettura, solo i propri dati ────────────────
-- Vede solo i modelli associati alla sua scuola
create policy "school_read" on models
  for select using (
    auth.jwt() ->> 'role' = 'school'
    and school_id::text = auth.jwt() ->> 'school_id'
  );

-- Vede solo i contratti dei propri modelli
create policy "school_read" on contracts
  for select using (
    auth.jwt() ->> 'role' = 'school'
    and model_id in (
      select id from models
      where school_id::text = auth.jwt() ->> 'school_id'
    )
  );

-- Vede solo le proprie regole provvigione
create policy "school_read" on school_commission_rules
  for select using (
    auth.jwt() ->> 'role' = 'school'
    and school_id::text = auth.jwt() ->> 'school_id'
  );


-- =============================================================
-- STEP 5 — UTENTI
-- Crea gli utenti dall'interfaccia Supabase:
-- Authentication → Users → "Invite user"
-- Poi aggiorna i metadati con questo SQL:
-- =============================================================

-- UTENTE AGENZIA
-- update auth.users
-- set raw_user_meta_data = jsonb_build_object(
--   'role', 'agency'
-- )
-- where email = 'admin@tuaagenzia.it';

-- UTENTE SCUOLA
-- update auth.users
-- set raw_user_meta_data = jsonb_build_object(
--   'role',      'school',
--   'school_id', '<uuid della scuola>'   -- copia da: select id from schools where name = '...'
-- )
-- where email = 'scuola@example.it';


-- =============================================================
-- STEP 6 — DATI DI TEST (opzionale, per verificare tutto)
-- =============================================================

-- insert into schools (name) values ('Elite Model School');

-- insert into school_commission_rules (school_id, min_months, max_months, commission_pct)
-- select id,  0,  6, 8  from schools where name = 'Elite Model School' union all
-- select id,  7, 12, 5  from schools where name = 'Elite Model School' union all
-- select id, 13, 18, 3  from schools where name = 'Elite Model School';

-- insert into agents (name, commission_pct_exclusive, commission_pct_open)
-- values ('Marco Rossi', 10, 7);

-- insert into models (first_name, last_name, school_id, agent_id)
-- select 'Sofia', 'Ferrari',
--   (select id from schools where name = 'Elite Model School'),
--   (select id from agents  where name = 'Marco Rossi');

-- insert into contracts (model_id, client_name, total_amount, start_date, end_date, exclusive)
-- select id, 'Vogue Italia', 8000, '2026-01-01', '2026-09-30', true
-- from models where last_name = 'Ferrari';
