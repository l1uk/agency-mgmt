BEGIN;

-- 1. Rimuoviamo le vecchie view e funzioni dipendenti (il CASCADE pulirà i residui legacy)
DROP VIEW IF EXISTS payment_commissions CASCADE;
DROP VIEW IF EXISTS pending_incomes CASCADE;
DROP VIEW IF EXISTS contracts_expiring CASCADE;
DROP VIEW IF EXISTS contracts_due_for_expiry_notification CASCADE;
DROP VIEW IF EXISTS jobs CASCADE; -- Rimuove se è una tabella o una view

-- 2. Pulizia funzioni orfane
DROP FUNCTION IF EXISTS update_expiring_contracts() CASCADE;

COMMIT;

BEGIN;

-- 1. Creazione Tabella Agenzie (se manca)
CREATE TABLE IF NOT EXISTS agencies (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  hunt_pct   numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 2. Aggiornamento Agenti
ALTER TABLE agents ADD COLUMN IF NOT EXISTS commission_pct_month13 numeric(5,2) DEFAULT 5;

-- 3. Aggiornamento Modelli
ALTER TABLE models ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id);
ALTER TABLE models ADD COLUMN IF NOT EXISTS hunt_signed_at date;

-- 4. Aggiornamento Contratti (Rendiamo opzionali le vecchie date start/end)
ALTER TABLE contracts ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE contracts ALTER COLUMN end_date DROP NOT NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notes text;

-- 5. Aggiornamento Pagamenti
ALTER TABLE payments ADD COLUMN IF NOT EXISTS hunt_actual_amount numeric(10,2);
ALTER TABLE payments ALTER COLUMN paid_at DROP NOT NULL; -- Permette gli incassi pendenti

COMMIT;

BEGIN;

-- 1. Creazione VIEW JOBS (Compatibilità frontend)
CREATE OR REPLACE VIEW jobs AS
SELECT
  id, model_id, client_name, reference_amount, exclusive, status,
  first_job_date AS first_job_confirmed_at, first_job_date,
  notes, renewed_at, created_at
FROM contracts;

-- 2. Funzione di Validazione Pagamenti (senza controlli start/end date)
CREATE OR REPLACE FUNCTION validate_payment_contract_state()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM contracts WHERE id = new.contract_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract % not found', new.contract_id; END IF;
  IF v_status IN ('expired', 'cancelled') THEN
    RAISE EXCEPTION 'Cannot record payments on % contracts', v_status;
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS payments_validate_contract_state ON payments;
CREATE TRIGGER payments_validate_contract_state
BEFORE INSERT ON payments FOR EACH ROW EXECUTE FUNCTION validate_payment_contract_state();

-- 3. Definizione View Provvigioni (Versione Finale v3)
-- [Nota: Assicurati di includere qui la definizione completa di payment_commissions 
-- che calcola su agency_hunt_pct come abbiamo discusso]

COMMIT;

CREATE OR REPLACE FUNCTION agent_pct(
  p_first_job   date,
  p_paid_at     date,
  p_exclusive   boolean,
  p_pct_excl    numeric,
  p_pct_open    numeric,
  p_pct_month13 numeric  -- Il 6° parametro aggiunto nello schema v3
) RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN p_first_job IS NULL THEN 0
    WHEN (
      EXTRACT(year  FROM age(p_paid_at, p_first_job)) * 12 +
      EXTRACT(month FROM age(p_paid_at, p_first_job))
    )::int <= 12
    THEN CASE WHEN p_exclusive THEN p_pct_excl ELSE p_pct_open END
    ELSE p_pct_month13
  END
$$;
BEGIN;

-- ================================================================
-- VISTA 1: payment_commissions (Logica di calcolo provvigioni)
-- ================================================================
CREATE OR REPLACE VIEW payment_commissions AS
SELECT
  py.id            AS payment_id,
  py.contract_id   AS job_id,
  py.amount        AS gross_amount,
  py.hunt_actual_amount,
  py.paid_at,
  py.notes         AS payment_notes,
  c.client_name,
  c.exclusive,
  c.first_job_date,
  c.status         AS contract_status,
  m.id             AS model_id,
  m.first_name || ' ' || m.last_name AS model_name,
  a.name           AS agency_name,
  a.hunt_pct       AS agency_hunt_pct,
  s.name           AS school_name,
  s.giorgio        AS school_has_giorgio,
  ag.name          AS agent_name,

  -- 1. Quota spettante a Hunt dall'Agenzia Partner (Base di calcolo interna)
  ROUND(py.amount * COALESCE(a.hunt_pct, 0) / 100, 2) AS hunt_theoretical_amount,

  -- 2. Calcolo % MD (Scuola)
  CASE WHEN m.school_id IS NOT NULL THEN 
    md_pct(
      months_since_first_payment(m.id, py.paid_at),
      total_paid_by_model(m.id, py.paid_at)
    ) ELSE 0 END AS md_pct_val,

  -- 3. Importo MD (calcolato sulla quota Hunt)
  ROUND(
    (py.amount * COALESCE(a.hunt_pct, 0) / 100) * 
    CASE WHEN m.school_id IS NOT NULL THEN 
      md_pct(months_since_first_payment(m.id, py.paid_at), total_paid_by_model(m.id, py.paid_at)) 
    ELSE 0 END / 100, 2
  ) AS md_amount,

  -- 4. Quota Giorgio (20% della quota Hunt, solo se school.giorgio = true)
  CASE WHEN m.school_id IS NOT NULL AND COALESCE(s.giorgio, false) = true
    THEN ROUND((py.amount * COALESCE(a.hunt_pct, 0) / 100) * 0.20, 2)
    ELSE 0 END AS giorgio_amount,

  -- 5. Quota Agente (calcolata sulla quota Hunt)
  ROUND(
    (py.amount * COALESCE(a.hunt_pct, 0) / 100) * 
    CASE WHEN m.agent_id IS NOT NULL THEN 
      agent_pct(c.first_job_date, py.paid_at, c.exclusive, 
                COALESCE(ag.commission_pct_exclusive, 10), 
                COALESCE(ag.commission_pct_open, 7),
                COALESCE(ag.commission_pct_month13, 5))
    ELSE 0 END / 100, 2
  ) AS agent_amount,

  -- 6. HUNT NETTO (Quello che resta in tasca a Hunt Models HQ)
  ROUND(
    (py.amount * COALESCE(a.hunt_pct, 0) / 100) -
    ( -- sottrai MD
      (py.amount * COALESCE(a.hunt_pct, 0) / 100) * 
      CASE WHEN m.school_id IS NOT NULL THEN 
        md_pct(months_since_first_payment(m.id, py.paid_at), total_paid_by_model(m.id, py.paid_at)) 
      ELSE 0 END / 100
    ) -
    ( -- sottrai Agente
      (py.amount * COALESCE(a.hunt_pct, 0) / 100) * 
      CASE WHEN m.agent_id IS NOT NULL THEN 
        agent_pct(c.first_job_date, py.paid_at, c.exclusive, 
                  COALESCE(ag.commission_pct_exclusive, 10), 
                  COALESCE(ag.commission_pct_open, 7),
                  COALESCE(ag.commission_pct_month13, 5))
      ELSE 0 END / 100
    ) -
    ( -- sottrai Giorgio
      CASE WHEN m.school_id IS NOT NULL AND COALESCE(s.giorgio, false) = true
        THEN (py.amount * COALESCE(a.hunt_pct, 0) / 100) * 0.20
        ELSE 0 END
    ), 2
  ) AS hunt_models_net

FROM payments py
JOIN contracts c ON c.id = py.contract_id
JOIN models m ON m.id = c.model_id
JOIN agencies a ON a.id = m.agency_id -- JOIN per garantire agency_id obbligatorio
LEFT JOIN schools s ON s.id = m.school_id
LEFT JOIN agents ag ON ag.id = m.agent_id
WHERE py.paid_at IS NOT NULL;

-- ================================================================
-- VISTA 2: pending_incomes (Incassi attesi)
-- ================================================================
CREATE OR REPLACE VIEW pending_incomes AS
SELECT
  py.id AS payment_id,
  py.contract_id,
  py.amount AS gross_amount,
  py.notes AS payment_notes,
  py.created_at,
  m.first_name || ' ' || m.last_name AS model_name,
  a.name AS agency_name,
  (CURRENT_DATE - py.created_at::date) AS days_pending
FROM payments py
JOIN contracts c ON c.id = py.contract_id
JOIN models m ON m.id = c.model_id
JOIN agencies a ON a.id = m.agency_id
WHERE py.paid_at IS NULL;

COMMIT;

SELECT id, name, hunt_pct 
FROM agencies;

drop view if exists payment_commissions;

create view payment_commissions as
select
  py.id            as payment_id,
  py.contract_id   as job_id,
  py.contract_id,
  py.amount,
  py.amount        as gross_amount,
  py.hunt_actual_amount,
  py.paid_at,
  py.notes         as payment_notes,

  c.client_name,
  c.exclusive,
  c.first_job_date as first_job_confirmed_at,
  c.first_job_date,
  c.status         as contract_status,
  c.status         as job_status,

  m.id             as model_id,
  m.first_name || ' ' || m.last_name as model_name,
  m.agency_id,
  m.school_id,
  s.name           as school_name,
  s.giorgio        as school_has_giorgio,
  m.agent_id,
  a.name           as agency_name,
  a.hunt_pct       as agency_hunt_pct,
  ag.name          as agent_name,
  ag.is_giorgio_agent as agent_is_giorgio_agent,
  
  -- agente Giorgio (per modelli MD)
  giorgio_ag.id    as giorgio_agent_id,
  giorgio_ag.name  as giorgio_agent_name,

  round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) as hunt_theoretical_amount,

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

  -- calcoli basati sull'importo HUNT dell'agenzia (hunt_theoretical_amount)
  -- md_pct: percentuale MD come prima
  case when m.school_id is not null
    then md_pct(
      months_since_first_payment(m.id, py.paid_at),
      total_paid_by_model(m.id, py.paid_at)
    )
    else 0
  end as md_pct,

  -- importo HUNT teorico (su cui si calcolano MD/Agente/Giorgio)
  round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) as hunt_amount,

  -- quota MD calcolata su hunt_amount
  round(
    round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) *
    case when m.school_id is not null
      then md_pct(
        months_since_first_payment(m.id, py.paid_at),
        total_paid_by_model(m.id, py.paid_at)
      )
      else 0
    end / 100
  , 2) as md_amount,

  -- quota agente: percentuale e importo calcolato su hunt_amount
  case when m.agent_id is not null
    then agent_pct(
      c.first_job_date, py.paid_at, c.exclusive,
      coalesce(ag.commission_pct_exclusive, 10),
      coalesce(ag.commission_pct_open, 7),
      coalesce(ag.commission_pct_month13, 5)
    )
    else 0
  end as agent_pct,

  round(
    round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) *
    case when m.agent_id is not null
      then agent_pct(
        c.first_job_date, py.paid_at, c.exclusive,
        coalesce(ag.commission_pct_exclusive, 10),
        coalesce(ag.commission_pct_open, 7),
        coalesce(ag.commission_pct_month13, 5)
      )
      else 0
    end / 100
  , 2) as agent_amount,

  -- quota giorgio (20% dell'HUNT teorico), solo per modelli MD con giorgio=true
  case when m.school_id is not null and coalesce(s.giorgio, false) = true
    then round(round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) * 0.20, 2)
    else 0
  end as giorgio_amount,

  -- hunt models netto: hunt_amount meno MD/Agente/Giorgio
  ( round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2)
    - round(
        round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) *
        case when m.school_id is not null
          then md_pct(
            months_since_first_payment(m.id, py.paid_at),
            total_paid_by_model(m.id, py.paid_at)
          )
          else 0
        end / 100
      , 2)
    - round(
        round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) *
        case when m.agent_id is not null
          then agent_pct(
            c.first_job_date, py.paid_at, c.exclusive,
            coalesce(ag.commission_pct_exclusive, 10),
            coalesce(ag.commission_pct_open, 7),
            coalesce(ag.commission_pct_month13, 5)
          )
          else 0
        end / 100
      , 2)
    - case when m.school_id is not null and coalesce(s.giorgio, false) = true
        then round(round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) * 0.20, 2)
        else 0
      end
  ) as hunt_models_net

from payments py
join  contracts c  on c.id  = py.contract_id
join  models    m  on m.id  = c.model_id
left join agencies a   on a.id = m.agency_id
left join schools s   on s.id  = m.school_id
left join agents  ag  on ag.id = m.agent_id
left join agents  giorgio_ag on giorgio_ag.is_giorgio_agent = true
where py.paid_at is not null;

DROP VIEW IF EXISTS public.payment_commissions CASCADE;

CREATE VIEW public.payment_commissions AS
WITH base_calculations AS (
    SELECT 
        py.id AS payment_id,
        py.contract_id AS job_id,
        py.amount AS gross_amount,
        py.paid_at,
        py.notes AS payment_notes,
        c.client_name,
        c.exclusive,
        c.first_job_date AS job_date,
        c.status AS job_status,
        m.id AS model_id,
        (m.first_name || ' ' || m.last_name) AS model_name,
        a.name AS agency_name,
        COALESCE(a.hunt_pct, 0) / 100 AS hunt_factor,
        -- 1. Base Hunt Teorica
        ROUND(py.amount * (COALESCE(a.hunt_pct, 0) / 100), 2) AS hunt_amount,
        m.school_id,
        m.agent_id,
        s.giorgio AS school_has_giorgio,
        ag.commission_pct_exclusive,
        ag.commission_pct_open,
        ag.commission_pct_month13
    FROM public.payments py
    JOIN public.contracts c ON c.id = py.contract_id
    JOIN public.models m ON m.id = c.model_id
    LEFT JOIN public.agencies a ON a.id = m.agency_id
    LEFT JOIN public.schools s ON s.id = m.school_id
    LEFT JOIN public.agents ag ON ag.id = m.agent_id
    WHERE py.paid_at IS NOT NULL
),
commissions_step AS (
    SELECT 
        *,
        -- Calcolo del mese (t=0 dalla data job)
        (EXTRACT(year FROM age(paid_at, job_date)) * 12 + EXTRACT(month FROM age(paid_at, job_date)))::int AS job_month,
        -- 2. Quota MD
        ROUND(hunt_amount * (
            CASE WHEN school_id IS NOT NULL THEN 
                public.md_pct(
                    (EXTRACT(year FROM age(paid_at, job_date)) * 12 + EXTRACT(month FROM age(paid_at, job_date)))::int,
                    public.total_paid_by_model(model_id, paid_at)
                )
            ELSE 0 END
        ) / 100, 2) AS md_amount,
        -- 3. Quota Agente
        ROUND(hunt_amount * (
            CASE WHEN agent_id IS NOT NULL THEN 
                public.agent_pct(
                    job_date, paid_at, exclusive, 
                    COALESCE(commission_pct_exclusive, 10), 
                    COALESCE(commission_pct_open, 7), 
                    COALESCE(commission_pct_month13, 5)
                )
            ELSE 0 END
        ) / 100, 2) AS agent_amount
    FROM base_calculations
)
SELECT 
    *,
    -- Alias per il frontend (risolve il problema della colonna vuota)
    job_month AS rel_month_from_first_payment,
    -- 4. Quota Giorgio (20% del RESIDUO: Hunt - MD)
    CASE WHEN school_id IS NOT NULL AND COALESCE(school_has_giorgio, false) = true
        THEN ROUND((hunt_amount - md_amount) * 0.20, 2)
        ELSE 0 
    END AS giorgio_amount,
    -- 5. Hunt Netto Finale
    (
        hunt_amount 
        - md_amount 
        - agent_amount 
        - (CASE WHEN school_id IS NOT NULL AND COALESCE(school_has_giorgio, false) = true
            THEN ROUND((hunt_amount - md_amount) * 0.20, 2)
            ELSE 0 END)
    ) AS hunt_models_net
FROM commissions_step;

-- Permessi e Cache
GRANT SELECT ON public.payment_commissions TO anon, authenticated;
NOTIFY pgrst, 'reload schema';