-- Remove end_date checks from validate_payment_contract_state
-- This version only validates contract/job existence and status (no end_date comparisons)

begin;

create or replace function validate_payment_contract_state()
returns trigger language plpgsql as $$
declare
  v_status text;
begin
  -- Try contracts first for compatibility
  select status into v_status from contracts where id = new.contract_id;

  if not found then
    select status into v_status from jobs where id = new.contract_id;
  end if;

  if not found then
    raise exception 'Contract % not found', new.contract_id;
  end if;

  if v_status in ('expired', 'cancelled') then
    raise exception 'Cannot record payments on % contracts', v_status;
  end if;

  return new;
end;
$$;

drop trigger if exists payments_validate_contract_state on payments;
create trigger payments_validate_contract_state
before insert on payments
for each row
execute function validate_payment_contract_state();

commit;
