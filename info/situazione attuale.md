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
BATTLE FOR PENUMBRA – consegna 025 – VERSION: v025
NEW
Max 1 Mostrissimo evocabile per proprio turno
Generazione mappa speciali:
• esattamente 3 Teletrasporto
• 1–2 Circoli Rituali
• 1× ciascuno: Villaggio, Cimitero, Rovine, Santuario, Jungla, Colosseo, Statua, Mercato
Mazzi eventi (≥10 carte) per ogni tipo tranne Teletrasporto
(pesca uniforme = rimischio immediato)
Fine turno:
flip celle occupate da creature
risoluzione teletrasporti + passo obbligatorio
1 evento: se più luoghi, popup
"Il tuo destino ti attende... dove succederà?"
File design: tessere_e_mazzi_eventi.txt
FILE: js/data.js, js/game.js, js/app.js, index.html, tessere_e_mazzi_eventi.txt
HOTFIX
data.js: ripristinati ALL_CARDS / MOSTRISSIMI (erano stati persi nella sostituzione zone)
EVENT_DECKS + generateSpecialZones integrati correttamente
================================================================================