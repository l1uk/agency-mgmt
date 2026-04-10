# Agency Management

Gestionale web per agenzia di moda. Contratti, modelli, provvigioni automatiche.

## Stack

- React 18 + Vite
- Supabase (database + auth)
- Vercel (deploy)

## Setup locale

```bash
# 1. Clona il repo
git clone https://github.com/TUO-USERNAME/agency-mgmt.git
cd agency-mgmt

# 2. Installa dipendenze
npm install

# 3. Crea il file env
cp .env.example .env.local
# Poi apri .env.local e inserisci URL e chiave da Supabase → Settings → API

# 4. Avvia
npm run dev
# → http://localhost:5173
```

## Setup database

1. Apri Supabase → **SQL Editor**
2. Incolla ed esegui `schema.sql` (tutto il file, dall'inizio alla fine)
3. Vai su **Authentication → Users → Invite user** e crea l'utente agenzia
4. Esegui la query di STEP 5 nel file SQL per assegnare il ruolo `agency`

## Creare l'utente scuola

```sql
-- Prima crea la scuola dall'app (pagina Scuole)
-- Poi copia l'UUID dalla tabella schools e incollalo qui:

update auth.users
set raw_user_meta_data = jsonb_build_object(
  'role',      'school',
  'school_id', 'INCOLLA-UUID-SCUOLA-QUI'
)
where email = 'scuola@example.it';
```

## Deploy su Vercel

```bash
git add .
git commit -m "init"
git push origin main
```

Su vercel.com → Import → seleziona il repo → aggiungi le 2 env vars → Deploy.

Ogni `git push` su `main` → rideploy automatico.

## Notifiche email contratti

Il progetto include ora due Supabase Edge Functions:

- `send-contract-expiry-notifications`
- `send-contract-renewal-confirmation`

Configurazione minima necessaria in Supabase:

1. Esegui l'ultima versione di `schema.sql`
2. Imposta i secrets delle Edge Functions:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EDGE_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
3. Inserisci l'email dell'agenzia in `app_settings.agency_notification_email`
4. Pubblica le functions in `supabase/functions/`

Nota:
- Le email di rinnovo vengono inviate quando l'agenzia conferma il rinnovo dall'app.
- Le email di scadenza vengono invocate dall'app in modo opportunistico dalla dashboard e sono deduplicate tramite `contract_notification_log`.
- Per invio automatico anche senza accesso alla dashboard, va aggiunto un job schedulato Supabase Cron o un scheduler esterno che chiami `send-contract-expiry-notifications`.

## Invito account agente

Il progetto include anche la Edge Function:

- `invite-agent-account`

Configurazione minima necessaria in Supabase:

1. Esegui l'ultima versione di `schema.sql`
2. Imposta i secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EDGE_SUPABASE_ANON_KEY`
   - `AGENT_INVITE_REDIRECT_TO` opzionale
   - `RESEND_API_KEY` per il reinvio invito su utenti gia esistenti
   - `EMAIL_FROM` per il reinvio invito su utenti gia esistenti
3. Pubblica `supabase/functions/invite-agent-account`

Flusso:
- L'agenzia crea l'agente con email dall'app
- L'agenzia clicca `Invita`
- Supabase invia l'email di attivazione/account setup
- L'utente completa la password e accede come `agent`

Nota:
- Il ruolo viene assegnato via `user_metadata = { role: 'agent', agent_id: ... }`
- Le policy RLS e il portale agente esistenti continuano a funzionare senza altre modifiche
- Il primo invito usa `inviteUserByEmail()`. Il reinvio invito per utenti gia creati usa un recovery link inviato via email provider custom.

## Invito account scuola

Il progetto include anche la Edge Function:

- `invite-school-account`

Configurazione minima necessaria in Supabase:

1. Esegui l'ultima versione di `schema.sql`
2. Imposta i secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `EDGE_SUPABASE_ANON_KEY`
   - `SCHOOL_INVITE_REDIRECT_TO` opzionale
3. Pubblica `supabase/functions/invite-school-account`

Flusso:
- L'agenzia crea la scuola con email dall'app
- L'agenzia clicca `Invita`
- Supabase invia l'email di attivazione/account setup
- L'utente completa la password e accede come `school`

Nota:
- Il ruolo viene assegnato via `user_metadata = { role: 'school', school_id: ... }`
- Le policy RLS e il portale scuola esistenti continuano a funzionare senza altre modifiche

## Struttura

```
src/
  lib/supabase.js          ← client Supabase
  hooks/useAuth.js         ← autenticazione + ruolo
  components/Layout.jsx    ← sidebar + nav
  pages/
    Login.jsx              ← pagina di accesso
    Dashboard.jsx          ← statistiche generali
    Commissions.jsx        ← provvigioni (con export CSV)
    Contracts.jsx          ← gestione contratti
    Models.jsx             ← archivio modelli
    Schools.jsx            ← scuole + regole %
    Agents.jsx             ← agenti + percentuali
    SchoolView.jsx         ← portale scuola (sola lettura)
```

## Ruoli

| Ruolo | Accesso | Redirect dopo login |
|-------|---------|---------------------|
| `agency` | Tutto | `/` (dashboard) |
| `school` | Solo i propri allievi | `/school` |
