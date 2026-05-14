# Final report: contracts → jobs migration

Summary
- Staging: migration tested and verified.
- Production: prepared idempotent script and README.

What changed
- Added `jobs` table and copied rows from `contracts`.
- Updated FK constraints on `payments` and `contract_notification_log` to reference `jobs`.
- Added RLS baseline policies on `jobs`.
- Updated `validate_payment_contract_state()` to check both `contracts` and `jobs`.
- Updated edge functions to require `jobId` for renewal flow.

Artifacts
- `database/migrations/2026-05-14_migrate_contracts_to_jobs.sql`
- `database/migrations/2026-05-14_fix_validate_payment_contract_state.sql`
- `database/migrations/2026-05-14_test_data_jobs.sql` (staging only)
- `database/migrations/run_prod_migration.sh` (executable script)
- `database/migrations/PRODUCTION_MIGRATION_README.md`

Next steps
1. Merge the application changes (jobs-only) in a PR and deploy to canary.
2. Run `run_prod_migration.sh` during a maintenance window.
3. Perform smoke tests and monitor logs/alerts.
4. After stable operation, plan `contracts` cleanup or archive.

Contact
If you want, I can prepare the PR and include the SQL migrations and the runbook.
