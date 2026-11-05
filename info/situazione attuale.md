================================================================================
BATTLE FOR PENUMBRA – REGOLE DI CONSEGNA (ONNIPRESENTI – NON CANCELLABILI)
Queste regole devono essere rispettate in OGNI chat e in OGNI consegna futura.
Non possono essere rimosse, ignorate o sovrascritte.
Ogni modifica deve essere consegnata in una SOTTOCARTELLA dedicata NUOVA
(es. consegna-026/, consegna-027/, …).
NON si modifica mai una cartella di consegna già consegnata.
Ad ogni consegna si DEVE aggiornare il numero di VERSIONE
(v025 → v026 → v027 …)
Ad ogni consegna si DEVE aggiornare questo file "situazione attuale"
con: versione, changelog (FIX/NEW/CHANGE), file toccati.
Modifiche solo chirurgiche rispetto alla richiesta corrente.
Fine lavoro = nuova sottocartella pronta + situazione attuale aggiornata.
================================================================================
BATTLE FOR PENUMBRA – consegna 026 – VERSION: v026
NEW – Passo obbligatorio post-Teletrasporto (manuale)
A fine turno, se una creatura è su un Teletrasporto:
viene spostata su un altro TP casuale (si scopre se coperto)
DEVE uscire con 1 passo legale gratuito (non montagna, non TP, cella libera)
Umano: popup informativo + caselle verde acqua cliccabili sulla mappa
IA: scelta automatica tra le legali
Più creature sul TP nello stesso turno → coda di passi
Solo dopo tutti i passi obbligatori parte la fase eventi
FILE: js/game.js, js/map.js, js/app.js, index.html