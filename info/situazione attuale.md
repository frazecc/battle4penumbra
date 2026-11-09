================================================================================
BATTLE FOR PENUMBRA – consegna 036 – VERSION: v036
================================================================================
FIX resume partita
- resumeSavedGame: init mappa, gameUIStarted, pulizia pending, avvio IA se tocca
- carica da cloud o localStorage

LOGIN
- Se c'è sessione: "Riconosco questa presenza… sei tu?"
  - Sono io → home
  - Non sono io → form login/password

MAPPA
- Creature disegnate come carte miniature
  - ATK in basso a sinistra, PV in basso a destra
  - Icona tempio, striscia colore, bordo oro/rosso

FILE: js/app.js, js/map.js, index.html
================================================================================
