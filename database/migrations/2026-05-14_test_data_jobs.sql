-- Test data for jobs migration (staging only)
-- Run after `2026-05-14_migrate_contracts_to_jobs.sql` on staging DB

begin;

-- Create minimal sample agency/school/agent/model
insert into agencies (id, name, hunt_pct, created_at)
values (gen_random_uuid(), 'Test Agency', 10, now())
on conflict do nothing;

insert into schools (id, name, giorgio, created_at)
values (gen_random_uuid(), 'MD', true, now())
on conflict do nothing;

insert into agents (id, name, commission_pct_exclusive, commission_pct_open, commission_pct_month13, created_at)
values (gen_random_uuid(), 'Marco Rossi', 10, 7, 5, now())
on conflict do nothing;

-- Insert a model for MD and a model with agent
insert into models (first_name, last_name, school_id, created_at)
select 'Sofia', 'Ferrari', id, now() from schools where name = 'MD'
on conflict do nothing;

insert into models (first_name, last_name, agent_id, created_at)
select 'Laura', 'Bianchi', id, now() from agents where name = 'Marco Rossi'
on conflict do nothing;

-- Insert a job for Sofia
insert into jobs (id, model_id, client_name, reference_amount, exclusive, first_job_date, created_at)
select gen_random_uuid(), m.id, 'Vogue Italia', 1000, true, '2026-01-15', now()
from models m where m.last_name = 'Ferrari'
on conflict do nothing;

-- Insert a pending payment (not paid)
insert into payments (id, contract_id, amount, paid_at, created_at)
select gen_random_uuid(), j.id, 1000, null, now()
from jobs j join models m on m.id = j.model_id where m.last_name = 'Ferrari'
on conflict do nothing;

commit;

-- Verification: run these selects manually on staging
-- select * from jobs limit 10;
-- select * from payments where contract_id in (select id from jobs) limit 10;
