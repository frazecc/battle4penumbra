================================================================================
BATTLE FOR PENUMBRA – REGOLE DI CONSEGNA (ONNIPRESENTI – NON CANCELLABILI)
Queste regole devono essere rispettate in OGNI chat e in OGNI consegna futura.
Non possono essere rimosse, ignorate o sovrascritte.
Ogni modifica deve essere consegnata in una SOTTOCARTELLA dedicata
(es. consegna-023/, consegna-024/, ecc.)
Ad ogni consegna si DEVE aggiornare il numero di VERSIONE
(v022 → v023 → v024 …)
Ad ogni consegna si DEVE aggiornare questo file "situazione attuale"
con:
nuovo numero di versione
elenco chiaro delle modifiche (FIX / NEW / CHANGE)
lista dei file toccati
Non si toccano parti del codice non richieste dalla consegna corrente
(modifiche chirurgiche).
Alla fine di ogni lavoro si consegna la sottocartella pronta
e il file situazione attuale aggiornato.
================================================================================
BATTLE FOR PENUMBRA – consegna 023 – VERSION: v023
NEW – Flusso interattivo di evocazione Mostrissimi
Clic sul Mostrissimo dal pool → entra in modalità Sacrificio
Contatore in alto: "Sacrificati: X / Y — Nome Mostrissimo"
Clic sulle proprie creature una alla volta per sacrificarle
Ogni creatura va al cimitero tramite _destroyUnit
Le morti a catena (on-death di altre creature) NON contano
Se la creatura sacrificata stava su Altare (city) o Circolo Rituale,
quella cella viene sbloccata come destinazione legale
Quando si raggiunge esattamente il numero di sacrifici richiesti:
Passa automaticamente in modalità Evoca
Caselle legali (oro + pulse):
• sempre il proprio Tempio (se libero)
• + Altare / Circoli su cui è stata sacrificata una creatura
Clic sulla casella scelta → Mostrissimo entra in campo (avvizzito)
Bottone Annulla interrompe tutta la procedura
CHANGE
I Mostrissimi NON si possono più piazzare liberamente su qualsiasi
Tempio / Altare / Circolo.
Non esiste più il sacrificio automatico dei primi N permanenti.
FILE: js/game.js, js/map.js, js/app.js, index.html