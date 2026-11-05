================================================================================
BATTLE FOR PENUMBRA – REGOLE DI CONSEGNA (ONNIPRESENTI – NON CANCELLABILI)
Queste regole devono essere rispettate in OGNI chat e in OGNI consegna futura.
Non possono essere rimosse, ignorate o sovrascritte.
Ogni modifica deve essere consegnata in una SOTTOCARTELLA dedicata
(es. consegna-023/, consegna-024/, ecc.)
Ad ogni consegna si DEVE aggiornare il numero di VERSIONE
(v022 → v023 → v024 …)
Ad ogni consegna si DEVE aggiornare questo file "situazione attuale"
con:
nuovo numero di versione
elenco chiaro delle modifiche (FIX / NEW / CHANGE)
lista dei file toccati
Non si toccano parti del codice non richieste dalla consegna corrente
(modifiche chirurgiche).
Alla fine di ogni lavoro si consegna la sottocartella pronta
e il file situazione attuale aggiornato.
================================================================================
BATTLE FOR PENUMBRA – consegna 024 – VERSION: v024
NEW – Effetti di Uscita (leave) sulle creature
Aggiunto campo leaveEffectId sulle carte che hanno testo "Uscita:"
• m06 Guardiano d'Avorio → leave_heal_ally_2
(cura +2 PV all'alleato con meno PV rimanenti)
• m07 Furia Cremisi → leave_damage_attacker_1
(1 danno all'attaccante se presente nel contesto di combattimento)
_destroyUnit(unit, ctx) ora:
rimuove l'unità dal campo
gestisce il ritorno dell'Artefatto
risolve leaveEffectId tramite _resolveLeaveEffect
Il combattimento non fa più la rimozione "inline":
usa sempre _destroyUnit, così Uscita scatta anche in combattimento
(e nei sacrifici Mostrissimi, maledizioni, danni da effetti, ecc.)
NOTE
Se non c'è attaccante (es. sacrificio Mostrissimo), leave_damage_attacker_1
non fa danno e logga il motivo.
Se non ci sono alleati, leave_heal_ally_2 non cura nessuno.
Le Trappole on_death restano gestite a parte via _checkTraps.
FILE: js/game.js, js/data.js, js/app.js, index.html