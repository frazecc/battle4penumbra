================================================================================
BATTLE FOR PENUMBRA – REGOLE DI CONSEGNA (ONNIPRESENTI – NON CANCELLABILI)
================================================================================
1. Ogni modifica → SOTTOCARTELLA NUOVA (mai modificare consegne già consegnate).
2. Aggiornare VERSION e questo file.
================================================================================
BATTLE FOR PENUMBRA – consegna 029 – VERSION: v029
================================================================================
FIX CRITICO – Movimento
- Mancava il metodo _commitMove (e confirmEnemyTempleEntry / confirmTempleOverwrite)
  → crash: "this._commitMove is not a function" su ogni spostamento (umano e IA)
- Metodi reinseriti nella classe GameState

FILE: js/game.js, js/app.js, index.html
================================================================================
