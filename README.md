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
