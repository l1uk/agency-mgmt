**Gestionale Hunt Models**

Proposta di sviluppo --- v2

Aprile 2026

# **Cos'è e come funziona**

Ho costruito un gestionale web su misura per Hunt Models. Quello che hai
visto era già funzionante e connesso a un database reale.

L'applicazione permette di:

-   Tenere un archivio dei modelli, ognuno classificato come solo
    agenzia, legato a una scuola partner (MD), oppure legato a un
    agente.

```{=html}
<!-- -->
```
-   Registrare i contratti con il cliente, le date e il tipo di
    inserimento (esclusiva o non).

-   Registrare ogni singolo incasso ricevuto dal cliente su quel
    contratto.

-   Calcolare automaticamente le provvigioni su ogni incasso, seguendo
    le regole contrattuali in vigore.

-   Gestire i rinnovi contrattuali con notifiche e conferma dall'app.

-   Dare accesso separato alla scuola MD e agli agenti, ognuno limitato
    ai propri dati.

Il calcolo delle provvigioni è completamente automatico. Basta
registrare un incasso e il sistema distribuisce le quote a tutte le
parti coinvolte.

# **Chi usa l'app e cosa vede**

  -----------------------------------------------------------------------
  **Utente**     **Accesso**        **Cosa vede**
  -------------- ------------------ -------------------------------------
  Hunt Models    Completo           Tutto: modelli, contratti, incassi,
                                    provvigioni, agenti, scuole

  Scuola MD      Sola lettura       Solo i propri allievi: contratti,
                                    incassi, quota MD e quota Giorgio

  Agente         Sola lettura       Solo i propri modelli: contratti,
                                    incassi, sua provvigione
  -----------------------------------------------------------------------

Ogni utente accede con email e password. Scuola e agenti non possono
modificare nulla.

#  

# **Come funzionano le provvigioni**

Le provvigioni si calcolano su ogni singolo incasso registrato, non
sull'importo totale del contratto. Il contratto è un contenitore che
raccoglie i pagamenti nel tempo.

## **Tre tipi di modello**

  ------------------------------------------------------------------------
  **Tipo modello**  **Partner            **Note**
                    coinvolti**          
  ----------------- -------------------- ---------------------------------
  Solo agenzia      Nessuno              100% del incasso va a Hunt Models

  Modello MD        MD + Giorgio         Scuola e agente sono mutualmente
  (scuola)                               esclusivi

  Modello con       Agente               Scuola e agente sono mutualmente
  agente                                 esclusivi
  ------------------------------------------------------------------------

## **Provvigioni MD (scuola)**

Il periodo parte dalla data del primo incasso effettivamente registrato
su quel modello, non dalla firma del contratto.

  ------------------------------------------------------------------------
  **Periodo dall'      **Quota MD**   **Note**
  primo incasso**                     
  -------------------- -------------- ------------------------------------
  Mesi 0--6            8%             Su ogni incasso in questo periodo

  Mesi 7--12           5%             

  Mesi 13--18          3%             

  Mesi 19--24 (solo se 5%             Proroga automatica
  totale \<€2.000)                    

  Oltre il 18° mese    0%             Revenue share terminato
  (se totale ≥€2.000)                 
  ------------------------------------------------------------------------

Il sistema calcola automaticamente il totale degli incassi del modello e
attiva la proroga se necessario. Non serve farlo a mano.

## **Quota Giorgio**

Giorgio è un accordo interno che si applica automaticamente su tutti i
modelli provenienti da MD. Non è configurabile come un agente normale.

Calcolo su ogni incasso di un modello MD:

-   Si calcola prima la quota MD (secondo la fascia di periodo).

-   Sul residuo che rimane a Hunt Models, Giorgio prende il 20%.

-   Hunt Models incassa il restante 80% del residuo.

**Esempio:** incasso €1.000, periodo mese 3 (fascia 8%). MD prende €80.
Residuo Hunt Models: €920. Giorgio prende 20% di €920 = €184. Hunt
Models incassa €736.

## **Provvigioni agente**

Il periodo parte dalla data del primo job confermato, non dal primo
incasso.

  ------------------------------------------------------------------------
  **Periodo dal primo  **Esclusiva**   **Non           **Note**
  job**                                esclusiva**     
  -------------------- --------------- --------------- -------------------
  Mesi 1--12           10%             7%              Su ogni incasso

  Dal mese 13 in poi   5%              5%              A tempo
                                                       indeterminato
  ------------------------------------------------------------------------

# **Contratti e rinnovi**

I contratti hanno una durata standard di 2 anni con rinnovo automatico.
L'app gestisce il ciclo completo.

## **Avviso di scadenza**

-   60 giorni prima della scadenza: avviso visibile nella dashboard
    dell'agenzia.

-   Contemporaneamente, viene inviata una mail all'indirizzo
    dell'agenzia con i dettagli del contratto in scadenza.

## **Conferma rinnovo**

Dalla dashboard, con un bottone dedicato su ogni contratto in scadenza,
l'agenzia può confermare il rinnovo. Il sistema estende automaticamente
la data di fine di altri 2 anni e aggiorna lo stato.

Se il rinnovo non viene confermato entro la scadenza, il contratto passa
allo stato \"scaduto\" e rimane visibile ma non genera più provvigioni.

#  

# **Cosa resta da fare**

La base tecnica è già pronta. Queste sono le funzionalità da completare
rispetto alla versione precedente.

  -----------------------------------------------------------------------
  **Cosa**                        **Ore        **Note**
                                  stimate**    
  ------------------------------- ------------ --------------------------
  Aggiornamento schema dati       2h           Base per tutto il resto
  (incassi come entità separata)               

  Registrazione incassi per       2h           Form + lista per contratto
  contratto                                    

  Calcolo provvigioni su incasso  2h           Logica SQL
  (MD + Giorgio + agente)                      

  Tracciamento primo incasso e    1h           Data di partenza periodi
  primo job confermato                         

  Proroga automatica MD a 24 mesi 1h           Trigger automatico
  se \<€2.000                                  

  Login e accesso separato per    1h           Come la scuola, portale
  agenti                                       sola lettura

  Avviso scadenza contratti in    1h           60 giorni prima
  dashboard                                    

  Mail avviso scadenza + conferma 1h           Supabase Edge Functions
  rinnovo                                      

  Aggiornamento portale MD e      2h           Nuova vista provvigioni
  agenti con dati incassi                      

  Validazione: scuola e agente    1h           Form + DB constraint
  mutualmente esclusivi                        
  -----------------------------------------------------------------------

**Totale stimato: 1**5 ore

# **Costi**

## **Sviluppo**

Fattura solo le ore effettivamente lavorate. A ogni consegna ricevi un
riepilogo di cosa è stato fatto e quante ore ho impiegato.

## **Costi mensili dell'applicazione**

  -----------------------------------------------------------------------
  **Voce**                    **Costo**       **Note**
  --------------------------- --------------- ---------------------------
  Hosting applicazione        €0/mese         Gratuito, adeguato per uso
                                              interno

  Database e backup           €0/mese         Backup giornaliero incluso
  automatico                                  

  Invio mail automatiche      €0/mese         Fino a 500 mail/mese
                                              gratuite

  Indirizzo web               \~€10/anno      Opzionale
  personalizzato                              

  **Totale mensile**          **€0**          Per uso interno: fino a
                                              \~20 utenti e qualche
                                              centinaio di contratti
  -----------------------------------------------------------------------

# **Privacy e dati personali**

L'applicazione archivia nomi, cognomi e dati economici di persone
fisiche. Si applica il GDPR.

## **Cosa è già a posto**

-   Dati ospitati su server europei (Irlanda/Francoforte) --- nessun
    trasferimento fuori dall'UE.

-   Connessione cifrata (HTTPS) in automatico.

-   Backup giornaliero incluso.

-   Accesso limitato per ruolo: ogni utente vede solo i dati di sua
    competenza.

## **Cosa va fatto prima di usarlo**

**Firmare un DPA (Data Processing Agreement)** tra l'agenzia (titolare)
e chi sviluppa (responsabile). Template gratuiti disponibili online, non
serve un avvocato.

## **Cosa non serve fare**

-   Nessun DPO obbligatorio (trattamento non su larga scala).

-   Nessuna analisi d'impatto (dati non sensibili).

-   Nessuna registrazione a registri nazionali.

# **Prossimi passi**

Per partire mi servono due informazioni:

-   L'indirizzo email dell'agenzia per ricevere le notifiche di scadenza
    contratti.

-   La preferenza sull'indirizzo web: automatico (gratuito, tipo
    huntmodels.vercel.app) o personalizzato (\~€10/anno, tipo
    gestionale.huntmodels.it).

Domanda aperta: vuoi che anche la scuola MD e gli agenti ricevano una
notifica email quando viene registrato un nuovo incasso che li riguarda?
