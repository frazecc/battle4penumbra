================================================================================
BATTLE FOR PENUMBRA – SITUAZIONE ATTUALE
File: situazione-attuale.txt
Ultimo aggiornamento: 4 Novembre 2026 – consegna 018
================================================================================

ISTRUZIONE OBBLIGATORIA – VERSIONE
--------------------------------------------------------------------------------
A OGNI CONSEGNA è OBBLIGATORIO:
1. Aggiornare la costante APP_VERSION in js/app.js (es. "018", "019", ...)
2. Aggiornare il testo versione in index.html (span #app-version)
3. Scrivere il numero di consegna in questo file (situazione-attuale.txt)
Il numero di versione = numero di consegna.
Serve a FRA per sapere quale versione sta testando dopo ogni commit.


ISTRUZIONE OBBLIGATORIA PER OGNI CHAT / IA
--------------------------------------------------------------------------------
1. Aggiornare questo file a ogni modifica/consegna
2. Consegne solo file modificati + questo file in cartella numerata
3. Non reinventare regole già decise
4. Italiano semplice, passi piccoli, domande chiare


================================================================================
COSA È IL GIOCO (riassunto)
================================================================================
Battle for Penumbra = gioco di carte tattico online free-to-play su mappa
esagonale, con nebbia di guerra, draft a bustine, Artefatto, Mostrissimi,
eventi di zona e templi.

Sempre 4 templi / 4 entità.
Partita Base: 1 umano + IA + eventuali templi già caduti (0–2).


================================================================================
COSE FATTE
================================================================================
- Versione visibile in home (v018)
- Log molto più verboso (timestamp + turno + anche in console browser)
- Log di avvio partita con stato di tutte le entità
- Protezione sconfitta Artefatto al turno 1 se ancora in mano
- Draft senza flash di buste inutili
- Click creatura → solo anteprima; Muovi solo dal bottone
- Avvizzito, primo movimento gratuito, carte illuminate, ecc.


================================================================================
COSE DA FARE A BREVE
================================================================================
1. Sistemare eventuali bug residui del movimento (se ancora presenti)
2. Completare timing trappole
3. Completare effetti carte a metà
4. Verificare eventi zone speciali
5. UX mappa mobile


================================================================================
ULTIME CONSEGNE
================================================================================
018 – Versione in home (v018) + log verboso obbligatorio
     File: index.html, js/app.js, js/game.js

017 – Fix click creatura (solo anteprima, non auto-Muovi)
016 – Fix sconfitta turno 1 + draft solo buste selezionabili
015 – Dimensioni carte standard + ordine tipi + fix Muovi
…


================================================================================
FINE – Aggiornare versione + questo file a ogni consegna
================================================================================
