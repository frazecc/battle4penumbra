================================================================================
BATTLE FOR PENUMBRA – SITUAZIONE ATTUALE
File: situazione-attuale.txt
Ultimo aggiornamento: 4 Novembre 2026 – consegna 013
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
  (PRIMO passo di ogni creatura per turno è GRATUITO)

DRAFT
- Stile 7 Wonders: Giro 1 orario, Giro 2 antiorario, Giro 3 orario
- Si vedono solo i COLORI delle 3 bustine (carte nascoste)
- Non si vedono le carte proprie né quelle altrui durante il draft
- 3 bustine a testa = 9 carte + Artefatto in mano
- Tra una scelta e l’altra: overlay a schermo intero con messaggio atmosferico
  + bottone “Ho capito”. Primo messaggio: “Abbraccia l’eternità. Assaggia il potere.”
  Successivi: “Le altre entità stanno ancora valutando quale destino percorrere.”
  Durante l’overlay le bustine scompaiono.

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
- Zoom minimo abbassato (0.25)

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

AVVIZZITO
- Le creature possono essere “avvizzite” (stanche/tappate).
- Mentre avvizzita: non può muoversi né attaccare (può solo difendere).
- Diventa avvizzita quando entra in un esagono non scoperto o quando attacca.
- Mostri normali entrano NON avvizziti; Mostrissimi entrano AVVIZZITI.
- A inizio del proprio turno tutte le proprie creature si svegliano.
- Visivo: cerchio grigio + “Z”

MANO E CARTE GIOCABILI (UX)
- Le carte in mano sono sempre ordinate per costo crescente (sinistra = più economiche)
- Una carta è “giocabile” solo se è legalmente castabile in questo momento
  (mana sufficiente + bersaglio/piazzamento valido)
- Carte giocabili: 50% più grandi + alone dorato lampeggiante
- Carte non giocabili: restano visibili ma più piccole e spente (opache/grigie)

CADUTI
- Niente carte in mano, non possono vincere
- Creature restano; a inizio turno token sul tempio se libero
- IA caduta: insegue un nemico avvistato, altrimenti passo casuale
- Umano caduto: modal immediato “Hai perso” + Guarda mappa / Torna Home.
  Se non ci sono più umani vivi la partita si chiude subito.
  Guarda mappa: fog congelata + click sulle creature visibili per dettagli.


================================================================================
COSE DA FARE A BREVE (prossimo lavoro utile)
================================================================================
Ordine consigliato (da confermare con FRA quando chiede “cosa facciamo ora?”):

1. Sistemare ulteriormente UX mappa su mobile (se ancora scomoda)
2. Completare timing trappole e casi limite
3. Completare effetti carte ancora “a metà”
4. Circoli Rituali / zone: verificare che gli eventi partano sempre in partita
5. Entità-caduta: rifinire comportamenti se emergono bug in playtest
6. UI più chiara per “cosa posso fare ora” (suggerimenti di turno) – parzialmente fatto con carte illuminate


================================================================================
COSE LASCIATE PER IL FUTURO (non toccare finché non richieste)
================================================================================
- Sistema QUEST (3 indizi + vittoria alternativa completando la quest)
- Condizione di vittoria “completa la quest”
- Multiplayer umano: 1v1, 1v1v1, 1v1v1v1
- Classifica
- Codex (carte & regole in-app)
- Catalogo Mostrissimi ampliato verso ~100
- Potere fazione REALE in base ai colori del mazzo
- PNG / avatar legati ai colori del mazzo
- Inventario oggetti narrativi più ricco legato alle quest
- Animazioni di movimento / combattimento / draft
- Deploy pubblico (Cloudflare Pages / GitHub Pages) se richiesto


================================================================================
DECISIONI DI DESIGN GIÀ PRESE (non rinegoziare senza FRA)
================================================================================
- Sempre 4 templi / 4 entità
- Templi: Cielo, Luna, Guerra, Acqua (icone dedicate)
- Draft: bustine intere, solo colore visibile, stile 7 Wonders + messaggi atmosferici
- Artefatto legato a creatura in campo
- Mostri solo sul tempio
- Fog dinamica attorno creature + tempio; montagne sempre visibili
- Celle anonime fino a scoperta; da cella non scoperta niente altri movimenti nel turno
- Eventi a fine turno → passiva vicino al nome
- Caduti: no mano, no vittoria, chase AI, token sul tempio
- Token 1/1 inizio turno solo se tempio libero
- Celle occupate sempre bloccate (anche alleate)
- Consegne solo file modificati + situazione-attuale.txt in cartella numerata
- Primo movimento di ogni creatura per turno è gratuito
- Regola Avvizzito
- Carte giocabili illuminate e più grandi; ordinate per costo


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
  001 … 013/      → solo file da caricare di quella tornata
situazione-attuale.txt  → QUESTO FILE (copiarlo anche in ogni consegna)


================================================================================
ULTIME CONSEGNE
================================================================================
013 – UX carte + draft atmosferico:
      - Carte in mano ordinate per costo crescente
      - Carte giocabili: 50% più grandi + alone dorato lampeggiante
      - Carte non giocabili: più piccole e spente (restano visibili)
      - Draft: overlay a schermo intero con messaggio + “Ho capito”
        Primo: “Abbraccia l’eternità. Assaggia il potere.”
        Dopo: “Le altre entità stanno ancora valutando quale destino percorrere.”
      File modificati: js/game.js, js/app.js, css/style.css


012 – Nuove regole + fix UX:
      - Primo movimento gratuito
      - Sistema Avvizzito
      - Fix click in modalità Muovi
      - Dettagli creature dopo Guarda mappa
      - Zoom minimo 0.25
      File: js/game.js, js/app.js, js/map.js


011 – Caduto umano: modal immediato + fog congelata
010 – Fine partita bottoni onclick
009 – Guarda mappa + fog nera
008 – Fix app.js + pulsanti mano
007 – Pulsanti sotto carte + flip fine turno
006 – Montagne sempre visibili + corona
005 – Fix SyntaxError
004 – Celle anonime + dettaglio + cimitero
003 – Turn order + draft 7 Wonders + templi + zone
002 – Mappa grande + draft colore + fog dinamica
001 – Setup caduti + draft + token + artefatto


================================================================================
FINE – Aggiornare questo file a ogni modifica / consegna
================================================================================
