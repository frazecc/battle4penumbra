# Tessere e mazzi eventi – elenco REALE (v040 / data.js)

Fonte: `js/data.js` → TILE_TYPE_DEFS, EVENT_DECKS, generateSpecialZones, TEMPLES.

---

## Tipi di cella

| id | Nome UI | Eventi? | Note |
|----|---------|---------|------|
| plain / desolazione | Desolazione | No | Maggioranza mappa |
| mountain | Montagna | No | Invalicabile |
| temple | Tempio | No | 4 templi giocatore |
| city | Altare | No | Centro (0,0); evocazione Mostrissimi |
| villaggio | Villaggio | Sì | Mazzo villaggio |
| cimitero | Cimitero | Sì | |
| rovine | Rovine | Sì | |
| circolo | Circolo Rituale | Sì | 1–2 in mappa; evocazione Mostrissimi |
| teletrasporto | Teletrasporto | **No** | Esattamente 3 in mappa; TP a fine turno |
| santuario | Santuario | Sì | |
| jungla | Jungla | Sì | |
| colosseo | Colosseo | Sì | |
| statua | Statua del Colosso | Sì | |
| mercato | Mercato Ombroso | Sì | |

### Templi fissi
- Tempio del Cielo ☁ `(-6,4)`
- Tempio della Luna 🌙 `(-2,-4)`
- Tempio della Guerra ⚔ `(2,4)`
- Tempio dell'Acqua 💧 `(6,-4)`

### Generazione zone speciali
- 3× teletrasporto obbligatori
- 1–2× circolo
- Altre tessere evento dal pool dei tipi con mazzo

---

## Mazzi eventi (ognuno 11 carte; reshuffle dopo pesca)

Formato carte in codice: `name`, `narrative`, `choices[]` (testo + effectId).

### villaggio (11)
- Mercante Garrus
- Tassa del Borgo
- Recluta Entusiasta
- Festa del Raccolto
- Rissa in Taverna
- Guida Locale
- Furto Notturno
- Benedizione del Borgo
- Arruolamento Forzato
- Dono del Sindaco
- Mercato delle Voci

### cimitero (11)
- Eco dei Caduti
- Maledizione Sottile
- Patto d'Ombra
- Tenebre Fertili
- Mano dallo Spirito
- Veglia Funebre
- Ossario Antico
- Fame dei Sepolcri
- Lamento
- Sigillo Tombale
- Risveglio Momentaneo

### rovine (11)
- Reperto Antico
- Trappola a Scatto
- Iscrizione Dimenticata
- Collasso
- Reliquia Intatta
- Corridoio Crollato
- Sala del Trono
- Pozzo dei Desideri
- Affresco Sbiadito
- Polvere di Stelle
- Guardiano di Pietra

### circolo (11)
- Allineamento
- Sovraccarico
- Rito Instabile
- Sigillo Protettivo
- Eco Rituale
- Sacrificio Simbolico
- Portale Minore
- Runa Spezzata
- Concentrazione
- Benedizione Arcana
- Vincolo Temporaneo

### santuario (11)
- Benedizione
- Asilo
- Offerta
- Giudizio Mite
- Acqua Santa
- Silenzio Sacro
- Voto di Guardia
- Pellegrinaggio
- Tributo alla Fede
- Miracolo Minore
- Luce Interiore

### jungla (11)
- Crescita Selvaggia
- Agguato
- Frutti Amari
- Sentiero Animali
- Morso Velenoso
- Radici Profonde
- Canto degli Uccelli
- Liane Strozzanti
- Predatore Ferito
- Rugiada Mattutina
- Stormo in Fuga

### colosseo (11)
- Folla in Festa
- Sangue sulla Sabbia
- Indulto
- Sfida Lanciata
- Allenamento Brutale
- Trofeo Minore
- Arena Infuocata
- Evviva il Campione
- Scommessa Persa
- Scommessa Vinta
- Secondo Vento

### statua (11)
- Eco del Colosso
- Sguardo di Pietra
- Offerta al Monumento
- Crepe
- Iscrizione Eroica
- Ombra del Gigante
- Polvere di Marmo
- Benedizione Antica
- Malocchio della Statua
- Piedistallo Saldo
- Richiamo di Pietra

### mercato (11)
- Affare Tentante
- Borseggio
- Contanti Sonanti
- Truffa
- Mercante Generoso
- Contrabbando
- Debito Imposto
- Asta Riuscita
- Merce Guasta
- Informazione Pagata
- Patto Commerciale

### teletrasporto
Nessun mazzo (non si termina il turno sopra).

---

*Aggiornare questo file ogni volta che si modificano EVENT_DECKS o TILE_TYPE_DEFS in data.js.*
