================================================================================
BATTLE FOR PENUMBRA – SITUAZIONE ATTUALE DEL PROGETTO
Data analisi: 4 Novembre 2026 (aggiornato dopo implementazione sistemi mancanti)
Repository: https://github.com/frazecc/battle4penumbra
Cartella locale aggiornata: /home/workdir/artifacts/battle4penumbra/
================================================================================

ISTRUZIONE OBBLIGATORIA:
questo file deve essere aggiornato ogni singola volta che un file viene modificato

================================================================================
1. PANORAMICA GENERALE
================================================================================

Il progetto è un MVP avanzato di "Battle for Penumbra".
Gioco di carte tattico browser-based con mappa esagonale, draft, combattimento,
AI, effetti carte, trappole, Mostrissimi ed eventi di terreno.

Stack:
- Vanilla HTML + CSS + JavaScript
- Vite
- localStorage (auth)
- Canvas 2D

File principali (versione aggiornata in artifacts/battle4penumbra/):
- index.html
- css/style.css
- js/auth.js
- js/data.js          ← AGGIORNATO (catalogo + Mostrissimi + effetti strutturati)
- js/game.js          ← RISCRITTO (motore completo)
- js/map.js           ← AGGIORNATO (scudi, anello Artefatto, targeting)
- js/app.js           ← AGGIORNATO (popup trappole, pannello Mostrissimi)

================================================================================
2. SISTEMI IMPLEMENTATI (STATO DOPO L'AGGIORNAMENTO)
================================================================================

### Completati / Funzionanti
- Autenticazione (login, register, sessione "Sono io")
- Setup partita (IA + Templi Caduti → sempre 4 entità)
- Draft 3 pack × 3 carte, ordine 2-1-1-2-2-1
- Mappa 159 celle esatta + fog of war raggio 2
- Mana (+1 max + refill a inizio turno)
- Artefatto + condizione di sconfitta a fine turno
- Combattimento con **rimbalzo** (se non uccidi torni alla cella di partenza)
- Scudi (visivi + funzionali)
- Indicatore Artefatto (anello dorato sull'unità)
- **Sistema effetti strutturati** (effectId) per:
  - ETB dei Mostri
  - Maledizioni con targeting (click su unità)
  - Trappole reattive
  - Mostrissimi
- **Trappole**: restano in mano, si attivano con popup nel turno avversario
  (trigger: on_attack, after_damage, on_death)
- **Mostrissimi**: pool pubblica di 3, costi sacrificio diversi, evocabili
  solo su Altare (0,0) o Templi, con sacrificio di permanenti
- **Eventi di fine turno**: flipping cella + bonus/malus legati al terreno
- AI migliorata (piazza Artefatto, evoca, lancia maledizioni, attacca, avanza)
- Vittoria per ultimo giocatore rimasto

### Ancora assenti / da completare
- Quest del Quest-Giver (3 indizi + condizione di vittoria alternativa)
- Circoli Rituali come elementi di mappa distinti (attualmente si usano Templi/Altare)
- Multiplayer umano reale
- Classifica e Codex
- Animazioni
- Targeting più raffinato per effetti AoE e multi-target
- Backend reale (tutto ancora client-side)

================================================================================
3. ALLINEAMENTO CON IL DESIGN DOCUMENT (AGGIORNATO)
================================================================================

| Area                      | Allineamento | Note                                      |
|---------------------------|--------------|-------------------------------------------|
| Mappa 159 celle           | 100%         | Identica                                  |
| Auth + sessione           | 95%          | localStorage                              |
| Draft                     | 95%          | Ordine corretto                           |
| Mana e turni              | 95%          | Corretto                                  |
| Artefatto + sconfitta     | 95%          | Funziona + indicatore visivo              |
| Combattimento + rimbalzo  | 95%          | Implementato secondo design               |
| Nebbia di guerra          | 90%          | + clear fog da Mostrissimi                |
| Effetti carte (ETB/curse) | 85%          | Maggior parte mappata e funzionante       |
| Trappole interattive      | 80%          | Popup + trigger principali                |
| Mostrissimi + pool        | 85%          | Pool, sacrifici, evocazione su Altare/Tempio |
| Eventi di fine turno      | 70%          | Flipping + eventi terreno base            |
| Quest                     | 0%           | Non ancora implementata                   |
| Multiplayer umano         | 0%           | Solo placeholder UI                       |

================================================================================
4. COME USARE I NUOVI SISTEMI
================================================================================

1. **Maledizioni con target**: seleziona la carta → clicca un'unità sulla mappa.
2. **Trappole**: restano in mano. Quando scatta un trigger (attacco/danno/morte)
   compare un popup per attivarle (se hai mana).
3. **Mostrissimi**: pannello a sinistra. Clicca un Mostrissimo della pool →
   clicca Altare o un Tempio. Servono N permanenti da sacrificare.
4. **Eventi**: a fine turno, ogni cella occupata per la prima volta genera un evento.
5. **Scudi**: badge blu sull'unità. Artefatto: anello dorato.

================================================================================
5. FILE MODIFICATI IN QUESTA SESSIONE
================================================================================

- js/data.js       → catalogo completo + MOSTRISSIMI + TERRAIN_EVENTS + effectId
- js/game.js       → motore completo (effetti, trappole, mostrissimi, rimbalzo, eventi)
- js/map.js        → scudi, anello Artefatto, click targeting
- js/app.js        → popup trappole + pannello Mostrissimi
- index.html       → modal trappole + contenitore Mostrissimi

================================================================================
6. PROSSIMI PASSI CONSIGLIATI
================================================================================

1. Testare una partita completa in StackBlitz / localmente
2. Implementare il sistema Quest (3 indizi + vittoria alternativa)
3. Raffinare targeting multiplo e AoE
4. Aggiungere feedback visivo (flash danno, animazioni)
5. Preparare deploy su Cloudflare Pages / GitHub Pages

================================================================================
FINE ANALISI – SITUAZIONE ATTUALE
Questo file è la fonte di verità sullo stato reale del codice.
Deve essere aggiornato ogni volta che un file del progetto viene modificato.
================================================================================


================================================================================
AGGIORNAMENTO 4 Nov 2026 – 10:05 CET
================================================================================
Fix applicati:
1. Setup: solo "Templi Caduti" (0/1/2). IA = 3 - caduti. Sempre 4 entità.
2. Draft a bustine: vedi 3 bustine con le 3 carte visibili, scegli intera bustina,
   si passa al prossimo, refill fino a 3 bustine. Ogni attivo prende 3 bustine (9 carte).
3. A inizio turno (e a inizio partita) ogni entità riceve "Spirito del Tempio" 1/1
   gratuito sul proprio tempio (se libero).
4. Unità proprie sempre visibili sulla mappa; render aggiornato dopo evocazione.
