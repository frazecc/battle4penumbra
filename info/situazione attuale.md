================================================================================
BATTLE FOR PENUMBRA – SITUAZIONE ATTUALE
Ultimo aggiornamento: 4 Novembre 2026 – consegna 019
VERSIONE: v019
================================================================================

ISTRUZIONE OBBLIGATORIA – VERSIONE
A ogni consegna aggiornare: APP_VERSION in app.js, span in index.html, questo file.


FIX IN QUESTA CONSEGNA (019)
- Impedito doppio avvio partita (_finishDraft e startGameUI protetti)
- I timeout dell’IA non possono più chiudere il turno dell’umano
- Se un timeout IA scatta quando è turno umano → viene ignorato e loggato

CAUSE DEL BUG “muoio senza fare nulla”
Dal log si vedeva:
1. PARTITA AVVIATA compariva DUE volte
2. I timeout dell’IA restavano appesi
3. Quando diventava turno di fra, un timeout chiamava endTurn() al posto suo
→ Artefatto ancora in mano → sconfitta immediata

FILE MODIFICATI
- js/game.js
- js/app.js
- index.html (versione v019)


COME TESTARE
1. Nuova partita, completa il draft
2. Controlla in home che sia v019
3. Lascia giocare le IA
4. Quando arriva il TUO turno, la partita deve ASPETTARE che tu clicchi “Termina Turno”
5. Non deve più morire da solo
================================================================================
