================================================================================
BATTLE FOR PENUMBRA – consegna 031 – VERSION: v031
================================================================================
FIX – Freeze dopo scelta carta evento
- Causa: dopo resolveCardPick/_finishEndTurn il turno passava al Tempio Caduto
  ma nessuno chiamava runAITurn()
- Aggiunto GameState._scheduleNextActor() chiamato a fine _finishEndTurn

UI – Scelta carte
- Due carte grandi e leggibili (stats + effetto a vista)
- Dettaglio carta (tasto destro) z-index 3000, sempre in primo piano

FILE: js/game.js, js/app.js, index.html
================================================================================
