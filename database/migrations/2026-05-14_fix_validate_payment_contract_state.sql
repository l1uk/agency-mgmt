-- Fix trigger: make validate_payment_contract_state cover both `contracts` and `jobs`
-- Date: 2026-05-14

begin;

create or replace function validate_payment_contract_state()
returns trigger language plpgsql as $$
declare
  v_status   text;
  v_end_date date;
begin
  -- Try contracts first (backwards compatibility)
  select status, end_date
    into v_status, v_end_date
  from contracts
  where id = new.contract_id;

  -- If not found in contracts, try jobs (new table)
  if not found then
    select status, end_date
      into v_status, v_end_date
    from jobs
    where id = new.contract_id;
  end if;

  if not found then
    raise exception 'Contract % not found', new.contract_id;
  end if;

  if v_status in ('expired', 'cancelled') then
    raise exception 'Cannot record payments on % contracts', v_status;
  end if;

  if v_end_date < current_date then
    raise exception 'Cannot record payments on expired contracts';
  end if;

  if new.paid_at is not null and new.paid_at > v_end_date then
    raise exception 'Payment date cannot be after contract end date';
  end if;

  return new;
end;
$$;

-- Recreate trigger (no-op if already exists with same name)
drop trigger if exists payments_validate_contract_state on payments;

create trigger payments_validate_contract_state
before insert on payments
for each row
execute function validate_payment_contract_state();

commit;
