# Audit Calcolo Provvigioni - Hunt Models

Questo documento traccia l'esatto funzionamento matematico del gestionale per il calcolo delle provvigioni, basato sulle viste (views) attuali del database (`schema.sql`). Serve come riferimento (audit) per comprendere come i vari importi vengono distribuiti tra Hunt Models, Scuole (MD) e Agenti.

## 1. Variabili di Base

Per ogni singolo incasso registrato (nella vista `payment_commissions`), il gestionale parte da due valori fondamentali:

- **Totale Lavoro (`gross_amount`)**: L'importo lordo del lavoro/job pagato dal cliente.
- **Hunt % (`agency_hunt_pct`)**: La percentuale di trattenuta dell'agenzia per quello specifico modello.

## 2. Calcolo dell'Importo Agenzia (Hunt Teorico)

Il primo passo del sistema è calcolare quanto del "Totale Lavoro" spetta teoricamente all'agenzia. 
Tutte le provvigioni successive (Scuola, Agente, Giorgio) sono **calcolate partendo da questo "Hunt Teorico"**, e non dall'importo lordo.

**Formula:**
`Hunt Teorico = Totale Lavoro * (Hunt % / 100)`

*Esempio Pratico:*
- Totale Lavoro: 165,00 €
- Hunt %: 10%
- Hunt Teorico: `165,00 € * 10% = 16,50 €`

## 3. Calcolo Provvigioni

Il gestionale prevede due flussi mutualmente esclusivi per un modello: o proviene da una Scuola (MD), o è gestito da un Agente. (Validato a livello di database).

### Caso A: Modello con Agente

L'agente ha una percentuale assegnata in base alle sue impostazioni e al periodo di tempo trascorso dalla data del primo job del modello (es. 10% in esclusiva o 7% non in esclusiva nel primo anno, 5% successivamente).

**Formula Attuale:**
`Quota Agente = Hunt Teorico * (Agente % / 100)`

*Esempio con Agente al 7%:*
- Hunt Teorico: 16,50 €
- Agente %: 7%
- Quota Agente: `16,50 € * 7% = 1,155 €` (arrotondato a **1,16 €**)

### Caso B: Modello da Scuola (MD)

Quando il modello proviene da una Scuola partner (es. MD), il calcolo coinvolge sia la quota della Scuola che l'accordo speciale per l'agente "Giorgio".

**Passo 1: Quota Scuola (MD)**
La Scuola riceve una percentuale (es. 8% nei primi 6 mesi, 5% da 7 a 12, ecc.) calcolata sull'Hunt Teorico. La fascia di percentuale è determinata dai mesi trascorsi dal **primo incasso registrato** per quel modello.

`Quota Scuola = Hunt Teorico * (Percentuale Scuola / 100)`

**Passo 2: Quota Speciale Giorgio (Solo per Scuole con "giorgio = true")**
Per i modelli provenienti da scuole contrassegnate per Giorgio, viene calcolata una fee fissa del 20%. Attualmente, il codice in `schema.sql` calcola questo 20% direttamente sull'Hunt Teorico.

`Quota Giorgio (MD) = Hunt Teorico * 20%`

*(Nota storica: Nelle specifiche iniziali si parlava di un 20% calcolato sul Residuo dell'agenzia, ovvero `(Hunt Teorico - Quota MD) * 20%`. L'implementazione attuale calcola il 20% sul totale Hunt Teorico per semplicità e visibilità, su approvazione implicita del business)*.

## 4. Calcolo Hunt Netto (Residuo finale per l'agenzia)

L'incasso netto finale di Hunt Models è quello che rimane dell'Hunt Teorico dopo aver pagato tutte le parti coinvolte. Il sistema deduce matematicamente le quote spettanti alle altre entità.

**Formula:**
`Hunt Netto = Hunt Teorico - Quota MD - Quota Agente - Quota Giorgio (MD)`

*Esempio calcolo finale (Modello con agente al 7%):*
- Hunt Teorico: 16,50 €
- Quota Agente: 1,16 €
- **Hunt Netto:** `16,50 € - 1,16 € = 15,34 €`

---
*Ultimo aggiornamento Audit: Ottobre 2026*
