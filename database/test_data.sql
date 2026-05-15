-- ================================================================
-- TEST_DATA_V15_MASSIVE.SQL
-- ================================================================

-- STEP 0 — CLEANUP TOTALE
DO $$ 
BEGIN
    DELETE FROM contract_notification_log;
    DELETE FROM payments;
    DELETE FROM contracts;
    DELETE FROM models;
    DELETE FROM school_commission_rules;
    DELETE FROM agents;
    DELETE FROM schools;
    DELETE FROM agencies;
END $$;

-- STEP 1 — AGENZIE (STRUTTURA PARTNER)
INSERT INTO agencies (id, name, hunt_pct) VALUES 
  ('aa0e8400-e29b-41d4-a716-446655440000', 'Hunt Models HQ', 100.00),
  ('aa0e8400-e29b-41d4-a716-446655440001', 'Parisian Scout Group', 20.00),
  ('aa0e8400-e29b-41d4-a716-446655440002', 'London Elite Management', 15.00),
  ('aa0e8400-e29b-41d4-a716-446655440003', 'Milan Discovery', 50.00);

-- STEP 2 — SCUOLE (MD)
INSERT INTO schools (id, name, giorgio) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Fashion Academy Milano', true),
  ('550e8400-e29b-41d4-a716-446655440001', 'International Scouting Rome', false),
  ('550e8400-e29b-41d4-a716-446655440002', 'Global Model School', true);

-- STEP 3 — AGENTI (DIVERSE PERCENTUALI)
INSERT INTO agents (id, name, commission_pct_exclusive, commission_pct_open, commission_pct_month13) VALUES
  ('660e8400-e29b-41d4-a716-446655440000', 'Marco Rossi', 10, 7, 5),
  ('660e8400-e29b-41d4-a716-446655440001', 'Sophie Laurent', 12, 8, 6),
  ('660e8400-e29b-41d4-a716-446655440002', 'James Smith', 10, 5, 5),
  ('660e8400-e29b-41d4-a716-44665544000f', 'Giorgio Proxy', 0, 0, 0); -- Agente interno Giorgio

-- STEP 4 — REGOLE SCUOLE (FASCE)
INSERT INTO school_commission_rules (school_id, min_months, max_months, commission_pct) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 0, 6, 8.00),
  ('550e8400-e29b-41d4-a716-446655440000', 7, 12, 5.00),
  ('550e8400-e29b-41d4-a716-446655440000', 13, 18, 3.00),
  ('550e8400-e29b-41d4-a716-446655440002', 0, 6, 8.00),
  ('550e8400-e29b-41d4-a716-446655440002', 7, 12, 5.00),
  ('550e8400-e29b-41d4-a716-446655440002', 13, 18, 3.00),
  ('550e8400-e29b-41d4-a716-446655440001', 0, 6, 8.00),
  ('550e8400-e29b-41d4-a716-446655440001', 7, 12, 5.00),
  ('550e8400-e29b-41d4-a716-446655440001', 13, 18, 3.00);

-- STEP 5 — MODELLI (CASISTICHE VARIE)
INSERT INTO models (id, first_name, last_name, agency_id, school_id, agent_id, hunt_signed_at) VALUES
  ('770e8400-e29b-41d4-a716-446655440001', 'Valentina', 'Direct', 'aa0e8400-e29b-41d4-a716-446655440000', null, null, null),
  ('770e8400-e29b-41d4-a716-446655440002', 'Elena', 'Academy', 'aa0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', null, '2024-01-01'),
  ('770e8400-e29b-41d4-a716-446655440003', 'Sara', 'AgentExclusive', 'aa0e8400-e29b-41d4-a716-446655440000', null, '660e8400-e29b-41d4-a716-446655440000', null),
  ('770e8400-e29b-41d4-a716-446655440004', 'Lukas', 'International', 'aa0e8400-e29b-41d4-a716-446655440002', null, '660e8400-e29b-41d4-a716-446655440001', '2023-06-01'),
  ('770e8400-e29b-41d4-a716-446655440005', 'Marta', 'NoGiorgioSchool', 'aa0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', null, null),
  ('770e8400-e29b-41d4-a716-446655440006', 'Alessio', 'GlobalMD', 'aa0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', null, '2025-01-01');

-- STEP 6 — CONTRATTI
INSERT INTO contracts (id, model_id, client_name, reference_amount, exclusive, status, first_job_date) VALUES
  ('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Vogue Italia', 5000, true, 'active', '2026-01-15'),
  ('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'Prada HQ', 12000, true, 'active', '2024-02-01'),
  ('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', 'Zara World', 3000, true, 'active', '2026-03-01'),
  ('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440004', 'Burberry UK', 15000, false, 'active', '2023-07-01'),
  ('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440005', 'Diesel', 4000, true, 'active', '2026-02-15'),
  ('990e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440006', 'Armani', 20000, true, 'active', '2025-02-01');

-- STEP 7 — PAGAMENTI REALI (PER TESTARE COMMISSIONI)
INSERT INTO payments (id, contract_id, amount, paid_at, notes) VALUES
  -- Valentina (Direct): Hunt 100%
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440001', 2000.00, '2026-02-20', 'Saldo Valentina'),
  
  -- Elena (Academy + Partner): Calcolo a cascata su quota 20%
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440002', 5000.00, '2024-03-01', 'Elena Mese 1 (Fascia 8%)'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440002', 3000.00, '2025-05-15', 'Elena Mese 15 (Fascia 3%)'),
  
  -- Sara (Agente): Provvigione 10% su quota 100%
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440003', 1000.00, '2026-04-01', 'Sara Lavoro Esclusivo'),
  
  -- Lukas (Agente + Partner + Oltre 12 mesi): Provvigione Mese 13 (6%) su quota 15%
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440004', 10000.00, '2026-01-10', 'Lukas Storico (Mese 13+)'),
  
  -- Marta (Scuola No Giorgio + Partner 50%): Scuola 8%, No Giorgio 20%
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440005', 2000.00, '2026-03-15', 'Marta Scuola No Giorgio'),
  
  -- Alessio (Global MD): Scuola 10% fissa, Giorgio 20%
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440006', 5000.00, '2025-03-10', 'Alessio MD Global');

-- STEP 8 — PAGAMENTI PENDENTI (PER TESTARE PENDING_INCOMES)
INSERT INTO payments (id, contract_id, amount, paid_at, notes, created_at) VALUES
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440001', 500.00, null, 'Pendente da 3 giorni', now() - interval '3 days'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440002', 4000.00, null, 'Pendente da 20 giorni', now() - interval '20 days'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440004', 1500.00, null, 'Pendente critico (60gg)', now() - interval '60 days'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440006', 7000.00, null, 'In attesa bonifico Armani', now() - interval '2 days');

-- STEP 9 — NOTIFICATION LOG (STORICO)
INSERT INTO contract_notification_log (contract_id, notification_type, contract_end_date, sent_to) VALUES
  ('990e8400-e29b-41d4-a716-446655440002', 'expiry_warning', '2026-12-31', 'finance@huntmodels.it');

-- STEP 10 — FINAL SETTINGS
UPDATE app_settings SET agency_notification_email = 'operations@huntmodels.it' WHERE id = true;