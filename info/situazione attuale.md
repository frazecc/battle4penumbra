================================================================================
BATTLE FOR PENUMBRA – SITUAZIONE ATTUALE
Ultimo aggiornamento: 4 Novembre 2026 – consegna 017
================================================================================

FIX IN QUESTA CONSEGNA
- Click su creatura in campo → apre SOLO l’anteprima (non entra più
  automaticamente in modalità Muovi)
- Solo cliccando il bottone “Muovi” nell’anteprima si attiva la modalità movimento
- Dopo il movimento la preview non si riapre più

FILE MODIFICATO
- js/map.js

COME TESTARE
1. Clicca una tua creatura → deve aprirsi l’anteprima con Annulla / Muovi
2. Clicca Muovi → chiude l’anteprima, sei in modalità movimento
3. Clicca una cella adiacente → la creatura si muove e NON si riapre l’anteprima
================================================================================
