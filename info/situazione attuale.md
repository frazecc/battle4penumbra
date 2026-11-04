================================================================================
BATTLE FOR PENUMBRA – SITUAZIONE ATTUALE
File: situazione-attuale.txt
Ultimo aggiornamento: 4 Novembre 2026 – consegna 014
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
- Solo colori delle 3 bustine visibili
- Sequenza messaggi atmosferici a schermo intero + “Ho capito”:
  1. All’avvio: “Abbraccia l'eternità. Assaggia il potere.”
  2. Dopo 1ª scelta: “Le altre entità stanno ancora valutando quale destino percorrere.”
  3. Dopo 2ª scelta: “Sei pronto?”
  4. Dopo 3ª scelta / fine draft: “…e così, nuovamente, comincia!”

TEMPLI E PROPRIETÀ
- 4 templi nominati: Cielo ☁, Luna ☾, Guerra ⚔, Acqua 🌊
- Icona tempio sulle creature + corona 👑 sull’Artefatto

MAPPA E FOG
- Griglia esagonale, montagne sempre visibili
- Fog dinamica raggio 2, celle anonime fino a scoperta
- Zoom minimo 0.25

ZONE SPECIALI + EVENTI
- Zone speciali + eventi a fine turno con passiva

CARTE E REGOLE BASE
- Mostri solo sul tempio, Artefatto legato, Mostrissimi, token 1/1, ecc.

AVVIZZITO
- Entra su “?” o attacca → avvizzita; Mostrissimi entrano avvizziti; si sveglia a inizio turno

MANO E CARTE GIOCABILI
- Ordinate per costo crescente
- Giocabili: ~28% più grandi + alone dorato soft lampeggiante
- Non giocabili: dimensione normale ma un po’ spente
- Area mano più alta (min-height 240px) per dare spazio alle carte importanti

LOG
- Mostra solo gli ultimi 5 messaggi
- Cliccabile → apre modal con il log completo

CADUTI
- Modal “Hai perso” immediato + fog congelata + dettagli creature cliccabili


================================================================================
COSE DA FARE A BREVE
================================================================================
1. UX mappa mobile ulteriore se necessario
2. Completare timing trappole
3. Completare effetti carte a metà
4. Verificare eventi zone speciali
5. Rifinire entità cadute
6. Suggerimenti “cosa posso fare ora” (parzialmente coperto dalle carte illuminate)


================================================================================
DECISIONI DI DESIGN GIÀ PRESE
================================================================================
(vedi consegne precedenti + nuove regole Avvizzito, primo movimento gratuito,
carte illuminate, sequenza messaggi draft)


================================================================================
STRUTTURA FILE PROGETTO
================================================================================
battle4penumbra/
  index.html
  css/style.css
  js/data.js
  js/game.js
  js/map.js
  js/app.js
consegne/
  001 … 014/


================================================================================
ULTIME CONSEGNE
================================================================================
014 – Raffinamento UX:
      - Sequenza completa messaggi draft (4 messaggi)
      - Carte giocabili ~28% più grandi (non più 50%)
      - Area mano più alta
      - Log mostra solo ultimi 5 + click per log completo
      File: js/app.js, css/style.css

013 – Carte illuminate + draft atmosferico base
012 – Avvizzito + primo movimento gratuito + fix click
011 – Caduto umano + fog congelata
010 – Fine partita bottoni
…


================================================================================
FINE
================================================================================
