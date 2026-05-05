-- ================================================================
-- TEST_DATA_V8_CLEAN.SQL — Versione deterministica senza conflitti
-- ================================================================

-- STEP 0 — CLEANUP
delete from contract_notification_log;
delete from payments;
delete from contracts;
delete from school_commission_rules;
delete from models;
delete from agents;
delete from schools;

-- 1. SCUOLE
insert into schools (id, name, email, invited_at, giorgio)
values 
  ('550e8400-e29b-41d4-a716-446655440000', 'Fashion Academy Milano', 'info@fashionacademy.it', '2026-01-01', true),
  ('550e8400-e29b-41d4-a716-446655440001', 'Elite Models School', 'contact@elitemodels.it', '2026-01-01', false);

-- 2. AGENTI
insert into agents (id, name, email, invited_at, is_giorgio_agent, commission_pct_exclusive, commission_pct_open)
values
  ('660e8400-e29b-41d4-a716-446655440000', 'Marco Rossi', 'marco.rossi@agents.it', '2026-01-01', false, 10, 7),
  ('660e8400-e29b-41d4-a716-446655440002', 'Laura Bianchi', 'laura.bianchi@agents.it', '2026-01-01', false, 10, 7);

-- 3. REGOLE PROVVIGIONI SCUOLE
insert into school_commission_rules (id, school_id, min_months, max_months, commission_pct) values
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 0, 6, 8.00),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 7, 12, 5.00),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 13, 18, 3.00),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000', 19, 24, 5.00),
  (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440001', 0, 6, 8.00);

-- 4. MODELLI
insert into models (id, first_name, last_name, school_id, agent_id, notes)
values
  ('770e8400-e29b-41d4-a716-446655440001', 'Valentina', 'SoloHunt', null, null, 'Solo Hunt models'),
  ('770e8400-e29b-41d4-a716-446655440002', 'Elena', 'Ricchi', '550e8400-e29b-41d4-a716-446655440000', null, 'MD High Budget'),
  ('770e8400-e29b-41d4-a716-446655440003', 'Sara', 'Moretti', null, '660e8400-e29b-41d4-a716-446655440000', 'Agente non escl'),
  ('770e8400-e29b-41d4-a716-446655440004', 'Laura', 'Vecchia', null, '660e8400-e29b-41d4-a716-446655440002', 'Agente storico'),
  ('770e8400-e29b-41d4-a716-446655440000', 'Giulia', 'Verdi', null, '660e8400-e29b-41d4-a716-446655440000', 'Agente escl 10%'),
  ('770e8400-e29b-41d4-a716-446655440008', 'Luca', 'Poveri', '550e8400-e29b-41d4-a716-446655440000', null, 'MD Proroga test'),
  ('770e8400-e29b-41d4-a716-446655440006', 'Alessia', 'Fasce', '550e8400-e29b-41d4-a716-446655440000', null, 'Test fasce MD'),
  ('770e8400-e29b-41d4-a716-446655440007', 'Giulia', 'NoGiorgio', '550e8400-e29b-41d4-a716-446655440001', null, 'Senza Giorgio');

-- 5. CONTRATTI (Tutti 'active' per evitare errori di trigger)
insert into contracts (id, model_id, client_name, reference_amount, start_date, end_date, exclusive, status, first_job_date)
values
  ('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Hunt Client', 5000, '2026-01-01', '2028-01-01', true, 'active', '2026-01-15'),
  ('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'Luxury Old', 10000, '2024-01-01', '2028-01-01', true, 'active', '2024-01-10'),
  ('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', 'Photo Studio', 3000, '2026-01-01', '2028-01-01', false, 'active', '2026-01-10'),
  ('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440004', 'Brand Historic', 4000, '2024-05-01', '2028-05-01', true, 'active', '2024-06-01'),
  ('990e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440000', 'Fashion Brand A', 5000, '2026-01-01', '2028-01-01', true, 'active', '2026-02-01'),
  ('990e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440008', 'Small Boutique', 3000, '2024-01-01', '2028-01-01', true, 'active', '2024-01-15'),
  ('990e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440006', 'Fasce Client', 6000, '2025-01-01', '2028-01-01', true, 'active', '2025-01-15'),
  ('990e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440007', 'Elite Brand', 5000, '2026-01-01', '2028-01-01', true, 'active', '2026-02-01');

-- 6. PAGAMENTI
insert into payments (id, contract_id, amount, paid_at, notes)
values
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440001', 1000.00, '2026-02-01', 'Solo Hunt'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440002', 2500.00, '2024-02-01', 'Elena Mese 0'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440002', 1500.00, '2025-10-01', 'Elena Mese 20 (>2000€) -> 0%'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440003', 1000.00, '2026-03-01', 'Agente Open 7%'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440004', 2000.00, '2025-09-01', 'Agente Storico 5%'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440000', 1000.00, '2026-03-01', 'Agente Escl 10%'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440008', 100.00, '2024-02-01', 'Luca Mese 0'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440008', 500.00, '2025-11-01', 'Luca Mese 21 (<2000€) -> 5%'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440006', 100.00, '2025-01-01', 'Alessia Mese 0'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440006', 1000.00, '2025-09-01', 'Alessia Mese 8 (5%)'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440006', 1000.00, '2026-03-01', 'Alessia Mese 14 (3%)'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440007', 1000.00, '2026-03-01', 'No Giorgio');

-- 7. IMPOSTAZIONI
update app_settings set agency_notification_email = 'hunt@example.com' where id = true;