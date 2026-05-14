#!/usr/bin/env bash
set -euo pipefail

# Run production migration: backup, migrate, verify
# Usage: DB_HOST=... DB_USER=... DB_PASS=... DB_NAME=... ./run_prod_migration.sh

if [ -z "${DB_HOST:-}" ] || [ -z "${DB_USER:-}" ] || [ -z "${DB_PASS:-}" ] || [ -z "${DB_NAME:-}" ]; then
  echo "Please set DB_HOST, DB_USER, DB_PASS and DB_NAME environment variables"
  exit 2
fi

BACKUP_FILE="backups/pre_migration_$(date +%F).dump"
mkdir -p backups

echo "1) Backup database to $BACKUP_FILE"
PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -U "$DB_USER" -F c -b -v -f "$BACKUP_FILE" "$DB_NAME"

echo "2) Run migrate contracts->jobs"
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f database/migrations/2026-05-14_migrate_contracts_to_jobs.sql

echo "3) Apply trigger/function fixes"
PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f database/migrations/2026-05-14_fix_validate_payment_contract_state.sql

echo "4) Verification checks"
contracts_count=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -A -c "select count(*) from contracts;")
jobs_count=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -A -c "select count(*) from jobs;")

echo "contracts_count=$contracts_count jobs_count=$jobs_count"
if [ "$contracts_count" -ne "$jobs_count" ]; then
  echo "Error: counts mismatch between contracts and jobs. Aborting."
  exit 3
fi

orphan=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -A -c "select p.id from payments p left join jobs j on j.id = p.contract_id where j.id is null limit 1;")
if [ -n "$orphan" ]; then
  echo "Error: found payments referencing non-existing jobs: $orphan. Aborting."
  exit 4
fi

echo "Migration completed (verify app behavior before removing contracts)."

echo "If any check failed, restore backup with pg_restore. See PRODUCTION_MIGRATION_README.md"
