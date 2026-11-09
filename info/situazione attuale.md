================================================================================
BATTLE FOR PENUMBRA – situazione attuale – VERSION: v042
================================================================================

################################################################################
# SEZIONE DI ISTRUZIONI PER IA E PREFERENZE DI FRANCESCO
# (Francesco è l’utente che scrive. Questa sezione è MODIFICABILE ma NON RIMUOVIBILE.)
################################################################################

1) Non consegnare / non includere file tipo SUPABASE_SETUP.md (o guide Supabase)
   a meno che non sia strettamente necessario in quel momento.
2) Il file "situazione attuale" deve descrivere lo stato del sito e del gioco nella
   sua complessità, così che aprendo una chat nuova un’IA possa capire come funziona
   tutto senza rileggere l’intera history.
3) Il file tessere / mazzi eventi deve contenere l’elenco REALE di ciò che esiste
   già nel codice (non idee obsolete).
4) REGOLE DI CONSEGNA (onnipresenti, non cancellabili):
   - Ogni consegna in una NUOVA cartella (es. consegna-041/), mai modificare una
     consegna già consegnata.
   - Aggiornare sempre versione (APP_VERSION, badge sito, questo file).
   - Aggiornare sempre questo file situazione attuale.
5) Preferenze di gioco/UX già consolidate (sintesi):
   - Login: username corto → email user@test.local; sessione “Riconosco questa
     presenza… sei tu?” (Sono io / Non sono io).
   - Salvataggio partita OGGETTIVO (gameId, stato unico; base PvP).
   - Resume: “RIPRENDO le mie spoglie” / “ABBANDONO quel frammento…”.
   - Movimento multi-passo con path, conferma costo mana; 1° passo gratis.
   - Mostrissimi: sacrifici esatti; evocazione su Altare/Circolo (non più tempio);
     max 1 per turno; se tempio occupato in altri contesti → conferma.
   - Trappole: mai nel proprio turno; dopo evento non-trappola i giocatori successivi
     in ordine possono attivarne una; niente risposta a trappola; il gioco si ferma.
   - Caduti: 1 passo/turno, no mana/carte, eventi random, non vincono, cercano kill.
   - Fog: click non fa nulla; celle non scoperte non si spoilerano (mostrare
     “inesplorato”); si può terminare il path su non scoperta → avvizzisce.
   - UI creature in campo: mini-carta senza nome; ATK sx, PV dx.
   - Click cella: dettagli luogo + creatura (pannello).
   - Popup unificati (“Ho capito” dove previsto).
   - Draft: primo pack = colore principale + unica carta costo 6 di quel colore.

################################################################################
# COS’È IL PROGETTO
################################################################################

Web game turn-based su mappa esagonale: "Battle for Penumbra".
Stack: HTML/CSS/JS vanilla, opzionale Supabase (auth + salvataggio stato in tabella
`games`). File principali in consegna:

- index.html – schermate auth, home, setup, draft, game, modali
- js/config.js – SUPABASE_URL / ANON_KEY, EMAIL_DOMAIN=test.local
- js/auth.js – login/register, cloudSave/Load, sessione
- js/data.js – mappa base, TEMPLES, TILE_TYPE_DEFS, EVENT_DECKS, carte, Mostrissimi
- js/game.js – motore (turni, combattimento, eventi, trappole, IA, save)
- js/map.js – rendering canvas, click, path highlight
- js/app.js – UI, draft, popup, resume, versioning (APP_VERSION)

Versione corrente codice consegnato: **v042**

FIX v042: IA non usa più targetMode UI per le magie (cast diretto); confirmSpellCast non fallisce su troppi bersagli; timeout IA non resta appeso su waitForPopups (max 2.5s). (allineamento documentazione).

################################################################################
# FLUSSO UTENTE
################################################################################

1. Auth
   - Username (es. fra) → fra@test.local
   - Se sessione presente: “Riconosco questa presenza… sei tu?”
2. Home → Partita base → setup (n. templi caduti 0–2) → Draft stile 7 Wonders
3. Draft: 3 giri di bustine colore; primo pack scelto = primaryColor + apex costo 6
4. Partita: turni a rotazione tra entità vive (umano, IA, caduti)
5. Fine turno: flip celle occupate → eventuali TP → eventi → prossimo attore
6. Vittoria: resta un solo giocatore non-caduto in vita

################################################################################
# ENTITÀ
################################################################################

- Umano / IA: mana crescente, mano, campo, tempio, Artefatto obbligatorio in campo
  a fine turno (altrimenti penale/logica dedicata), magie, mostri, trappole in mano
- Templi Caduti: no mana/mano/magie; 1 passo a turno; spiriti; eventi casuali;
  non possono vincere; obiettivo uccidere creature

Templi fissi (icone):
- Cielo ☁ (-6,4) | Luna 🌙 (-2,-4) | Guerra ⚔ (2,4) | Acqua 💧 (6,-4)
Altare al centro (0,0).

################################################################################
# MAPPA E VISIONE
################################################################################

- Esagoni: montagne invalicabili, Desolazione (ex plain, niente eventi), templi,
  altare, zone speciali generate (generateSpecialZones):
  - esattamente 3 Teletrasporto
  - 1–2 Circoli rituali
  - altre tessere evento dal pool
- Fog of war: visione raggio 2 da creature e tempio proprio
- Scoperta (flip) globale in flippedCells a fine turno se creatura ci sta
- Teletrasporto: non si resta sopra; a fine turno TP → passo obbligatorio gratis

################################################################################
# COMBATTIMENTO E MOVIMENTO
################################################################################

- Pathfinding: intermedie scoperte/visibili; destinazione può essere non scoperta
  (avvizzisce). Montagne/unità bloccano. Attacco solo adiacente.
- Conferma path: costo mana (primo passo del turno creatura gratis)
- Combat a fasi con eventuale pausa trappole (on_attack / after_damage / on_death)

################################################################################
# TRAPPOLE (regole attuali in codice)
################################################################################

- Carte in mano type "trappola" con trigger
- Non giocabili nel proprio turno
- Dopo evento non-trappola, coda dai giocatori successivi; ciascuno può attivare
  una delle proprie triggerate o passare
- Una attivazione chiude la finestra (niente catena trappola-su-trappola)
- pendingTrapWindow blocca endTurn / AI finché non risolto

################################################################################
# EVENTI
################################################################################

- Un evento per turno (fase fine turno), scelto in base alle tessere occupate
  dalle proprie creature (se più luoghi: scelta)
- Mazzo per tipo tessera, ≥10 carte, reshuffle dopo pesca
- Carta = narrative + ≥2 choices (bonus/malus)
- Teletrasporto: niente mazzo eventi
- Desolazione / mountain / temple strutturali: no mazzo eventi standard

################################################################################
# MOSTRISSIMI
################################################################################

- Pool condiviso; costo in sacrifici esatti
- Evocazione su Altare o Circolo (sblocco se si è sacrificato lì)
- Max 1 Mostrissimo evocato per turno
- Entra spesso avvizzito (regole ETB)

################################################################################
# SALVATAGGIO
################################################################################

- toSaveData / fromSaveData con gameId
- persist a ogni update UI del giocatore
- Supabase tabella games (state jsonb) se config valorizzata, altrimenti localStorage
- Resume da home se partita active

################################################################################
# UI RILEVANTE
################################################################################

- Mini-carte unità: forma carta, no nome, ATK/PV, icona tempio
- Artefatto in mano: forma stella
- Click sx cella visibile: ispezione luogo + creatura; propria → Muovi
- Click dx: dettagli senza spoiler celle ?
- Popup azione unificati (enqueueGamePopup)

################################################################################
# FILE DOC CORRELATI
################################################################################

- situazione_attuale.md (questo file)
- tessere_e_mazzi_eventi.md – elenco reale tessere e carte evento in data.js

================================================================================
