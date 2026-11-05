================================================================================
BATTLE FOR PENUMBRA – SITUAZIONE ATTUALE
Ultimo aggiornamento: 5 Novembre 2026 – consegna 021
VERSIONE: v021
================================================================================

ISTRUZIONE OBBLIGATORIA – VERSIONE
A ogni consegna aggiornare: APP_VERSION in app.js, span in index.html, questo file.


NOVITÀ CONSEGNA 021 – Sistema popup azioni + impostazioni
--------------------------------------------------------------------------------
POPUP AZIONI
- Ogni azione di gioco genera un popup a schermo intero
- Un popup = una azione (in coda)
- Bottone "Ho capito" (blocca il gioco finché non clicchi)
- Bottone "Guarda mappa" (puoi vedere mappa/carte, poi "Torna al messaggio")
- Draft e fine partita usano lo stesso sistema
- Fine partita: bottone "Accetto il giudizio" (NON auto-skippabile)
- Transizione fade in/out
- Nome giocatore + icona tempio in alto nel popup

AUTO-HO-CAPITO
- Se attivo: il popup compare ~0,8s e si chiude da solo
- Non salta i messaggi con "Accetto il giudizio"

IMPOSTAZIONI (icona ⚙️ in alto a destra, sempre visibile)
- Auto-ho-capito
- Audio on/off (placeholder)
- Animazioni on/off
- Anti-epilessia
- Salvate per utente (localStorage)

FILE MODIFICATI
- js/app.js
- js/game.js
- index.html


COME TESTARE
1. Home → v021
2. Apri ⚙️ e attiva "Auto-ho-capito" se vuoi scorrere in fretta
3. Fai una partita: ogni mossa/evocazione/evento deve mostrare un popup
4. Prova "Guarda mappa" dentro un popup
5. Alla sconfitta/vittoria deve comparire "Accetto il giudizio"


PROSSIMO PASSO (con FRA)
- Filtrare quali eventi tenere nel popup (ora li mostriamo tutti)
================================================================================
