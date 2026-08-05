-- ================================================================
-- MIGRATION 002: Add 'expiring' to contracts status check constraint
-- Date: 2026-08-05
-- Description: Allows contracts/jobs to be set to 'expiring' state.
-- ================================================================

BEGIN;

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('active', 'expiring', 'expired', 'cancelled'));

COMMIT;
