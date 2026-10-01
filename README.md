# Gestionale Hunt Models

Un'applicazione web su misura per la gestione dell'agenzia di moda Hunt Models. Permette di tenere traccia dei modelli, gestire i contratti, registrare gli incassi sui lavori e calcolare in modo completamente automatico le provvigioni spettanti all'agenzia, alle scuole partner (MD) e agli agenti.

## 🌟 Funzionalità Principali

- **Archivio Modelli:** Gestione dei modelli divisi per tipologia (Solo agenzia, Scuola MD, Agente).
- **Gestione Contratti:** Tracciamento dei contratti con clienti, importi, note e stati (Attivo, In Scadenza, Scaduto).
- **Tracciamento Incassi (Pagati e Pendenti):** Registrazione puntuale di ogni incasso legato a un contratto.
- **Calcolo Provvigioni Automatico:** Distribuzione matematica e automatica delle quote in base al periodo (calcolato dal primo job o primo incasso) e agli accordi specifici (Regole MD o regole Agente).
- **Multi-Ruolo:** Portali separati e sicuri per l'Agenzia, per le Scuole partner e per gli Agenti.

## 📚 Documentazione

La documentazione di business e le logiche di calcolo sono raccolte nella cartella `docs/`:

- [Specifiche di Business (`docs/specifica-hunt-models.md`)](docs/specifica-hunt-models.md): Documento originale con i requisiti, i tipi di modelli e le logiche dei rinnovi.
- [Audit Commissioni (`docs/audit-commissioni.md`)](docs/audit-commissioni.md): **[IMPORTANTE]** Spiegazione dettagliata e semplice di come il sistema calcola matematicamente le percentuali sugli incassi (basate sull'*Hunt Teorico*).

---

## 👥 Utenti e Ruoli

Il gestionale prevede 3 livelli di accesso, gestiti tramite *Row Level Security* (RLS) sul database:

| Ruolo | Accesso | Cosa Vede |
|-------|---------|-----------|
| **Agenzia** (`agency`) | Completo | Tutto: modelli, contratti, incassi, setup scuole/agenti. |
| **Scuola MD** (`school`) | Sola lettura | Solo i propri allievi, i relativi incassi e la quota spettante. |
| **Agente** (`agent`) | Sola lettura | Solo i propri modelli, i relativi incassi e la propria provvigione. |

---

## 🚀 Guida all'Avvio (Setup Locale)

### 1. Prerequisiti
- **Node.js** (v18+)
- Account su **Supabase** (per database e autenticazione)

### 2. Installazione
```bash
# Clona il repository
git clone https://github.com/TUO-USERNAME/agency-mgmt.git
cd agency-mgmt

# Installa le dipendenze
npm install

# Crea il file per le variabili d'ambiente
cp .env.example .env.local
```
*(Apri `.env.local` e inserisci l'`URL` e l'`API Key` del tuo progetto Supabase)*

### 3. Avvio
```bash
npm run dev
# L'app sarà disponibile su http://localhost:5173
```

---

## 🗄️ Database e Autenticazione (Supabase)

L'intero schema, le tabelle, le viste per i calcoli e le policy di sicurezza si trovano in un unico file SQL.

1. Vai su Supabase → **SQL Editor**.
2. Incolla ed esegui tutto il contenuto del file `database/schema.sql`.
3. Crea un utente Admin (Agenzia):
   - Vai in **Authentication → Users → Invite user** e crea l'utente con l'email desiderata.
   - Per assegnare il ruolo di admin, esegui questa query nell'SQL Editor:
     ```sql
     update auth.users
     set raw_user_meta_data = jsonb_build_object('role', 'agency')
     where email = 'tua.email@huntmodels.it';
     ```

*(Per le istruzioni dettagliate su come invitare scuole e agenti usando le Edge Functions, consulta il codice e le istruzioni storiche nel file originario o nell'interfaccia dell'app).*

---

## 🛠️ Stack Tecnologico

- **Frontend:** React 18, React Router DOM, Vite
- **Stile:** Tailwind CSS (o CSS custom)
- **Backend & Database:** Supabase (PostgreSQL)
- **Deploy:** Vercel (Consigliato per un setup semplice e gratuito)
