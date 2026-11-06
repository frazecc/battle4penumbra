================================================================================
BATTLE FOR PENUMBRA – REGOLE DI CONSEGNA (ONNIPRESENTI – NON CANCELLABILI)
================================================================================

1. Ogni modifica → SOTTOCARTELLA NUOVA (mai modificare consegne già consegnate).
2. Aggiornare sempre VERSION e questo file.
3. Modifiche solo chirurgiche.

================================================================================
BATTLE FOR PENUMBRA – consegna 028 – VERSION: v028
================================================================================

FIX – Movimento
- tryMoveOrAttack: normalizza q/r a Number, riallinea selectedUnit al campo live
- In caso di click non valido NON esce più da moveMode
- Log di debug con coordinate se dist ≠ 1

CHANGE – Mostrissimi
- Evocabili SOLO su Altare (city) o Circolo Rituale dopo sacrificio lì
- Non più sui Templi
- Costo 0: piazzabili su Altare/Circolo liberi

NEW – Salvataggio partita
- Auto-save su localStorage (per account, stesso dispositivo) a ogni aggiornamento UI
- Home: «Continua partita» e «Importa codice partita»
- In partita: pulsante 💾 esporta codice (copiabile su altro dispositivo)
- Nota: localStorage non sincronizza da solo tra device → usare Esporta/Importa

FILE: js/game.js, js/map.js, js/app.js, js/auth.js, index.html
================================================================================
