================================================================================
BATTLE FOR PENUMBRA – SITUAZIONE ATTUALE
File: situazione-attuale.txt
Ultimo aggiornamento: 4 Novembre 2026 – consegna 008
================================================================================

ISTRUZIONE OBBLIGATORIA PER OGNI CHAT / IA CHE LAVORA SUL PROGETTO
--------------------------------------------------------------------------------
1. Questo file DEVE essere aggiornato OGNI SINGOLA VOLTA che si modifica
   o si consegna un file del progetto.
2. Ogni consegna va in una sottocartella numerata crescente:
   consegne/001, consegne/002, consegne/003, ...
3. Nella sottocartella vanno SOLO i file modificati (da caricare) + una
   copia aggiornata di questo file (situazione-attuale.txt).
4. Non reinventare regole già decise: leggere prima questo documento e i
   design document originali (gioco / map / cards).
5. Preferenze del proprietario del progetto (FRA):
   - Non è un informatico esperto: spiegare in italiano semplice, senza
     gergo inutile, e dire chiaramente quali file copiare e dove.
   - Preferisce domande chiare prima di implementare cose ambigue.
   - Vuole un gioco funzionante passo dopo passo, non rifattorizzazioni
     enormi non richieste.
   - Questo file è la “memoria” del progetto: se manca qui, si perde.


================================================================================
COSA È IL GIOCO (riassunto)
================================================================================
Battle for Penumbra = gioco di carte tattico online free-to-play su mappa
esagonale, con nebbia di guerra, draft a bustine, Artefatto, Mostrissimi,
eventi di zona e templi.

Sempre 4 templi / 4 entità in partita.
Partita Base attuale: 1 umano + IA + eventuali templi già caduti (0–2).


================================================================================
COSE FATTE (implementate e consegnate)
================================================================================

SETUP E STRUTTURA
- Login semplice / “Sono io”
- Homepage con Partita Base attiva
- Setup: solo “Templi Caduti” 0/1/2 → IA = 3 − caduti (sempre 4 entità)
- Turn order: primo giocatore casuale, poi senso orario sui templi
- Mana: +1 max e refill a inizio turno; movimento 1 mana per passo

DRAFT
- Stile 7 Wonders: Giro 1 orario, Giro 2 antiorario, Giro 3 orario
- Si vedono solo i COLORI delle 3 bustine (carte nascoste)
- Non si vedono le carte proprie né quelle altrui durante il draft
- 3 bustine a testa = 9 carte + Artefatto in mano

TEMPLI E PROPRIETÀ
- 4 templi nominati (NON sono “acqua generica”):
  Cielo ☁, Luna ☾, Guerra ⚔, Acqua 🌊
- Stessa icona del tempio sulle creature del proprietario
- Corona 👑 sul mostro che ha l’Artefatto legato

MAPPA E FOG
- Griglia esagonale, montagne invalicabili
- Montagne SEMPRE visibili (anche oltre la fog: sono alte)
- Fog dinamica: visione raggio 2 attorno alle proprie creature e al proprio tempio
- Celle non scoperte: aspetto anonimo identico (niente icone di zona)
- Scoperta cella: a fine turno con evento (o tempio proprio / altare / montagna)
- Se sei su cella NON scoperta non puoi muoverti oltre in quel turno

ZONE SPECIALI (1 esagono ciascuna, scoperte solo dopo flip)
- Cimitero, Rovine, Statua, Colosseo, Circolo Rituale, Santuario, Jungla, Villaggio

EVENTI
- A fine turno: SCOPERTE tutte le celle con le tue creature + 1 evento casuale della zona
- Evento → passiva scritta vicino al nome nel pannello
- Eventi definiti per plain, temple, city e zone speciali

CARTE E REGOLE BASE
- Mostri evocabili SOLO sul proprio tempio
- Artefatto: si LEGA a una creatura già in campo (non si piazza da solo);
  se la creatura muore torna in mano con +3 costo
- Sconfitta se a fine turno l’Artefatto non è sul campo → diventi Caduto
- Mostrissimi: pool pubblica 3, mana 0, sacrifici; su Altare / Tempio / Circolo
- Combattimento con rimbalzo se non si uccide
- Token gratuito “Spirito del Tempio” 1/1 sul tempio a inizio turno se libero
- Trappole: popup base nel turno avversario (da completare)
- Effetti ETB / alcuni effectId mappati (non tutti i casi complessi)

CADUTI
- Niente carte in mano, non possono vincere
- Creature restano; a inizio turno token sul tempio se libero
- IA caduta: insegue un nemico avvistato, altrimenti passo casuale

UI
- Mappa con auto-fit allo schermo (PC e mobile, migliorabile)
- Click carta in mano o creatura in campo → anteprima dettagli
- Sotto anteprima creatura in campo: pulsanti Annulla / Muovi
- Cimitero privato (bottone nel pannello), carte cliccabili a dettaglio
- Placeholder “Potere fazione (placeholder)” sotto ogni nome
- Passive degli eventi elencate sotto il nome


================================================================================
COSE DA FARE A BREVE (prossimo lavoro utile)
================================================================================
Ordine consigliato (da confermare con FRA quando chiede “cosa facciamo ora?”):

1. Sistemare / bilanciare UX mappa su mobile se ancora scomoda
2. Completare timing trappole e casi limite
3. Completare effetti carte ancora “a metà”
4. Circoli Rituali / zone: verificare che gli eventi partano sempre in partita
5. Entità-caduta: rifinire comportamenti se emergono bug in playtest
6. UI più chiara per “cosa posso fare ora” (suggerimenti di turno)


================================================================================
COSE LASCIATE PER IL FUTURO (non toccare finché non richieste)
================================================================================
- Sistema QUEST (3 indizi + vittoria alternativa completando la quest)
- Condizione di vittoria “completa la quest”
- Multiplayer umano: 1v1, 1v1v1, 1v1v1v1
- Classifica
- Codex (carte & regole in-app)
- Catalogo Mostrissimi ampliato verso ~100, senza costi sacrificio duplicati in pool
- Potere fazione REALE in base ai colori del mazzo (togliere il placeholder)
- PNG / avatar legati ai colori del mazzo
- Inventario oggetti narrativi più ricco legato alle quest
- Animazioni di movimento / combattimento / draft
- Deploy pubblico (Cloudflare Pages / GitHub Pages) se richiesto


================================================================================
DECISIONI DI DESIGN GIÀ PRESE (non rinegoziare senza FRA)
================================================================================
- Sempre 4 templi / 4 entità
- Templi: Cielo, Luna, Guerra, Acqua (icone dedicate)
- Draft: bustine intere, solo colore visibile, stile 7 Wonders (orario/antiorario)
- Artefatto legato a creatura in campo
- Mostri solo sul tempio
- Fog dinamica attorno creature + tempio; montagne sempre visibili
- Celle anonime fino a scoperta; da cella non scoperta niente altri movimenti nel turno
- Eventi a fine turno → passiva vicino al nome
- Caduti: no mano, no vittoria, chase AI, token sul tempio
- Token 1/1 inizio turno solo se tempio libero
- Celle occupate sempre bloccate (anche alleate)
- Consegne solo file modificati + situazione-attuale.txt in cartella numerata


================================================================================
STRUTTURA FILE PROGETTO (riferimento)
================================================================================
battle4penumbra/
  index.html
  css/style.css
  js/data.js      → carte, templi, zone, eventi
  js/game.js      → logica partita
  js/map.js       → canvas mappa
  js/app.js       → UI, draft, cimitero, dettagli
consegne/
  001 … 006/      → solo file da caricare di quella tornata
situazione-attuale.txt  → QUESTO FILE (copiarlo anche in ogni consegna)


================================================================================
ULTIME CONSEGNE
================================================================================

008 – Fix app.js corrotto. Carte in mano: Evoca / Lancia magia / Lega artefatto / Annulla
      (non "lancia magia" sui mostri). Muovi disabilitato + spiegazione se cella non scoperta.
      Flip fine turno: tutte le celle occupate dalle creature del giocatore.


007 – Pulsanti sotto carte in mano (Evoca / Lancia magia / Lega artefatto / Annulla).
      Fine turno: flip di TUTTE le celle con creature del giocatore + evento zona.
      Re-render mappa dopo fine turno. Rimossi duplicati in app.js.

006 – Montagne sempre visibili; corona Artefatto; blocco movimento su
      cella non scoperta; pulsanti Annulla/Muovi sotto anteprima.
005 – Fix SyntaxError (else doppio) che impediva “Inizia Draft”.
004 – Celle anonime fino a scoperta; dettaglio carte; cimitero UI.
003 – Turn order orario, draft 7 Wonders, templi nominati, zone, eventi,
      caduti, placeholder potere fazione.
002 – Mappa più grande, draft solo colore, fog dinamica, summon sul tempio.
001 – Setup caduti, draft bustine, token 1/1, artefatto legato.


================================================================================
FINE – Aggiornare questo file a ogni modifica / consegna
================================================================================
