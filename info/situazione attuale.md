================================================================================
BATTLE FOR PENUMBRA – SITUAZIONE ATTUALE
Ultimo aggiornamento: 5 Novembre 2026 – consegna 020
VERSIONE: v020
================================================================================

ISTRUZIONE OBBLIGATORIA – VERSIONE
A ogni consegna aggiornare: APP_VERSION in app.js, span in index.html, questo file.


FIX IN QUESTA CONSEGNA (020)
1) MOVIMENTO / ANTEPRIMA
   - Click creatura → SOLO anteprima (Annulla / Muovi), mai moveMode automatico
   - Muovi → chiude anteprima, evidenzia caselle legali in verde, log chiaro
   - Click casella legale → si muove e NON riapre l’anteprima
   - Lega Artefatto → SOLO attach, non apre anteprima né attiva Muovi
   - Listener mappa legati una sola volta (niente doppi click)

2) ARTEFATTO E EVENTI DI ZONA
   - Gli eventi di fine turno NON possono più uccidere il portatore dell’Artefatto
   - Se il colpo sarebbe mortale: "L'Artefatto protegge [nome]: il colpo viene
     assorbito (resta a 1 PV)"


FILE MODIFICATI
- js/map.js
- js/game.js
- js/app.js
- index.html


COME TESTARE
1. Home → v020
2. Lega l’Artefatto a una creatura → NON deve aprirsi l’anteprima
3. Click sulla creatura → anteprima con Annulla / Muovi
4. Muovi → caselle verdi evidenziate; Annulla (bottone in alto) esce dalla modalità
5. Click casella verde → creatura si sposta, anteprima NON si riapre
6. A fine turno, se esce Trappola d’Erba sul portatore dell’Artefatto → resta a 1 PV
================================================================================
