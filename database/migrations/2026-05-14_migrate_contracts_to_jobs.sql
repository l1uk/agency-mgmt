-- Migration: contracts -> jobs
-- Date: 2026-05-14
-- Usage: review locally, then run on staging. Requires backup before running on production.

begin;

-- Safety: ensure jobs table does not already exist
create table if not exists jobs (
  id               uuid primary key,
  model_id         uuid references models(id) not null,
  client_name      text not null,
  reference_amount numeric(10,2),
  exclusive        boolean not null default true,
  status           text check (status in ('active','expired','cancelled')) default 'active',
  first_job_date   date,
  notes            text,
  renewed_at       timestamptz,
  created_at       timestamptz default now()
);

-- Enable Row Level Security immediately and add baseline policies
alter table jobs enable row level security;

-- Mirror existing contracts policies: agency full access
create policy "agency_all" on jobs for all using (auth_role() = 'agency');

-- school: read only on jobs for models belonging to the school
create policy "school_read" on jobs
  for select using (
    auth_role() = 'school' and model_id in (
      select id from models where school_id::text = auth_school_id()
    )
  );

-- agent: read only on jobs for models belonging to the agent
create policy "agent_read" on jobs
  for select using (
    auth_role() = 'agent' and model_id in (
      select id from models where agent_id::text = auth_agent_id()
    )
  );

-- Note: adjust/extend policies (insert/update/delete) as needed before exposing table to API.

-- Copy data from contracts preserving ids
insert into jobs (id, model_id, client_name, reference_amount, exclusive, status, first_job_date, notes, renewed_at, created_at)
select id, model_id, client_name, reference_amount, exclusive, status, first_job_date, notes, renewed_at, created_at
from contracts;

-- Repoint FK constraints that referenced contracts to jobs.
-- Payments table: currently `contract_id` references contracts(id). We'll change the FK target to jobs(id).
alter table payments
  drop constraint if exists payments_contract_id_fkey;
alter table payments
  add constraint payments_contract_id_fkey foreign key (contract_id) references jobs(id);

-- contract_notification_log.contract_id -> jobs
alter table contract_notification_log
  drop constraint if exists contract_notification_log_contract_id_fkey;
alter table contract_notification_log
  add constraint contract_notification_log_contract_id_fkey foreign key (contract_id) references jobs(id);

-- Create compatibility view of old `contracts` data for reference/rollback
drop view if exists contracts_old cascade;
create view contracts_old as
select * from contracts;

-- Optional verification queries (run after migration):
-- 1) Counts must match
--    select count(*) from contracts; select count(*) from jobs;
-- 2) Payments must reference existing jobs
--    select p.id from payments p left join jobs j on j.id = p.contract_id where j.id is null;

-- NOTE: This script keeps the original `contracts` table untouched (we copied rows into `jobs`).
-- Next controlled step (manual):
--  - Update application and edge functions to use `jobs` as primary table.
--  - After full verification, either drop `contracts` or keep it as archive.

commit;

-- ROLLBACK (manual): if something went wrong, you may restore from backups or truncate jobs and re-copy
--   begin; truncate table jobs; insert into jobs (...) select ... from contracts; commit;
