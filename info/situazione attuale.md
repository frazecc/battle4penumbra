================================================================================
BATTLE FOR PENUMBRA – SITUAZIONE ATTUALE DEL PROGETTO
Data analisi: 4 Novembre 2026
Repository: https://github.com/frazecc/battle4penumbra
StackBlitz: https://stackblitz.com/~/github.com/frazecc/battle4penumbra
================================================================================

ISTRUZIONE OBBLIGATORIA:
questo file deve essere aggiornato ogni singola volta che un file viene modificato

================================================================================
1. PANORAMICA GENERALE
================================================================================

Il progetto è un MVP (Minimum Viable Product) funzionante di "Battle for Penumbra".
Si tratta di un gioco di carte tattico browser-based con mappa esagonale, draft,
combattimento e AI.

Stato complessivo: **MVP giocabile in PvE (Partita Base)** con molte feature del
design document già implementate in forma semplificata, ma diverse meccaniche
avanzate ancora assenti o incomplete.

Stack tecnologico:
- Vanilla HTML + CSS + JavaScript (nessun framework)
- Vite come bundler/dev server
- localStorage per autenticazione (pronto per upgrade a Supabase)
- Canvas 2D per rendering mappa esagonale
- Nessun backend server-side (tutto client-side)

Struttura file principale:
- index.html          → Schermate (auth, home, setup, draft, game)
- css/style.css       → Tema scuro completo
- js/auth.js          → Sistema login/registrazione/sessione
- js/data.js          → Mappa (159 celle) + catalogo carte + costanti
- js/game.js          → Motore di gioco completo (Entity, GameState, AI, combat)
- js/map.js           → Renderer canvas + interazione (zoom, pan, click, fog)
- js/app.js           → Orchestrazione UI e flussi

================================================================================
2. COSA È IMPLEMENTATO (STATO REALE)
================================================================================

### 2.1 Autenticazione (auth.js) – COMPLETO
- Registrazione e login con username/password
- Persistenza su localStorage
- Conferma sessione "Sono io / Non sono io" dopo 12 ore
- Logout
- Password in chiaro (nota: da hashare in produzione)

### 2.2 Flusso UI (app.js + index.html) – COMPLETO per Partita Base
- Schermata Auth
- Homepage con 4 card (solo "Partita Base" attiva)
- Setup partita: numero IA (1-3) + Templi Caduti (0-2)
- Forzatura a 4 entità totali (riempie con filler fallen se necessario)
- Schermata Draft interattiva
- Schermata di gioco a 3 colonne (entità | canvas | log)
- Modal di fine partita (vittoria/sconfitta)
- Mana display, bottone Termina Turno, Annulla azione

### 2.3 Mappa (data.js + map.js) – COMPLETA e FEDELE
- 159 celle esatte secondo specifica:
  - 70 montagne
  - 84 pianure
  - 4 templi (acqua) con etichette A/B/C/D
  - 1 altare/città centrale (0,0) con stella
- Geometria pointy-topped, coordinate assiali (q,r)
- Formule di conversione pixel corrette
- Colori esatti da specifica (#5D4037 mountain, #7CB342 plain, ecc.)
- Sfondo #0D1B2A
- Zoom (rotella) + pan (drag)
- Hover highlight
- Nebbia di guerra (visibilità raggio 2 dalle creature + tempio + explored)
- Montagne invalicabili

### 2.4 Draft (game.js) – IMPLEMENTATO
- 3 pacchetti da 3 carte ciascuno
- Colori diversi (evita ripetizioni quando possibile)
- Ordine di scelta: [1, 0, 0, 1, 1, 0] dove 0=umano, 1=IA
  (corrisponde a: IA → Umano → Umano → IA → IA → Umano)
- AI sceglie in automatico con scoring semplice
- Al termine: consegna Artefatto a ogni giocatore attivo
- 6 pick totali → 9 carte draft + 1 Artefatto in mano

### 2.5 Sistema Entità e Turni – IMPLEMENTATO
- Sempre 4 entità
- Mana: parte da 1/1, +1 max + refill a inizio turno
- Turn order orario (skippa i fallen)
- Primo giocatore casuale tra gli attivi
- Condizione di sconfitta Artefatto: se a fine turno non è sul campo → isFallen = true
- Vittoria: rimane un solo giocatore non-fallen

### 2.6 Gioco di Carte e Campo – PARZIALE
- Selezione carta dalla mano → click su esagono
- Posizionamento Mostri e Artefatto (solo su celle non-montagna, non occupate, visibili)
- Maledizioni: vengono pagate e vanno al cimitero (effetto NON risolto)
- Trappole: presenti nel catalogo ma NON giocabili (nessun sistema di trigger/popup)
- Movimento: 1 mana per passo adiacente
- Combattimento:
  - Se ATK ≥ PV → distrugge e occupa
  - Altrimenti danno + contrattacco
  - Supporto base scudi
  - Se il permanente con Artefatto muore → Artefatto torna in mano con +3 costo

### 2.7 AI (runAITurn) – LIVELLO B+ FUNZIONANTE
Priorità:
1. Piazza l’Artefatto se non è sul campo
2. Evoca la creatura più costosa giocabile
3. Attacca se vantaggioso
4. Avanza verso le unità umane
Poi termina automaticamente il turno.

### 2.8 Catalogo Carte (data.js) – PARZIALE
Presenti:
- 15 Mostri (5 economici, 5 standard, 5 potenti)
- 10 Maledizioni (5 costo 3 + 5 costo 5)
- 5 Trappole costo 1
- Artefatto speciale

Assenti dal catalogo implementato:
- Mostrissimi (pool pubblica)
- Trappole di costo 4 e 6
- Effetti reali delle carte (solo testo descrittivo, quasi nessun trigger eseguito)
- Sistema di ETB / fine turno / trigger

================================================================================
3. COSA MANCA RISPETTO AL DESIGN DOCUMENT ORIGINALE
================================================================================

### 3.1 Sistemi completamente assenti
- Mostrissimi e pool pubblica (3 slot, refill, sacrifici 0-6, posizione su Altare/Circolo)
- Eventi di fine turno (flipping cella + bonus/malus colore)
- Quest del Quest-Giver (3 indizi + condizioni di completamento)
- Circoli Rituali
- Sistema di Trappole (popup interattivo nel turno avversario)
- Risoluzione effettiva degli effetti delle carte (ETB, maledizioni, ecc.)
- Token di status/scudi visivi avanzati
- Condizione di vittoria per completamento Quest
- Multiplayer umano (1v1, 1v1v1, 1v1v1v1) – solo UI placeholder
- Classifica
- Codex

### 3.2 Meccaniche incomplete o semplificate
- Effetti carte: solo testo, quasi nessun codice che li applica
- Nebbia di guerra: implementata, ma “explored” rimane permanente (non c’è unforget)
- Movimento in terreno inesplorato: regola “non più di un passo” parzialmente rispettata
- Cimitero privato + log pubblico: log c’è, cimitero esiste ma non consultabile
- Artefatto: meccanica base ok, ma non si “lega” visualmente a un permanente in modo chiaro
- Draft: ordine leggermente diverso dalla specifica testuale originale (ma funzionante)
- Templi Caduti: esistono come entità fallen, ma non influenzano la mappa

### 3.3 UI / UX mancanti
- Visualizzazione scudi/token sulle unità
- Indicatore chiaro di quale permanente ha l’Artefatto attaccato
- Animazioni di combattimento / movimento
- Popup per trappole
- Schermata di selezione bersaglio per maledizioni
- Codex e regole in-game

================================================================================
4. QUALITÀ DEL CODICE ATTUALE
================================================================================

Punti di forza:
- Codice leggibile e ben commentato per sezioni
- Separazione responsabilità (auth / data / game / map / app)
- Mappa geometricamente corretta e fedele alla specifica
- AI già in grado di giocare una partita completa
- Condizione di sconfitta Artefatto già attiva e rigorosa
- Fog of war funzionante

Debolezze / debito tecnico:
- Tutto client-side (facilmente barabile)
- Password in chiaro
- Quasi nessun effetto carta effettivamente eseguito
- Nessun test automatico
- AI ancora molto semplice (non usa maledizioni, non gestisce trappole)
- Nessuna gestione di stack o priorità di effetti
- game.js è già abbastanza lungo (~550 righe) e continuerà a crescere

================================================================================
5. ALLINEAMENTO CON IL DESIGN DOCUMENT (SINTESI)
================================================================================

| Area                      | Allineamento | Note                                      |
|---------------------------|--------------|-------------------------------------------|
| Mappa 159 celle           | 100%         | Identica alla specifica                   |
| Auth + sessione           | 95%          | Manca solo backend reale                  |
| Draft 3 pack × 3          | 90%          | Ordine leggermente diverso ma ok          |
| Mana e turni              | 95%          | Corretto                                  |
| Artefatto + sconfitta     | 85%          | Funziona, manca visualizzazione legame    |
| Combattimento base        | 80%          | Rimbalzo non implementato come da design  |
| Nebbia di guerra          | 85%          | Funziona                                  |
| Catalogo carte            | 40%          | Solo subset + nessun effetto attivo       |
| Mostrissimi               | 0%           | Assenti                                   |
| Eventi / Quest / Circoli  | 0%           | Assenti                                   |
| Trappole interattive      | 0%           | Solo dati, nessun sistema                 |
| Multiplayer umano         | 0%           | Solo placeholder UI                       |

================================================================================
6. PRIORITÀ CONSIGLIATE PER LO SVILUPPO FUTURO
================================================================================

Fase A – Rendere le carte vive (alta priorità)
1. Sistema di risoluzione effetti (ETB, maledizioni con targeting)
2. Scudi e token visivi
3. Trappole con popup nel turno avversario

Fase B – Sistemi di mid-game
4. Mostrissimi + pool pubblica + sacrifici
5. Eventi di fine turno + flipping celle
6. Quest

Fase C – Completezza e multiplayer
7. Condizione di vittoria Quest
8. Multiplayer reale (WebSocket / Supabase Realtime)
9. Codex e bilanciamento

================================================================================
7. NOTE TECNICHE UTILI
================================================================================

- La mappa è definita una sola volta in data.js (MOUNTAINS, PLAINS, TEMPLES, CITY)
- CELL_TYPE è una Map usata sia dal motore che dal renderer
- hexDistance è implementata correttamente
- L’Artefatto è un’istanza speciale con currentCost che aumenta di +3 ogni volta che torna in mano
- Gli effetti delle carte sono attualmente solo stringhe descrittive
- L’AI non gioca mai maledizioni né trappole

================================================================================
FINE ANALISI – SITUAZIONE ATTUALE
Questo file è la fonte di verità sullo stato reale del codice.
Deve essere aggiornato ogni volta che un file del progetto viene modificato.
================================================================================
