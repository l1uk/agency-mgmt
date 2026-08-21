-- ================================================================
-- MASSIVE_TEST_DATA.SQL — HUNT MODELS TEST ENVIRONMENT
-- Popola il database con una ricca varietà di agenzie, scuole,
-- agenti, modelli, contratti e incassi (confermati e pendenti).
-- ================================================================

BEGIN;

-- ----------------------------------------------------------------
-- STEP 0: PULIZIA COMPLETA DATI DI TEST
-- ----------------------------------------------------------------
DELETE FROM contract_notification_log;
DELETE FROM payments;
DELETE FROM contracts;
DELETE FROM models;
DELETE FROM school_commission_rules;
DELETE FROM agents;
DELETE FROM schools;
DELETE FROM agencies;

-- ----------------------------------------------------------------
-- STEP 1: AGENZIE PARTNER
-- ----------------------------------------------------------------
INSERT INTO agencies (id, name, hunt_pct) VALUES 
  ('aa0e8400-e29b-41d4-a716-446655440000', 'Hunt Models HQ', 100.00),
  ('aa0e8400-e29b-41d4-a716-446655440001', 'Parisian Scout Group', 20.00),
  ('aa0e8400-e29b-41d4-a716-446655440002', 'London Elite Management', 15.00),
  ('aa0e8400-e29b-41d4-a716-446655440003', 'Milan Discovery', 50.00),
  ('aa0e8400-e29b-41d4-a716-446655440004', 'New York Talent Lab', 30.00);

-- ----------------------------------------------------------------
-- STEP 2: SCUOLE (MD)
-- ----------------------------------------------------------------
INSERT INTO schools (id, name, email, giorgio) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Fashion Academy Milano', 'accademia.milano@scuola.it', true),
  ('550e8400-e29b-41d4-a716-446655440001', 'International Scouting Rome', 'rome.scout@scuola.it', false),
  ('550e8400-e29b-41d4-a716-446655440002', 'Global Model School', 'global@modelschool.com', true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Istituto Moda Torino', 'info@modatorino.it', false);

-- ----------------------------------------------------------------
-- STEP 3: REGOLE SCUOLE (FASCE PERCENTUALI MD)
-- ----------------------------------------------------------------
INSERT INTO school_commission_rules (school_id, min_months, max_months, commission_pct) VALUES
  -- Fashion Academy Milano
  ('550e8400-e29b-41d4-a716-446655440000', 0, 6, 8.00),
  ('550e8400-e29b-41d4-a716-446655440000', 7, 12, 5.00),
  ('550e8400-e29b-41d4-a716-446655440000', 13, 18, 3.00),
  -- International Scouting Rome
  ('550e8400-e29b-41d4-a716-446655440001', 0, 6, 8.00),
  ('550e8400-e29b-41d4-a716-446655440001', 7, 12, 5.00),
  ('550e8400-e29b-41d4-a716-446655440001', 13, 18, 3.00),
  -- Global Model School
  ('550e8400-e29b-41d4-a716-446655440002', 0, 6, 8.00),
  ('550e8400-e29b-41d4-a716-446655440002', 7, 12, 5.00),
  ('550e8400-e29b-41d4-a716-446655440002', 13, 18, 3.00),
  -- Istituto Moda Torino
  ('550e8400-e29b-41d4-a716-446655440003', 0, 6, 8.00),
  ('550e8400-e29b-41d4-a716-446655440003', 7, 12, 5.00),
  ('550e8400-e29b-41d4-a716-446655440003', 13, 18, 3.00);

-- ----------------------------------------------------------------
-- STEP 4: AGENTI
-- ----------------------------------------------------------------
INSERT INTO agents (id, name, email, is_giorgio_agent, commission_pct_exclusive, commission_pct_open, commission_pct_month13) VALUES
  ('660e8400-e29b-41d4-a716-446655440000', 'Marco Rossi', 'marco.rossi@huntmodels.it', false, 10.00, 7.00, 5.00),
  ('660e8400-e29b-41d4-a716-446655440001', 'Sophie Laurent', 'sophie.laurent@parisagent.com', false, 12.00, 8.00, 6.00),
  ('660e8400-e29b-41d4-a716-446655440002', 'James Smith', 'j.smith@londonagents.co.uk', false, 10.00, 5.00, 5.00),
  ('660e8400-e29b-41d4-a716-446655440003', 'Matteo Bianchi', 'matteo.bianchi@huntmodels.it', false, 10.00, 7.00, 5.00),
  ('660e8400-e29b-41d4-a716-44665544000f', 'Giorgio Proxy', 'giorgio@huntmodels.it', true, 0.00, 0.00, 0.00);

-- ----------------------------------------------------------------
-- STEP 5: MODELLI (14 modelli con varie combinazioni)
-- ----------------------------------------------------------------
INSERT INTO models (id, first_name, last_name, agency_id, school_id, agent_id, hunt_signed_at, notes) VALUES
  -- 1. Modelli solo agenzia (nessuna scuola, nessun agente)
  ('770e8400-e29b-41d4-a716-446655440001', 'Valentina', 'Direct', 'aa0e8400-e29b-41d4-a716-446655440000', null, null, '2024-01-10', 'Talento principale Milano'),
  ('770e8400-e29b-41d4-a716-446655440002', 'Paolo', 'Verdi', 'aa0e8400-e29b-41d4-a716-446655440000', null, null, '2024-03-15', 'Modello alta moda uomo'),
  ('770e8400-e29b-41d4-a716-446655440003', 'Camilla', 'Sartori', 'aa0e8400-e29b-41d4-a716-446655440003', null, null, '2025-02-01', 'Partner Milan Discovery 50%'),

  -- 2. Modelli da Scuole MD
  ('770e8400-e29b-41d4-a716-446655440004', 'Elena', 'Academy', 'aa0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', null, '2024-01-01', 'Fashion Academy Milano (Giorgio=true)'),
  ('770e8400-e29b-41d4-a716-446655440005', 'Sofia', 'Ferrari', 'aa0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', null, '2024-06-01', 'MD Milano con Giorgio'),
  ('770e8400-e29b-41d4-a716-446655440006', 'Marta', 'NoGiorgioSchool', 'aa0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', null, '2025-01-10', 'Scuola Roma (No Giorgio)'),
  ('770e8400-e29b-41d4-a716-446655440007', 'Alessio', 'GlobalMD', 'aa0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', null, '2024-09-01', 'Global School MD'),
  ('770e8400-e29b-41d4-a716-446655440008', 'Federico', 'Torino', 'aa0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440003', null, '2025-05-01', 'Istituto Moda Torino'),

  -- 3. Modelli con Agenti
  ('770e8400-e29b-41d4-a716-446655440009', 'Sara', 'AgentExclusive', 'aa0e8400-e29b-41d4-a716-446655440000', null, '660e8400-e29b-41d4-a716-446655440000', '2025-01-15', 'Agente Marco Rossi (Esclusiva)'),
  ('770e8400-e29b-41d4-a716-446655440010', 'Lukas', 'International', 'aa0e8400-e29b-41d4-a716-446655440002', null, '660e8400-e29b-41d4-a716-446655440001', '2023-06-01', 'Sophie Laurent + London Elite (Oltre 12 mesi)'),
  ('770e8400-e29b-41d4-a716-446655440011', 'Giulia', 'AgentOpen', 'aa0e8400-e29b-41d4-a716-446655440000', null, '660e8400-e29b-41d4-a716-446655440000', '2025-03-01', 'Marco Rossi (Non esclusiva)'),
  ('770e8400-e29b-41d4-a716-446655440012', 'David', 'LondonBoy', 'aa0e8400-e29b-41d4-a716-446655440002', null, '660e8400-e29b-41d4-a716-446655440002', '2024-11-20', 'James Smith'),
  ('770e8400-e29b-41d4-a716-446655440013', 'Emilio', 'Odescalchi', 'aa0e8400-e29b-41d4-a716-446655440000', null, '660e8400-e29b-41d4-a716-446655440003', '2024-05-10', 'Matteo Bianchi - Modello di punta'),
  ('770e8400-e29b-41d4-a716-446655440014', 'Francesco', 'Faraguti', 'aa0e8400-e29b-41d4-a716-446655440000', null, '660e8400-e29b-41d4-a716-446655440000', '2024-05-20', 'Marco Rossi - Trussardi testimonial');

-- ----------------------------------------------------------------
-- STEP 6: CONTRATTI / SCHEDE LAVORO (18 contratti con vari clienti)
-- ----------------------------------------------------------------
INSERT INTO contracts (id, model_id, client_name, reference_amount, exclusive, status, first_job_date, notes) VALUES
  -- Valentina Direct
  ('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'Vogue Italia', 5000.00, true, 'active', '2026-01-15', 'Servizio copertina Vogue'),
  ('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440001', 'Max Mara', 3500.00, true, 'active', '2026-03-10', 'Lookbook Fall/Winter'),

  -- Paolo Verdi
  ('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440002', 'Dolce & Gabbana', 8000.00, true, 'active', '2025-06-01', 'Sfilata Uomo e Campagna'),

  -- Camilla Sartori
  ('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440003', 'Moncler', 6000.00, false, 'active', '2025-10-15', 'Shooting Grenoble'),

  -- Elena Academy (MD Milano)
  ('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440004', 'Prada HQ', 12000.00, true, 'active', '2024-02-01', 'Contratto continuativo campagna'),
  ('990e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440004', 'Gucci', 4500.00, true, 'active', '2025-04-10', 'Accessori Primavera'),

  -- Sofia Ferrari (MD Milano)
  ('990e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440005', 'Bottega Veneta', 7000.00, true, 'active', '2024-07-01', 'Editorial e Digital'),

  -- Marta NoGiorgioSchool (MD Roma)
  ('990e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440006', 'Diesel', 4000.00, true, 'active', '2026-02-15', 'Campagna Denim'),

  -- Alessio GlobalMD
  ('990e8400-e29b-41d4-a716-446655440009', '770e8400-e29b-41d4-a716-446655440007', 'Armani', 20000.00, true, 'active', '2025-02-01', 'Emporio Armani Runway & Adv'),

  -- Federico Torino
  ('990e8400-e29b-41d4-a716-446655440010', '770e8400-e29b-41d4-a716-446655440008', 'Versace', 3000.00, false, 'active', '2026-01-20', 'Fitting e Showroom'),

  -- Sara AgentExclusive (Marco Rossi)
  ('990e8400-e29b-41d4-a716-446655440011', '770e8400-e29b-41d4-a716-446655440009', 'Zara World', 3000.00, true, 'active', '2026-03-01', 'E-commerce Spagna'),
  ('990e8400-e29b-41d4-a716-446655440012', '770e8400-e29b-41d4-a716-446655440009', 'Mango', 2500.00, true, 'active', '2026-04-15', 'Lookbook Estate'),

  -- Lukas International (Sophie Laurent)
  ('990e8400-e29b-41d4-a716-446655440013', '770e8400-e29b-41d4-a716-446655440010', 'Burberry UK', 15000.00, false, 'active', '2023-07-01', 'Campagna Globale Outerwear'),

  -- Giulia AgentOpen (Marco Rossi)
  ('990e8400-e29b-41d4-a716-446655440014', '770e8400-e29b-41d4-a716-446655440011', 'Benetton', 2000.00, false, 'active', '2025-05-01', 'Shooting SS25'),

  -- David LondonBoy (James Smith)
  ('990e8400-e29b-41d4-a716-446655440015', '770e8400-e29b-41d4-a716-446655440012', 'Tom Ford', 5000.00, true, 'active', '2025-01-10', 'Fitting & Beauty'),

  -- Emilio Odescalchi (Matteo Bianchi) - Zalando Master Contract
  ('990e8400-e29b-41d4-a716-446655440016', '770e8400-e29b-41d4-a716-446655440013', 'Zalando', 10000.00, true, 'active', '2024-05-19', 'Zalando Studios Shooting'),
  ('990e8400-e29b-41d4-a716-446655440017', '770e8400-e29b-41d4-a716-446655440013', 'Valentino', 4000.00, true, 'active', '2025-08-01', 'Campagna Fragrance'),

  -- Francesco Faraguti (Marco Rossi) - Trussardi Master Contract
  ('990e8400-e29b-41d4-a716-446655440018', '770e8400-e29b-41d4-a716-446655440014', 'Trussardi', 8000.00, true, 'active', '2024-05-29', 'Trussardi Eyewear & Leather');

-- ----------------------------------------------------------------
-- STEP 7: INCASSI CONFERMATI (PAGATI)
-- ----------------------------------------------------------------
INSERT INTO payments (id, contract_id, amount, paid_at, hunt_actual_amount, notes, created_at) VALUES
  -- Valentina Direct: 100% Hunt
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440001', 2500.00, '2026-02-10', 2500.00, 'Acconto Vogue', '2026-01-15 10:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440001', 2500.00, '2026-03-20', 2500.00, 'Saldo Vogue', '2026-03-10 10:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440002', 3500.00, '2026-04-15', 3500.00, 'Saldo Max Mara', '2026-03-10 11:30:00+00'),

  -- Paolo Verdi: 100% Hunt
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440003', 4000.00, '2025-07-01', 4000.00, 'D&G Prima rata', '2025-06-01 09:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440003', 4000.00, '2025-09-15', 4000.00, 'D&G Saldo sfilata', '2025-08-20 14:00:00+00'),

  -- Camilla Sartori: Milan Discovery (50%)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440004', 3000.00, '2025-11-20', 1500.00, 'Moncler Rata 1', '2025-10-15 10:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440004', 3000.00, '2026-01-10', 1500.00, 'Moncler Rata 2', '2025-12-10 11:00:00+00'),

  -- Elena Academy: MD Milano (Fascia 8% e 3%) + Parisian Scout (20%)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440005', 5000.00, '2024-03-01', 1000.00, 'Prada Mese 1 (Fascia 8%)', '2024-02-01 10:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440005', 4000.00, '2024-08-15', 800.00, 'Prada Mese 6 (Fascia 8%)', '2024-08-01 09:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440005', 3000.00, '2025-05-15', 600.00, 'Prada Mese 15 (Fascia 3%)', '2025-05-01 12:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440006', 4500.00, '2025-06-20', 900.00, 'Gucci Saldo', '2025-04-10 15:00:00+00'),

  -- Sofia Ferrari: MD Milano (Fascia 8%)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440007', 3500.00, '2024-08-01', 3500.00, 'Bottega Veneta Mese 1', '2024-07-01 10:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440007', 3500.00, '2024-11-10', 3500.00, 'Bottega Veneta Mese 4', '2024-10-15 11:00:00+00'),

  -- Marta NoGiorgioSchool: Scuola Roma (No Giorgio) + Milan Discovery (50%)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440008', 2000.00, '2026-03-15', 1000.00, 'Diesel Acconto', '2026-02-15 10:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440008', 2000.00, '2026-05-10', 1000.00, 'Diesel Saldo', '2026-04-20 10:00:00+00'),

  -- Alessio GlobalMD: Global School MD + Giorgio
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440009', 10000.00, '2025-03-10', 10000.00, 'Armani Acconto Runway', '2025-02-01 10:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440009', 10000.00, '2025-07-15', 10000.00, 'Armani Saldo Campagna', '2025-06-15 10:00:00+00'),

  -- Sara AgentExclusive (Marco Rossi: 10% esclusiva)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440011', 1500.00, '2026-04-01', 1500.00, 'Zara Turno 1', '2026-03-01 10:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440011', 1500.00, '2026-05-02', 1500.00, 'Zara Turno 2', '2026-04-10 10:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440012', 2500.00, '2026-06-01', 2500.00, 'Mango Saldo', '2026-04-15 10:00:00+00'),

  -- Lukas International (Sophie Laurent: Mese 13+ -> 6%) + London Elite (15%)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440013', 10000.00, '2026-01-10', 1500.00, 'Burberry Storico', '2025-12-01 10:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440013', 5000.00, '2026-04-20', 750.00, 'Burberry Rinnovo', '2026-03-15 10:00:00+00'),

  -- Giulia AgentOpen (Marco Rossi: 7% non esclusiva)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440014', 2000.00, '2025-06-15', 2000.00, 'Benetton Open Saldo', '2025-05-01 10:00:00+00'),

  -- David LondonBoy (James Smith: 10% esclusiva) + London Elite (15%)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440015', 5000.00, '2025-02-28', 750.00, 'Tom Ford Fitting & Beauty', '2025-01-10 10:00:00+00'),

  -- Emilio Odescalchi (Matteo Bianchi: 10%) - Zalando (multi-incasso nello stesso contratto)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440016', 150.00, '2026-05-19', 150.00, 'Turno shooting 19 Maggio', '2026-05-19 09:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440016', 150.00, '2026-05-20', 150.00, 'Turno shooting 20 Maggio', '2026-05-20 09:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440016', 150.00, '2026-05-21', 150.00, 'Turno shooting 21 Maggio', '2026-05-21 09:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440016', 300.00, '2026-05-25', 300.00, 'Doppio turno 25 Maggio', '2026-05-25 09:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440016', 150.00, '2026-06-03', 150.00, 'Turno shooting 3 Giugno', '2026-06-03 09:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440017', 4000.00, '2025-09-01', 4000.00, 'Valentino Fragrance Saldo', '2025-08-01 10:00:00+00'),

  -- Francesco Faraguti (Marco Rossi: 10%) - Trussardi (multi-incasso)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440018', 2000.00, '2026-05-29', 2000.00, 'Trussardi Campagna Stampa', '2026-05-29 10:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440018', 2000.00, '2026-06-15', 2000.00, 'Trussardi Video Spot', '2026-06-10 10:00:00+00'),
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440018', 1500.00, '2026-07-05', 1500.00, 'Trussardi Eyewear Extra', '2026-07-01 10:00:00+00');

-- ----------------------------------------------------------------
-- STEP 8: INCASSI PENDENTI (NON ANCORA PAGATI — paid_at is null)
-- ----------------------------------------------------------------
INSERT INTO payments (id, contract_id, amount, paid_at, notes, created_at) VALUES
  -- Pendente recente (3 giorni fa)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440001', 1200.00, null, 'In attesa bonifico Vogue Digital', now() - interval '3 days'),
  
  -- Pendente Prada (15 giorni fa)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440005', 3000.00, null, 'Fattura inviata a Prada Milano', now() - interval '15 days'),
  
  -- Pendente critico Armani (45 giorni fa)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440009', 5000.00, null, 'Sollecito pagamento Armani Runway', now() - interval '45 days'),
  
  -- Pendente Zara (8 giorni fa)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440011', 1500.00, null, 'Shooting Zara Maggio', now() - interval '8 days'),

  -- Pendente Zalando (2 giorni fa)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440016', 150.00, null, 'Turno shooting recente Zalando', now() - interval '2 days'),

  -- Pendente Versace (25 giorni fa)
  (gen_random_uuid(), '990e8400-e29b-41d4-a716-446655440010', 3000.00, null, 'Showroom Versace Milano', now() - interval '25 days');

-- ----------------------------------------------------------------
-- STEP 9: IMPOSTAZIONI AGENZIA
-- ----------------------------------------------------------------
UPDATE app_settings 
SET agency_notification_email = 'admin@huntmodels.it' 
WHERE id = true;

COMMIT;
