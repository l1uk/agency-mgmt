# Guida al Backup di Supabase con pg_dump e Docker

Questa guida spiega come eseguire un backup locale del database Supabase utilizzando Docker per evitare problemi di versionamento di PostgreSQL.

## Il Comando Completo

Esegui questo comando nel tuo terminale per scaricare il database in un file `.sql`:

```bash
docker run --rm -i postgres:17 pg_dump \\
  -h aws-1-eu-central-1.pooler.supabase.com \\
  -p 6543 \\
  -U postgres.uhzpydysfmfapjcxsswe \\
  -d postgres > backup_prod_$(date +%Y%m%d).sql

```

## Spiegazione dei Parametri

| Parametro | Descrizione |
| --- | --- |
| `docker run --rm -i postgres:17` | Avvia un container temporaneo con PostgreSQL 17 (stessa versione del server). |
| `-h aws-1-eu-central-1...` | L'host del **Connection Pooler** di Supabase. |
| `-p 6543` | La porta specifica per il pooler (Supavisor). |
| `-U postgres.[ID_PROGETTO]` | L'username. **Nota:** Il suffisso `.id-progetto` è obbligatorio per il pooler. |
| `-d postgres` | Il nome del database da scaricare (default su Supabase è `postgres`). |
| `> backup.sql` | Reindirizza l'output del comando in un file fisico sul tuo PC. |

## Risoluzione Problemi Comuni

### 1. Errore: "no tenant identifier provided"

Questo accade se dimentichi di aggiungere il tuo Project ID all'username. Assicurati che l'utente sia nel formato `postgres.tuo-id-alfanumerico`.

### 2. Password "al buio"

Dopo aver lanciato il comando, Docker rimarrà in attesa. **Non vedrai apparire la scritta "Password:"** perché l'output è reindirizzato al file. Digita la password del database e premi **Invio**.

### 3. Versione Mismatch

Se non usi Docker e ricevi un errore di versione, devi aggiornare il tuo `postgresql-client` locale alla versione 17, poiché Supabase utilizza le versioni più recenti di Postgres.

## Come Verificare il Backup

Una volta terminato, puoi controllare che il file contenga i dati con:

```bash
head -n 20 backup_prod_*.sql

```

