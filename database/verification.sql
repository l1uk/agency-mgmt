-- ================================================================
-- HUNT MODELS — Validation Suite v3 (data-agnostic + guardie)
-- ================================================================

WITH

-- Guardia globale: la view deve avere dati
guard AS (
  SELECT count(*) AS total_rows FROM payment_commissions
),

-- T1: Invariante matematica
t1 AS (
  SELECT 'T1 · Coerenza matematica: somma quote = totale' AS test,
    CASE 
      WHEN (SELECT total_rows FROM guard) = 0 THEN '⚠️ SKIP (view vuota)'
      WHEN count(*) = 0 THEN '✅ PASS' 
      ELSE '❌ FAIL' 
    END AS esito,
    count(*) || ' righe con somma errata' AS dettaglio
  FROM payment_commissions
  WHERE round(md_amount + agent_amount + giorgio_amount + hunt_models_net, 2)
        != round(amount, 2)
),

-- T2: Solo Hunt → zero quote terzi
t2 AS (
  SELECT 'T2 · Solo Hunt: nessuna quota terzi' AS test,
    CASE WHEN count(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
    count(*) || ' pagamenti con quote non dovute'
  FROM payment_commissions
  WHERE school_id IS NULL AND agent_id IS NULL
    AND (md_amount > 0 OR agent_amount > 0 OR giorgio_amount > 0)
),

-- T3/T4/T5: MD fasce — con guardia su esistenza righe
t3 AS (
  SELECT 'T3 · MD fascia 0-6 = 8%' AS test,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM payment_commissions 
        WHERE school_id IS NOT NULL AND months_from_first_payment BETWEEN 0 AND 6
      ) THEN '⚠️ SKIP (nessun dato nella fascia)'
      WHEN count(*) = 0 THEN '✅ PASS' 
      ELSE '❌ FAIL' 
    END,
    count(*) || ' pagamenti con pct errata'
  FROM payment_commissions
  WHERE school_id IS NOT NULL
    AND months_from_first_payment BETWEEN 0 AND 6
    AND round(md_pct::numeric, 2) != 8.00
),

t4 AS (
  SELECT 'T4 · MD fascia 7-12 = 5%' AS test,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM payment_commissions 
        WHERE school_id IS NOT NULL AND months_from_first_payment BETWEEN 7 AND 12
      ) THEN '⚠️ SKIP (nessun dato nella fascia)'
      WHEN count(*) = 0 THEN '✅ PASS' 
      ELSE '❌ FAIL' 
    END,
    count(*) || ' pagamenti con pct errata'
  FROM payment_commissions
  WHERE school_id IS NOT NULL
    AND months_from_first_payment BETWEEN 7 AND 12
    AND round(md_pct::numeric, 2) != 5.00
),

t5 AS (
  SELECT 'T5 · MD fascia 13-18 = 3%' AS test,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM payment_commissions 
        WHERE school_id IS NOT NULL AND months_from_first_payment BETWEEN 13 AND 18
      ) THEN '⚠️ SKIP (nessun dato nella fascia)'
      WHEN count(*) = 0 THEN '✅ PASS' 
      ELSE '❌ FAIL' 
    END,
    count(*) || ' pagamenti con pct errata'
  FROM payment_commissions
  WHERE school_id IS NOT NULL
    AND months_from_first_payment BETWEEN 13 AND 18
    AND round(md_pct::numeric, 2) != 3.00
),

-- T6: Proroga MD — ancorata al paid_at, non a CURRENT_DATE
t6 AS (
  SELECT 'T6 · MD proroga 19-24m se totale < €2000 = 5%' AS test,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM payment_commissions 
        WHERE school_id IS NOT NULL 
          AND cumulative_paid < 2000 
          AND months_from_first_payment BETWEEN 19 AND 24
      ) THEN '⚠️ SKIP (nessun dato in proroga)'
      WHEN count(*) = 0 THEN '✅ PASS' 
      ELSE '❌ FAIL' 
    END,
    count(*) || ' pagamenti con pct errata'
  FROM payment_commissions
  WHERE school_id IS NOT NULL
    AND cumulative_paid < 2000
    AND months_from_first_payment BETWEEN 19 AND 24
    AND round(md_pct::numeric, 2) != 5.00
),

-- T7: MD stop dopo 18m se totale >= €2000
t7 AS (
  SELECT 'T7 · MD stop dopo 18m se totale >= €2000 = 0%' AS test,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM payment_commissions 
        WHERE school_id IS NOT NULL 
          AND cumulative_paid >= 2000 
          AND months_from_first_payment > 18
      ) THEN '⚠️ SKIP (nessun dato oltre 18m con budget sforato)'
      WHEN count(*) = 0 THEN '✅ PASS' 
      ELSE '❌ FAIL' 
    END,
    count(*) || ' pagamenti con MD > 0 non dovuto'
  FROM payment_commissions
  WHERE school_id IS NOT NULL
    AND cumulative_paid >= 2000
    AND months_from_first_payment > 18
    AND md_amount > 0
),

-- T8: Giorgio presente su MD con accordo
t8 AS (
  SELECT 'T8 · Giorgio presente su tutti i pagamenti MD con accordo' AS test,
    CASE WHEN count(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
    count(*) || ' pagamenti MD senza Giorgio'
  FROM payment_commissions
  WHERE md_amount > 0 
    AND coalesce(school_has_giorgio, false) = true 
    AND giorgio_amount = 0
),

-- T9: Giorgio assente su non-MD
t9 AS (
  SELECT 'T9 · Giorgio assente su non-MD o scuola senza accordo' AS test,
    CASE WHEN count(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
    count(*) || ' pagamenti con Giorgio non dovuto'
  FROM payment_commissions
  WHERE coalesce(school_has_giorgio, false) = false 
    AND giorgio_amount > 0
),

-- T10: Giorgio = 20% residuo
t10 AS (
  SELECT 'T10 · Giorgio = 25% del residuo (amount - md_amount)' AS test,
    CASE WHEN count(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
    count(*) || ' pagamenti con Giorgio calcolato male'
  FROM payment_commissions
  WHERE md_amount > 0 
    AND coalesce(school_has_giorgio, false) = true
    AND round(giorgio_amount, 2) != round((amount - md_amount) * 0.20, 2)
),

-- T11: Hunt net corretto su MD con Giorgio
t11 AS (
  SELECT 'T11 · Hunt net = 80% residuo su MD con Giorgio' AS test,
    CASE WHEN count(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
    count(*) || ' pagamenti con Hunt net errato'
  FROM payment_commissions
  WHERE md_amount > 0 
    AND coalesce(school_has_giorgio, false) = true
    AND round(hunt_models_net, 2) != round((amount - md_amount) * 0.80, 2)
),

-- T12: Hunt net = residuo pieno su MD senza Giorgio
t12 AS (
  SELECT 'T12 · Hunt net = 100% residuo su MD senza Giorgio' AS test,
    CASE WHEN count(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
    count(*) || ' pagamenti con Hunt net errato'
  FROM payment_commissions
  WHERE md_amount > 0 
    AND coalesce(school_has_giorgio, false) = false
    AND round(hunt_models_net, 2) != round(amount - md_amount, 2)
),

-- T13: Agente esclusivo 0-12m = 10%
t13 AS (
  SELECT 'T13 · Agente esclusivo 0-12m = 10%' AS test,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM payment_commissions 
        WHERE agent_id IS NOT NULL AND exclusive = true AND months_from_first_job BETWEEN 0 AND 12
      ) THEN '⚠️ SKIP'
      WHEN count(*) = 0 THEN '✅ PASS' 
      ELSE '❌ FAIL' 
    END,
    count(*) || ' pagamenti con pct errata'
  FROM payment_commissions
  WHERE agent_id IS NOT NULL
    AND exclusive = true
    AND months_from_first_job BETWEEN 0 AND 12
    AND round(agent_pct::numeric, 2) != 10.00
),

-- T14: Agente non esclusivo 0-12m = 7%
t14 AS (
  SELECT 'T14 · Agente non-esclusivo 0-12m = 7%' AS test,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM payment_commissions 
        WHERE agent_id IS NOT NULL AND exclusive = false AND months_from_first_job BETWEEN 0 AND 12
      ) THEN '⚠️ SKIP'
      WHEN count(*) = 0 THEN '✅ PASS' 
      ELSE '❌ FAIL' 
    END,
    count(*) || ' pagamenti con pct errata'
  FROM payment_commissions
  WHERE agent_id IS NOT NULL
    AND exclusive = false
    AND months_from_first_job BETWEEN 0 AND 12
    AND round(agent_pct::numeric, 2) != 7.00
),

-- T15: Agente oltre 12m = 5% flat (esclusivo o no)
t15 AS (
  SELECT 'T15 · Agente oltre 12m = 5% flat' AS test,
    CASE 
      WHEN NOT EXISTS (
        SELECT 1 FROM payment_commissions 
        WHERE agent_id IS NOT NULL AND months_from_first_job > 12
      ) THEN '⚠️ SKIP'
      WHEN count(*) = 0 THEN '✅ PASS' 
      ELSE '❌ FAIL' 
    END,
    count(*) || ' pagamenti con pct errata'
  FROM payment_commissions
  WHERE agent_id IS NOT NULL
    AND months_from_first_job > 12
    AND round(agent_pct::numeric, 2) != 5.00
),

-- T16: Contratti expired, nessun pagamento post end_date
t16 AS (
  SELECT 'T16 · Nessun pagamento post-scadenza su contratti expired' AS test,
    CASE WHEN count(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
    count(*) || ' pagamenti post-scadenza'
  FROM payment_commissions pc
  JOIN contracts c ON c.id = pc.contract_id
  WHERE pc.contract_status = 'expired'
    AND pc.paid_at > c.end_date
),

-- T17: Vincolo esclusività nel DB
t17 AS (
  SELECT 'T17 · Nessun modello con scuola E agente' AS test,
    CASE WHEN count(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END,
    count(*) || ' modelli con entrambi'
  FROM models
  WHERE school_id IS NOT NULL AND agent_id IS NOT NULL
)

SELECT test, esito, dettaglio FROM t1
UNION ALL SELECT * FROM t2
UNION ALL SELECT * FROM t3
UNION ALL SELECT * FROM t4
UNION ALL SELECT * FROM t5
UNION ALL SELECT * FROM t6
UNION ALL SELECT * FROM t7
UNION ALL SELECT * FROM t8
UNION ALL SELECT * FROM t9
UNION ALL SELECT * FROM t10
UNION ALL SELECT * FROM t11
UNION ALL SELECT * FROM t12
UNION ALL SELECT * FROM t13
UNION ALL SELECT * FROM t14
UNION ALL SELECT * FROM t15
UNION ALL SELECT * FROM t16
UNION ALL SELECT * FROM t17
ORDER BY test;