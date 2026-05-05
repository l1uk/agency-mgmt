-- ================================================================
-- HUNT MODELS — schema v3
-- Eseguibile su DB vuoto: crea tutto dall'inizio
-- ================================================================


-- ================================================================
-- STEP 1 — TABELLE (tutte, in ordine di dipendenza)
-- ================================================================

create table if not exists schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  invited_at timestamptz,
  giorgio    boolean not null default false,
  created_at timestamptz default now()
);

alter table schools
  add column if not exists email text;

alter table schools
  add column if not exists invited_at timestamptz;

create unique index if not exists schools_email_unique_idx
  on schools (lower(email))
  where email is not null;

create table if not exists school_commission_rules (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid references schools(id) not null,
  min_months     int not null,
  max_months     int,
  commission_pct numeric(5,2) not null
);

create table if not exists agents (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  email                    text,
  invited_at               timestamptz,
  is_giorgio_agent         boolean not null default false,
  commission_pct_exclusive numeric(5,2) not null default 10,
  commission_pct_open      numeric(5,2) not null default 7,
  created_at               timestamptz default now()
);

alter table agents
  add column if not exists email text;

alter table agents
  add column if not exists invited_at timestamptz;

alter table agents
  add column if not exists is_giorgio_agent boolean not null default false;

create unique index if not exists agents_email_unique_idx
  on agents (lower(email))
  where email is not null;

create unique index if not exists agents_single_giorgio_agent_idx
  on agents (is_giorgio_agent)
  where is_giorgio_agent = true;

create table if not exists models (
  id         uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name  text not null,
  school_id  uuid references schools(id),
  agent_id   uuid references agents(id),
  notes      text,
  created_at timestamptz default now(),
  constraint school_agent_exclusive check (
    not (school_id is not null and agent_id is not null)
  )
);

create table if not exists contracts (
  id               uuid primary key default gen_random_uuid(),
  model_id         uuid references models(id) not null,
  client_name      text not null,
  reference_amount numeric(10,2),
  start_date       date not null,
  end_date         date not null,
  exclusive        boolean not null default true,
  status           text check (status in ('active','expiring','expired','cancelled'))
                   default 'active',
  first_job_date   date,
  renewed_at       timestamptz,
  created_at       timestamptz default now()
);

create table if not exists app_settings (
  id                        boolean primary key default true check (id = true),
  agency_notification_email text,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

insert into app_settings (id)
values (true)
on conflict (id) do nothing;

create table if not exists contract_notification_log (
  id                 uuid primary key default gen_random_uuid(),
  contract_id        uuid references contracts(id) not null,
  notification_type  text not null check (notification_type in ('expiry_warning', 'renewal_confirmation')),
  contract_end_date  date not null,
  sent_to            text not null,
  provider_message_id text,
  metadata           jsonb not null default '{}'::jsonb,
  sent_at            timestamptz not null default now(),
  created_at         timestamptz default now(),
  unique (contract_id, notification_type, contract_end_date)
);

update contracts
set status = case
  when end_date < current_date then 'expired'
  else 'active'
end
where status = 'renewed';

alter table contracts drop constraint if exists contracts_status_check;

alter table contracts
  add constraint contracts_status_check
  check (status in ('active','expiring','expired','cancelled'));

create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid references contracts(id) not null,
  amount      numeric(10,2) not null check (amount > 0),
  paid_at     date not null,
  notes       text,
  created_at  timestamptz default now()
);


-- ================================================================
-- STEP 1B — GUARD RAILS SU INCASSI / STATO CONTRATTO
-- ================================================================

create or replace function validate_payment_contract_state()
returns trigger language plpgsql as $$
declare
  v_status   text;
  v_end_date date;
begin
  select status, end_date
    into v_status, v_end_date
  from contracts
  where id = new.contract_id;

  if not found then
    raise exception 'Contract % not found', new.contract_id;
  end if;

  if v_status in ('expired', 'cancelled') then
    raise exception 'Cannot record payments on % contracts', v_status;
  end if;

  if v_end_date < current_date then
    raise exception 'Cannot record payments on expired contracts';
  end if;

  if new.paid_at > v_end_date then
    raise exception 'Payment date cannot be after contract end date';
  end if;

  return new;
end;
$$;

drop trigger if exists payments_validate_contract_state on payments;

create trigger payments_validate_contract_state
before insert on payments
for each row
execute function validate_payment_contract_state();


-- ================================================================
-- STEP 2 — FUNZIONI HELPER
-- ================================================================

create or replace function months_since_first_payment(
  p_model_id uuid,
  p_paid_at  date
) returns int language sql stable as $$
  select
    (extract(year  from age(p_paid_at, min(py.paid_at))) * 12 +
     extract(month from age(p_paid_at, min(py.paid_at))))::int
  from payments py
  join contracts c on c.id = py.contract_id
  where c.model_id = p_model_id
$$;

create or replace function total_paid_by_model(
  p_model_id uuid,
  p_up_to    date default current_date
) returns numeric language sql stable as $$
  select coalesce(sum(py.amount), 0)
  from payments py
  join contracts c on c.id = py.contract_id
  where c.model_id = p_model_id
    and py.paid_at <= p_up_to
$$;

create or replace function md_pct(
  p_rel_month  int,
  p_total_paid numeric
) returns numeric language sql stable as $$
  select case
    when p_rel_month between 0  and 6  then 8
    when p_rel_month between 7  and 12 then 5
    when p_rel_month between 13 and 18 then 3
    when p_rel_month between 19 and 24 and p_total_paid < 2000 then 5
    else 0
  end
$$;

create or replace function agent_pct(
  p_first_job date,
  p_paid_at   date,
  p_exclusive boolean,
  p_pct_excl  numeric,
  p_pct_open  numeric
) returns numeric language sql stable as $$
  select case
    when p_first_job is null then 0
    when (
      extract(year  from age(p_paid_at, p_first_job)) * 12 +
      extract(month from age(p_paid_at, p_first_job))
    )::int <= 12
    then case when p_exclusive then p_pct_excl else p_pct_open end
    else 5
  end
$$;


-- ================================================================
-- STEP 3 — VIEW PROVVIGIONI PER INCASSO
-- ================================================================

drop view if exists payment_commissions;

create view payment_commissions as
select
  py.id            as payment_id,
  py.contract_id,
  py.amount,
  py.paid_at,
  py.notes         as payment_notes,

  c.client_name,
  c.exclusive,
  c.first_job_date,
  c.status         as contract_status,

  m.id             as model_id,
  m.first_name || ' ' || m.last_name as model_name,
  m.school_id,
  s.name           as school_name,
  s.giorgio        as school_has_giorgio,
  m.agent_id,
  ag.name          as agent_name,
  ag.is_giorgio_agent as agent_is_giorgio_agent,
  
  -- agente Giorgio (per modelli MD)
  giorgio_ag.id    as giorgio_agent_id,
  giorgio_ag.name  as giorgio_agent_name,

  months_since_first_payment(m.id, py.paid_at) as rel_month_from_first_payment,
  months_since_first_payment(m.id, py.paid_at) as months_from_first_payment,
  
  case when c.first_job_date is not null
    then (
      extract(year  from age(py.paid_at, c.first_job_date)) * 12 +
      extract(month from age(py.paid_at, c.first_job_date))
    )::int
    else null
  end as months_from_first_job,
  
  total_paid_by_model(m.id, py.paid_at)        as cumulative_paid,

  -- quota MD
  case when m.school_id is not null
    then md_pct(
      months_since_first_payment(m.id, py.paid_at),
      total_paid_by_model(m.id, py.paid_at)
    )
    else 0
  end as md_pct,

  round(py.amount *
    case when m.school_id is not null
      then md_pct(
        months_since_first_payment(m.id, py.paid_at),
        total_paid_by_model(m.id, py.paid_at)
      )
      else 0
    end / 100, 2
  ) as md_amount,

  -- quota agente
  case when m.agent_id is not null
    then agent_pct(
      c.first_job_date, py.paid_at, c.exclusive,
      coalesce(ag.commission_pct_exclusive, 10),
      coalesce(ag.commission_pct_open, 7)
    )
    else 0
  end as agent_pct,

  round(py.amount *
    case when m.agent_id is not null
      then agent_pct(
        c.first_job_date, py.paid_at, c.exclusive,
        coalesce(ag.commission_pct_exclusive, 10),
        coalesce(ag.commission_pct_open, 7)
      )
      else 0
    end / 100, 2
  ) as agent_amount,

  -- residuo hunt models lordo
  round(py.amount * (
    100
    - case when m.school_id is not null
        then md_pct(
          months_since_first_payment(m.id, py.paid_at),
          total_paid_by_model(m.id, py.paid_at)
        )
        else 0
      end
    - case when m.agent_id is not null
        then agent_pct(
          c.first_job_date, py.paid_at, c.exclusive,
          coalesce(ag.commission_pct_exclusive, 10),
          coalesce(ag.commission_pct_open, 7)
        )
        else 0
      end
  ) / 100, 2) as hunt_models_gross,

  -- quota giorgio (20% del residuo, solo modelli MD con giorgio=true) → assegnata a Giorgio agente
  case when m.school_id is not null and coalesce(s.giorgio, false) = true
    then round(
      round(py.amount * (
        100 - md_pct(
          months_since_first_payment(m.id, py.paid_at),
          total_paid_by_model(m.id, py.paid_at)
        )
      ) / 100, 2) * 0.20
    , 2)
    else 0
  end as giorgio_amount,

  -- hunt models netto (dopo giorgio)
  round(py.amount * (
    100
    - case when m.school_id is not null
        then md_pct(
          months_since_first_payment(m.id, py.paid_at),
          total_paid_by_model(m.id, py.paid_at)
        )
        else 0
      end
    - case when m.agent_id is not null
        then agent_pct(
          c.first_job_date, py.paid_at, c.exclusive,
          coalesce(ag.commission_pct_exclusive, 10),
          coalesce(ag.commission_pct_open, 7)
        )
        else 0
      end
  ) / 100, 2)
  -
  case when m.school_id is not null and coalesce(s.giorgio, false) = true
    then round(
      round(py.amount * (
        100 - md_pct(
          months_since_first_payment(m.id, py.paid_at),
          total_paid_by_model(m.id, py.paid_at)
        )
      ) / 100, 2) * 0.20
    , 2)
    else 0
  end
  as hunt_models_net

from payments py
join  contracts c  on c.id  = py.contract_id
join  models    m  on m.id  = c.model_id
left join schools s   on s.id  = m.school_id
left join agents  ag  on ag.id = m.agent_id
left join agents  giorgio_ag on giorgio_ag.is_giorgio_agent = true;


-- ================================================================
-- STEP 4 — VIEW CONTRATTI IN SCADENZA
-- ================================================================

-- MODIFICA QUI: Aggiungiamo CASCADE per eliminare automaticamente le dipendenze
drop view if exists contracts_expiring cascade;

create view contracts_expiring as
select
  c.id, c.client_name, c.start_date, c.end_date, c.status,
  m.first_name || ' ' || m.last_name as model_name,
  (c.end_date - current_date) as days_remaining,
  case
    when (c.end_date - current_date) <= 30 then 'urgent'
    when (c.end_date - current_date) <= 60 then 'warning'
    else 'ok'
  end as expiry_level
from contracts c
join models m on m.id = c.model_id
where c.status in ('active','expiring')
  and (c.end_date - current_date) <= 60
order by c.end_date asc;

-- Questa riga può rimanere così, o puoi rimuoverla se usi CASCADE sopra
drop view if exists contracts_due_for_expiry_notification;

create view contracts_due_for_expiry_notification as
select
  ce.id as contract_id,
  ce.client_name,
  ce.start_date,
  ce.end_date,
  ce.status,
  ce.model_name,
  ce.days_remaining,
  ce.expiry_level,
  s.agency_notification_email
from contracts_expiring ce
cross join app_settings s
left join contract_notification_log nl
  on nl.contract_id = ce.id
 and nl.notification_type = 'expiry_warning'
 and nl.contract_end_date = ce.end_date
where ce.days_remaining >= 0
  and s.agency_notification_email is not null
  and nl.id is null;

  
-- ================================================================
-- STEP 5 — FUNZIONE AGGIORNAMENTO STATI CONTRATTI
-- ================================================================

create or replace function update_expiring_contracts()
returns void language plpgsql as $$
begin
  update contracts set status = 'expiring'
  where status = 'active'
    and end_date >= current_date
    and (end_date - current_date) <= 60;

  update contracts set status = 'expired'
  where status in ('active','expiring') and end_date < current_date;
end;
$$;


-- ================================================================
-- STEP 6 — ROW LEVEL SECURITY
-- ================================================================

alter table schools                  enable row level security;
alter table school_commission_rules  enable row level security;
alter table agents                   enable row level security;
alter table models                   enable row level security;
alter table contracts                enable row level security;
alter table app_settings             enable row level security;
alter table contract_notification_log enable row level security;
alter table payments                 enable row level security;

-- drop tutte le policy esistenti (sicuro su db vuoto)
do $$ declare r record; begin
  for r in
    select policyname, tablename from pg_policies
    where tablename in (
      'schools','school_commission_rules','agents',
      'models','contracts','app_settings','contract_notification_log','payments'
    )
  loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- helper: legge ruolo e id dal JWT (user_metadata)
create or replace function auth_role() returns text language sql stable as $$
  select (auth.jwt() -> 'user_metadata') ->> 'role'
$$;
create or replace function auth_school_id() returns text language sql stable as $$
  select (auth.jwt() -> 'user_metadata') ->> 'school_id'
$$;
create or replace function auth_agent_id() returns text language sql stable as $$
  select (auth.jwt() -> 'user_metadata') ->> 'agent_id'
$$;

-- agenzia: tutto
create policy "agency_all" on schools                 for all using (auth_role() = 'agency');
create policy "agency_all" on school_commission_rules for all using (auth_role() = 'agency');
create policy "agency_all" on agents                  for all using (auth_role() = 'agency');
create policy "agency_all" on models                  for all using (auth_role() = 'agency');
create policy "agency_all" on contracts               for all using (auth_role() = 'agency');
create policy "agency_all" on app_settings            for all using (auth_role() = 'agency');
create policy "agency_all" on contract_notification_log for all using (auth_role() = 'agency');
create policy "agency_all" on payments                for all using (auth_role() = 'agency');

-- scuola: sola lettura sui propri dati
create policy "school_read" on models
  for select using (
    auth_role() = 'school' and school_id::text = auth_school_id()
  );
create policy "school_read" on contracts
  for select using (
    auth_role() = 'school' and model_id in (
      select id from models where school_id::text = auth_school_id()
    )
  );
create policy "school_read" on payments
  for select using (
    auth_role() = 'school' and contract_id in (
      select c.id from contracts c
      join models m on m.id = c.model_id
      where m.school_id::text = auth_school_id()
    )
  );

-- agente: sola lettura sui propri dati
create policy "agent_read" on models
  for select using (
    auth_role() = 'agent' and agent_id::text = auth_agent_id()
  );
create policy "agent_read" on contracts
  for select using (
    auth_role() = 'agent' and model_id in (
      select id from models where agent_id::text = auth_agent_id()
    )
  );
create policy "agent_read" on payments
  for select using (
    auth_role() = 'agent' and contract_id in (
      select c.id from contracts c
      join models m on m.id = c.model_id
      where m.agent_id::text = auth_agent_id()
    )
  );


-- ================================================================
-- STEP 7 — CREARE UTENTI
-- 1. Supabase → Authentication → Users → Add user
-- 2. Inserisci email e password
-- 3. Esegui qui sotto per assegnare ruolo e id
-- ================================================================

-- Agenzia:
-- update auth.users
-- set raw_user_meta_data = jsonb_build_object('role', 'agency')
-- where email = 'admin@huntmodels.it';

-- Scuola MD:
-- Prima inserisci la scuola e copia l'uuid:
--   select id, name from schools;
-- update auth.users
-- set raw_user_meta_data = jsonb_build_object(
--   'role',      'school',
--   'school_id', 'INCOLLA-UUID-SCUOLA'
-- )
-- where email = 'md@scuola.it';

-- Agente:
-- Prima inserisci l'agente e copia l'uuid:
--   select id, name from agents;
-- update auth.users
-- set raw_user_meta_data = jsonb_build_object(
--   'role',     'agent',
--   'agent_id', 'INCOLLA-UUID-AGENTE'
-- )
-- where email = 'agente@example.it';


-- ================================================================
-- STEP 8 — DATI DI TEST (decommenta tutto il blocco per usarli)
-- ================================================================

-- insert into schools (name, giorgio) values ('MD', true);
--
-- insert into school_commission_rules (school_id, min_months, max_months, commission_pct)
-- select id,  0,  6, 8  from schools where name = 'MD' union all
-- select id,  7, 12, 5  from schools where name = 'MD' union all
-- select id, 13, 18, 3  from schools where name = 'MD';
--
-- insert into agents (name, commission_pct_exclusive, commission_pct_open)
-- values ('Marco Rossi', 10, 7);
--
-- -- modello da MD (no agente)
-- insert into models (first_name, last_name, school_id)
-- select 'Sofia', 'Ferrari', id from schools where name = 'MD';
--
-- -- modello con agente (no scuola)
-- insert into models (first_name, last_name, agent_id)
-- select 'Laura', 'Bianchi', id from agents where name = 'Marco Rossi';
--
-- -- modello solo agenzia
-- insert into models (first_name, last_name) values ('Paolo', 'Verdi');
--
-- -- contratto per Sofia (MD)
-- insert into contracts (model_id, client_name, start_date, end_date, exclusive, first_job_date)
-- select id, 'Vogue Italia', '2026-01-01', '2028-01-01', true, '2026-01-15'
-- from models where last_name = 'Ferrari';
--
-- -- incasso mese 1
-- insert into payments (contract_id, amount, paid_at)
-- select c.id, 1000, '2026-02-01'
-- from contracts c join models m on m.id = c.model_id
-- where m.last_name = 'Ferrari';
--
-- -- verifica: deve mostrare md_pct=8, giorgio_amount=147.2, hunt_models_net=588.8
-- select model_name, amount, md_pct, md_amount, giorgio_amount, hunt_models_net
-- from payment_commissions;
