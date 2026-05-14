-- ================================================================
-- TEST_DATA_V14_WITH_PENDING.SQL
-- ================================================================

-- STEP 0 — CLEANUP DINAMICO
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'contract_notification_log') THEN DELETE FROM contract_notification_log; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'payments') THEN DELETE FROM payments; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'contracts') THEN DELETE FROM contracts; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'models') THEN DELETE FROM models; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'school_commission_rules') THEN DELETE FROM school_commission_rules; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agents') THEN DELETE FROM agents; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'schools') THEN DELETE FROM schools; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'agencies') THEN DELETE FROM agencies; END IF;
END $$;

-- STEP 1 — AGENZIE (Obbligatorie)
INSERT INTO agencies (id, name, hunt_pct) VALUES 
  ('aa0e8400-e29b-41d4-a716-446655440000', 'Hunt Models HQ', 100.00),
  ('aa0e8400-e29b-41d4-a716-446655440001', 'Elite Partners', 20.00);

-- STEP 2 — SCUOLE E AGENTI
INSERT INTO schools (id, name, giorgio) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Fashion Academy Milano', true);

INSERT INTO agents (id, name, commission_pct_exclusive, commission_pct_open) VALUES
  ('660e8400-e29b-41d4-a716-446655440000', 'Marco Rossi', 10, 7);

-- STEP 3 — MODELLI
INSERT INTO models (id, first_name, last_name, agency_id, school_id, agent_id) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', 'Valentina', 'Direct', 'aa0e8400-e29b-41d4-a716-446655440000', null, null),
  ('770e8400-e29b-41d4-a716-446655440002', 'Elena', 'Academy', 'aa0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', null);

-- STEP 4 — CONTRATTI
INSERT INTO contracts (id, model_id, client_name, reference_amount, exclusive, status, first_job_date) VALUES
  ('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Vogue Italia', 5000, true, 'active', '2026-01-01'),
  ('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'Prada HQ', 8000, true, 'active', '2024-02-01');

-- STEP 5 — PAGAMENTI EFFETTUATI (paid_at presente)
INSERT INTO payments (id, contract_id, amount, paid_at, notes) VALUES
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440001', 1200.00, '2026-02-15', 'Saldo Gennaio - Valentina'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440002', 3000.00, '2024-03-10', 'Acconto Prada - Elena');

-- STEP 6 — PAGAMENTI PENDENTI (paid_at NULL)
-- Questi appariranno nella vista 'pending_incomes'
INSERT INTO payments (id, contract_id, amount, paid_at, notes, created_at) VALUES
  -- Incasso atteso per Valentina (Modella Hunt)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440001', 850.00, null, 'In attesa di bonifico da Vogue', now() - interval '5 days'),
  
  -- Incasso atteso per Elena (Modella MD / Partner)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440002', 2000.00, null, 'Fattura inviata a Prada, pagamento a 30gg', now() - interval '10 days'),
  
  -- Altro incasso pendente vecchio (per testare i "days_pending")
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440001', 500.00, null, 'Sollecito necessario', now() - interval '45 days');

-- STEP 7 — SETTINGS
UPDATE app_settings SET agency_notification_email = 'finance@huntmodels.it' WHERE id = true;