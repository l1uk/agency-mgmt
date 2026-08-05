# Appendice A — Note Operative e Gestione Avanzata

Questa appendice integra la guida principale con le procedure di gestione degli errori, le regole di eliminazione delle anagrafiche, la procedura di ripristino credenziali e i dettagli fiscali relativi alla registrazione degli incassi.

---

### A.1 Gestione degli Errori sugli Incassi

In caso di inserimento errato di un incasso (importo sbagliato, data errata o errore di digitazione), il sistema offre due modalità di gestione a seconda dello stato dell'incasso:

#### 1. Incassi Pendenti (Senza Data)
Se l'incasso non è stato ancora confermato con una data:
* Vai alla voce di menu **Incassi pendenti** oppure apri il pannello **Incassi** del lavoro interessato.
* Clicca sul pulsante **"Segna come incassato / Modifica"**.
* Nel finestra modale che si apre, puoi correggere la **Data incasso** e l'**Incasso HUNT €** effettivo ricevuti, oppure annullare l'operazione.

#### 2. Incassi Già Confermati (Con Data)
Se un incasso è già stato registrato e contabilizzato nelle provvigioni:
* Vai alla sezione **Lavori** nel menu principale e apri il pannello **Incassi** cliccando su **"▼ Incassi"** sulla riga del lavoro interessato.
* Nella tabella degli incassi registrati, individua la riga errata e clicca sul pulsante rosso **✕ (Elimina)**.
* Il sistema chiederà una conferma di sicurezza: premendo **OK**, l'incasso verrà rimosso definitivamente e tutte le quote provvigionali (MD, Agente, Giorgio, Hunt Netto) verranno immediatamente ricalcolate in tempo reale.
* Registra nuovamente l'incasso corretto compilando il form **"+ Registra incasso"**.

---

### A.2 Regole di Eliminazione delle Anagrafiche e Vincoli Relazionali

Per garantire l'integrità dei dati contabili e storici dell'agenzia, l'applicazione applica un principio di **protezione dei dati relazionali**: non è possibile eliminare anagrafiche a cui risultano collegati elementi attivi o storici.

| Anagrafica | Come si elimina | Comportamento in presenza di vincoli | Azione richiesta per procedere |
| :--- | :--- | :--- | :--- |
| **Modelli** | Cliccare il pulsante rosso **✕** sulla riga del modello in **Modelli**. | **Bloccato**: se il modello ha lavori/contratti registrati, il sistema mostra l'errore *"Impossibile eliminare: questo modello ha lavori associati"*. | Eliminare prima tutti i lavori legati al modello dalla sezione **Lavori**. |
| **Agenzie** | Cliccare il pulsante rosso **✕** sulla riga dell'agenzia in **Agenzie**. | **Bloccato**: se ci sono modelli assegnati all'agenzia, il sistema mostra l'errore *"Impossibile eliminare: ci sono modelli associati a questa agenzia"*. | Riassegnare i modelli a un'altra agenzia oppure eliminarli prima. |
| **Scuole** | Cliccare il pulsante **Elimina** sulla scheda della scuola in **Scuole**. | **Bloccato**: se ci sono modelli provenienti da quella scuola, il sistema mostra l'errore *"Impossibile eliminare: ci sono modelli associati a questa scuola"*. | Modificare i modelli associati rimuovendo il riferimento alla scuola. |
| **Agenti** | Cliccare il pulsante rosso **✕** sulla riga dell'agente in **Agenti**. | **Bloccato**: se ci sono modelli associati all'agente, il sistema mostra l'errore *"Impossibile eliminare: ci sono modelli associati a questo agente"*. | Modificare i modelli associati rimuovendo il riferimento all'agente. |

---

### A.3 Procedura Invito e Recupero Credenziali (Scuole e Agenti)

I portali riservati alle **Scuole Partner** e agli **Agenti** sono ad accesso protetto e in sola lettura. Non è presente un pulsante pubblico di *"Password dimenticata"* nella schermata di login.

Se una scuola o un agente smarrisce la password o riscontra problemi di accesso, la procedura di ripristino si effettua come segue:

1. **Richiesta all'Agenzia**: Il referente della scuola o l'agente contatta l'amministratore di Hunt Models.
2. **Reinvio dell'Invito**:
   * L'amministratore entra nel gestionale e va alla pagina **Scuole** o **Agenti**.
   * Individua la riga dell'utente e clicca sul pulsante **"Invita"**.
3. **Impostazione Password**:
   * L'utente riceve un'email automatica contenente un link sicuro e temporaneo.
   * Cliccando sul link, viene indirizzato alla pagina riservata **Imposta Password** (`/set-password`).
   * L'utente inserisce la nuova password (minimo 8 caratteri) e la conferma.
4. **Accesso Diretto**: Una volta salvata la nuova password, il sistema autentica l'utente e lo reindirizza automaticamente al proprio portale (`/school` per le scuole o `/agent` per gli agenti).

---

### A.4 Dettaglio Fiscale e Inserimento Importi

> ⚠️ **IMPORTANTE — Definizione di "Totale lavoro €"**:
> Il campo **"Totale lavoro €"** (presente durante la registrazione di un lavoro o di un incasso) deve **SEMPRE rappresentare l'importo lordo del contratto/job al netto dell'IVA** (Imposta sul Valore Aggiunto).
>
> * **IVA**: **Escludere sempre l'IVA**. Se la fattura verso il cliente finale è di € 1.000 + IVA 22% (€ 1.220 totali), nel campo inserire **1000.00**. Inserire l'importo ivato causerebbe una sovrastima errata delle provvigioni spettanti a scuole, agenti e agenzia.
> * **Ritenute e Spese**: L'importo da inserire è il valore totale lordo del compenso concordato per la prestazione. Eventuali spese anticipate o arrotondamenti sull'effettivo incassato da Hunt Models possono essere specificati nel campo opzionale **"Incasso effettivo Hunt"** durante la registrazione della data d'incasso.
