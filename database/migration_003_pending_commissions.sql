-- ================================================================
-- MIGRATION 003: Visualizzazione Provvigioni Incassate e Pendenti
-- ================================================================

BEGIN;

-- 1. Permessi RLS per visualizzazione profili e agenzie
DROP POLICY IF EXISTS "agent_read_self" ON agents;
CREATE POLICY "agent_read_self" ON agents
  FOR SELECT USING (
    auth_role() = 'agent' AND id::text = auth_agent_id()
  );

DROP POLICY IF EXISTS "school_read_self" ON schools;
CREATE POLICY "school_read_self" ON schools
  FOR SELECT USING (
    auth_role() = 'school' AND id::text = auth_school_id()
  );

DROP POLICY IF EXISTS "agencies_read_all_roles" ON agencies;
CREATE POLICY "agencies_read_all_roles" ON agencies
  FOR SELECT USING (
    auth_role() IN ('agency', 'school', 'agent')
  );

-- 2. Aggiornamento Vista payment_commissions (include sia incassati che pendenti)
DROP VIEW IF EXISTS payment_commissions CASCADE;

CREATE VIEW payment_commissions WITH (security_invoker = on) AS
SELECT
  py.id            AS payment_id,
  py.contract_id   AS job_id,
  py.contract_id,
  py.amount,
  py.amount        AS gross_amount,
  py.hunt_actual_amount,
  py.paid_at,
  py.created_at,
  CASE WHEN py.paid_at IS NOT NULL THEN 'paid' ELSE 'pending' END AS payment_status,
  py.notes         AS payment_notes,

  c.client_name,
  c.exclusive,
  c.first_job_date AS first_job_confirmed_at,
  c.first_job_date,
  c.status         AS contract_status,
  c.status         AS job_status,

  m.id             AS model_id,
  m.first_name || ' ' || m.last_name AS model_name,
  m.agency_id,
  m.school_id,
  s.name           AS school_name,
  s.giorgio        AS school_has_giorgio,
  m.agent_id,
  a.name           AS agency_name,
  a.hunt_pct       AS agency_hunt_pct,
  ag.name          AS agent_name,
  ag.is_giorgio_agent AS agent_is_giorgio_agent,
  
  giorgio_ag.id    AS giorgio_agent_id,
  giorgio_ag.name  AS giorgio_agent_name,

  round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) AS hunt_theoretical_amount,

  months_since_first_payment(m.id, coalesce(py.paid_at, py.created_at::date, current_date)) AS rel_month_from_first_payment,
  months_since_first_payment(m.id, coalesce(py.paid_at, py.created_at::date, current_date)) AS months_from_first_payment,
  
  CASE WHEN c.first_job_date IS NOT NULL
    THEN (
      extract(year  from age(coalesce(py.paid_at, py.created_at::date, current_date), c.first_job_date)) * 12 +
      extract(month from age(coalesce(py.paid_at, py.created_at::date, current_date), c.first_job_date))
    )::int
    ELSE NULL
  END AS months_from_first_job,
  
  total_paid_by_model(m.id, coalesce(py.paid_at, py.created_at::date, current_date)) AS cumulative_paid,

  CASE WHEN m.school_id IS NOT NULL
    THEN md_pct(
      coalesce(months_since_first_payment(m.id, coalesce(py.paid_at, py.created_at::date, current_date)), 0),
      total_paid_by_model(m.id, coalesce(py.paid_at, py.created_at::date, current_date))
    )
    ELSE 0
  END AS md_pct,

  round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) AS hunt_amount,

  round(
    round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) *
    CASE WHEN m.school_id IS NOT NULL
      THEN md_pct(
        coalesce(months_since_first_payment(m.id, coalesce(py.paid_at, py.created_at::date, current_date)), 0),
        total_paid_by_model(m.id, coalesce(py.paid_at, py.created_at::date, current_date))
      )
      ELSE 0
    END / 100
  , 2) AS md_amount,

  -- Calcolo percentuale agente (es. 10%, 7%, 5%)
  CASE WHEN m.agent_id IS NOT NULL
    THEN agent_pct(
      c.first_job_date, coalesce(py.paid_at, py.created_at::date, current_date), c.exclusive,
      coalesce(ag.commission_pct_exclusive, 10),
      coalesce(ag.commission_pct_open, 7),
      coalesce(ag.commission_pct_month13, 5)
    )
    ELSE 0
  END AS agent_pct,

  -- Calcolo provvigione agente in euro
  round(
    round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) *
    CASE WHEN m.agent_id IS NOT NULL
      THEN agent_pct(
        c.first_job_date, coalesce(py.paid_at, py.created_at::date, current_date), c.exclusive,
        coalesce(ag.commission_pct_exclusive, 10),
        coalesce(ag.commission_pct_open, 7),
        coalesce(ag.commission_pct_month13, 5)
      )
      ELSE 0
    END / 100
  , 2) AS agent_amount,

  CASE WHEN m.school_id IS NOT NULL AND coalesce(s.giorgio, false) = true
    THEN round(round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) * 0.20, 2)
    ELSE 0
  END AS giorgio_amount,

  ( round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2)
    - round(
        round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) *
        CASE WHEN m.school_id IS NOT NULL
          THEN md_pct(
            coalesce(months_since_first_payment(m.id, coalesce(py.paid_at, py.created_at::date, current_date)), 0),
            total_paid_by_model(m.id, coalesce(py.paid_at, py.created_at::date, current_date))
          )
          ELSE 0
        END / 100
      , 2)
    - round(
        round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) *
        CASE WHEN m.agent_id IS NOT NULL
          THEN agent_pct(
            c.first_job_date, coalesce(py.paid_at, py.created_at::date, current_date), c.exclusive,
            coalesce(ag.commission_pct_exclusive, 10),
            coalesce(ag.commission_pct_open, 7),
            coalesce(ag.commission_pct_month13, 5)
          )
          ELSE 0
        END / 100
      , 2)
    - CASE WHEN m.school_id IS NOT NULL AND coalesce(s.giorgio, false) = true
        THEN round(round(py.amount * coalesce(a.hunt_pct, 0) / 100, 2) * 0.20, 2)
        ELSE 0
      END
  ) AS hunt_models_net

FROM payments py
JOIN  contracts c  ON c.id  = py.contract_id
JOIN  models    m  ON m.id  = c.model_id
LEFT JOIN agencies a   ON a.id = m.agency_id
LEFT JOIN schools s   ON s.id  = m.school_id
LEFT JOIN agents  ag  ON ag.id = m.agent_id
LEFT JOIN agents  giorgio_ag ON giorgio_ag.is_giorgio_agent = true;

-- 3. Riapplica permessi
GRANT SELECT ON payment_commissions TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
