# Migrazione in produzione: `contracts` → `jobs`

Breve: questo file spiega i passi consigliati per eseguire la migrazione su produzione in sicurezza.

Prerequisiti
- Aver eseguito la migrazione su staging e completato le verifiche (done).
- Backup completo del DB (pg_dump) prima di procedere.
- Finestra di manutenzione e possibilità di rollback.

File di migrazione (nell'ordine da eseguire)
- `database/migrations/2026-05-14_migrate_contracts_to_jobs.sql`  -- crea `jobs`, copia dati, ripunta FK, aggiunge RLS baseline
- `database/migrations/2026-05-14_fix_validate_payment_contract_state.sql` -- aggiorna trigger/validazioni per supportare `jobs`

NOTA: i file per test (`2026-05-14_test_data_jobs.sql`) NON devono essere eseguiti in produzione.

Passi operativi
1) Backup (esempio):
```bash
PGPASSWORD="$DB_PASS" pg_dump -h $DB_HOST -U $DB_USER -F c -b -v -f backups/pre_migration_$(date +%F).dump $DB_NAME
```

2) Metti l'app in maintenance (blocca le scritture/traffic)

3) Esegui gli script di migrazione, nell'ordine:
```bash
PGPASSWORD="$DB_PASS" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database/migrations/2026-05-14_migrate_contracts_to_jobs.sql
PGPASSWORD="$DB_PASS" psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database/migrations/2026-05-14_fix_validate_payment_contract_state.sql
```

4) Verifiche immediate (esegui in psql):
```sql
-- conteggi
select count(*) as contracts_count from contracts;
select count(*) as jobs_count from jobs;

-- pagamenti che non puntano a jobs
select p.id from payments p left join jobs j on j.id = p.contract_id where j.id is null;

-- trigger e funzione
select pg_get_functiondef(p.oid) from pg_proc p where p.proname = 'validate_payment_contract_state';
select * from pg_trigger where tgname = 'payments_validate_contract_state';

-- RLS
select relrowsecurity from pg_class where relname = 'jobs';
select * from pg_policies where tablename = 'jobs';
```

5) Deploy app + edge functions
- Deploy la versione dell'app che usa `jobs` (assicurati che il codice sia aggiornato prima del cutover). Se hai una feature-flag, abilita `jobs` per un subset di utenti.

6) Smoke tests funzionali
- Crea un pagamento di prova, verifica che compaia nelle view/endpoint attesi (es. `pending_incomes`, `payment_commissions`), verifica notifiche/cron.

7) Pulizia (solo quando sei sicuro)
- Conserva `contracts` come archivio fino a che non sei pronto a cancellarlo. Quando sei pronto:
  - Esegui backup finale
  - DROP VIEW/DELETE `contracts` o spostalo in schema `archive`.

Rollback
- Se qualcosa va storto prima di cancellare `contracts`: ripristina da backup con `pg_restore`:
```bash
PGPASSWORD="$DB_PASS" pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME -v backups/pre_migration_YYYY-MM-DD.dump
```
- Se il problema è solo sul livello app, rollback della release applicativa e mantieni `contracts`/`jobs` in stato coerente.

Consigli di sicurezza
- Verifica che le funzioni helper (`auth_role()`, `auth_school_id()`, `auth_agent_id()`) esistano prima di esporre `jobs` via API.
- Controlla le policy RLS su `jobs` e aggiungi policy `insert/update/delete` coerenti con il comportamento voluto.

Checklist rapida prima di eseguire in produzione
- [ ] Backup completato
- [ ] Staging verificato (counts, payments, triggers)
- [ ] Finestra di manutenzione pianificata
- [ ] Comunicazione al team/ops
- [ ] PR/applicazione aggiornata pronta per deploy

Se vuoi, posso generare anche uno script idempotente `run_prod_migration.sh` che esegue i passi 1–4 con controlli e abort su errori.

---

Fine
