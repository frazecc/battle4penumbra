BATTLE FOR PENUMBRA – TESSERE SPECIALI & MAZZI EVENTI (v025)
========================================================================

REGOLE CHIAVE
- Teletrasporto: esattamente 3 sulla mappa; NON ha mazzo eventi
  (non si può finire il turno sopra: si viene spostati e si deve fare un passo).
- Circolo Rituale: minimo 1, massimo 2 sulla mappa; ha mazzo eventi.
- Altare (centro 0,0) e Templi: fissi, fuori dal pool casuale.
- A fine turno: flip celle occupate → risoluzione TP → 1 evento a scelta.
- Testo scelta: "Il tuo destino ti attende... dove succederà?"
- Ogni pesca da un mazzo: si pesca 1 carta e il mazzo viene rimischiato subito.
- Ogni mazzo contiene almeno 10 carte (misti: positivi, negativi, rischiosi).
- Max 1 Mostrissimo evocato per proprio turno.

TIPI DI TESSERE ESTRAIBILI (10)
------------------------------------------------------------------------
🏠 villaggio      | Villaggio              | Gente, scambi, aiuto e tasse
⚰ cimitero       | Cimitero               | Morti, spiriti, patti oscuri
🏛 rovine         | Rovine                 | Reperti antichi e trappole
✦ circolo        | Circolo Rituale        | Magia rituale e evocazioni
🌀 teletrasporto  | Teletrasporto          | Portali instabili (solo meccanica, nessun evento)
🕯 santuario      | Santuario              | Protezione, fede, guarigione
🌿 jungla         | Jungla                 | Natura selvaggia e agguati
🏟️ colosseo       | Colosseo               | Gloria, sangue e sfide
🗿 statua         | Statua del Colosso     | Eco di potere antico
🎴 mercato        | Mercato Ombroso        | Affari loschi, carte e mana

MAZZI EVENTI (no teletrasporto)
------------------------------------------------------------------------

### 🏠 VILLAGGIO (villaggio) — 11 carte
  - [vil_01] Riparo del Contadino
      Una famiglia ti offre riparo.
      effectId: ev_shield_1
  - [vil_02] Tassa di Passaggio
      I locali pretendono un tributo.
      effectId: ev_mana_loss_1
  - [vil_03] Recluta d'Emergenza
      Un giovane si unisce a te.
      effectId: ev_token_1_1
  - [vil_04] Mercante Equivoco
      Paga e pesca... o forse no.
      effectId: ev_pay1_draw1
  - [vil_05] Festa del Raccolto
      Cibo e vino per tutti.
      effectId: ev_heal_all_1
  - [vil_06] Rissa in Taverna
      Qualcuno tira un boccale.
      effectId: ev_dmg_self_1
  - [vil_07] Guida Locale
      Ti mostrano un sentiero sicuro.
      effectId: ev_draw_1
  - [vil_08] Furto notturno
      Ti manca qualcosa allo zaino.
      effectId: ev_discard_1
  - [vil_09] Benedizione del Borgo
      La gente prega per te.
      effectId: ev_heal_self_2
  - [vil_10] Arruolamento Forzato
      Un miliziano esige servizio.
      effectId: ev_wither_self
  - [vil_11] Dono del Sindaco
      Una moneta per la strada.
      effectId: ev_mana_gain_1

### ⚰ CIMITERO (cimitero) — 11 carte
  - [cim_01] Eco dei Caduti
      Una voce dal sottosuolo ti guida.
      effectId: ev_draw_1
  - [cim_02] Maledizione Sottile
      Un brivido ti attraversa.
      effectId: ev_dmg_self_1
  - [cim_03] Patto con l'Ombra
      Offri sangue, ottieni forza.
      effectId: ev_sac_buff_2
  - [cim_04] Tenebre Fertili
      I morti nutrono i vivi.
      effectId: ev_heal_all_2_if_lost
  - [cim_05] Mano dallo Spirito
      Qualcosa tira il tuo mantello.
      effectId: ev_discard_1
  - [cim_06] Veglia Funebre
      Resti in silenzio fino all'alba.
      effectId: ev_shield_1
  - [cim_07] Ossario Antico
      Un teschio sussurra un segreto.
      effectId: ev_atk_perm_1
  - [cim_08] Fame dei Sepolcri
      La terra vuole un prezzo.
      effectId: ev_dmg_self_2
  - [cim_09] Lamento
      Il pianto rafforza lo spirito.
      effectId: ev_heal_self_2
  - [cim_10] Risveglio Momentaneo
      Un'eco di vita ritorna.
      effectId: ev_heal_self_3
  - [cim_11] Sigillo Tombale
      Le ombre ti coprono.
      effectId: ev_shield_2

### 🏛 ROVINE (rovine) — 11 carte
  - [rov_01] Reperto Antico
      Una lama ancora affilata.
      effectId: ev_atk_perm_1
  - [rov_02] Trappola a Scatto
      Il pavimento cede.
      effectId: ev_dmg_self_1
  - [rov_03] Iscrizione Dimenticata
      Parole di potere e confusione.
      effectId: ev_draw1_discard1
  - [rov_04] Collasso
      Polvere e detriti.
      effectId: ev_wither_self
  - [rov_05] Reliquia Intatta
      Un amuleto caldo al tatto.
      effectId: ev_shield_1
  - [rov_06] Corridoio Crollato
      Devi strisciare per uscire.
      effectId: ev_dmg_self_2
  - [rov_07] Sala del Trono
      L'eco di antichi re.
      effectId: ev_atk_perm_1_hp_1
  - [rov_08] Pozzo dei Desideri
      Getti una moneta simbolica.
      effectId: ev_mana_gain_1
  - [rov_09] Affresco Sbiadito
      Comprendi un gesto di magia.
      effectId: ev_draw_1
  - [rov_10] Polvere di Stelle
      Brilla e poi sparisce.
      effectId: ev_heal_self_2
  - [rov_11] Guardiano di Pietra
      Si anima per un istante.
      effectId: ev_dmg_self_1_or_shield

### ✦ CIRCOLO RITUALE (circolo) — 11 carte
  - [cir_01] Allineamento
      Le stelle favoriscono l'evocazione.
      effectId: ev_next_summon_discount
  - [cir_02] Sovraccarico
      Energia pura scorre nelle vene.
      effectId: ev_temp_buff_1_1
  - [cir_03] Rito Instabile
      Il circolo vibra in modo imprevedibile.
      effectId: ev_coin_heal2_or_dmg2
  - [cir_04] Sigillo Protettivo
      Un alone ti avvolge.
      effectId: ev_shield_2
  - [cir_05] Eco Rituale
      Il potere residuale cura.
      effectId: ev_heal_self_2
  - [cir_06] Sacrificio Simbolico
      Una goccia di sangue basta.
      effectId: ev_dmg_self_1_draw_1
  - [cir_07] Portale Minore
      Vedi oltre la nebbia.
      effectId: ev_clear_fog_self
  - [cir_08] Runa Spezzata
      Il feedback è doloroso.
      effectId: ev_dmg_self_2
  - [cir_09] Concentrazione
      La mente si fa affilata.
      effectId: ev_atk_perm_1
  - [cir_10] Benedizione Arcana
      Mana che rifluisce.
      effectId: ev_mana_gain_1
  - [cir_11] Vincolo Temporaneo
      Restate uniti.
      effectId: ev_heal_all_1

### 🕯 SANTUARIO (santuario) — 11 carte
  - [san_01] Benedizione
      Luce calda sulle ferite.
      effectId: ev_heal_self_3
  - [san_02] Asilo
      Qui non si sparge sangue.
      effectId: ev_shield_2
  - [san_03] Offerta
      Doni e ricevi.
      effectId: ev_discard1_heal_all_2
  - [san_04] Giudizio Mite
      Il giusto è protetto.
      effectId: ev_shield_mostrissimo
  - [san_05] Acqua Santa
      Purifica e rinfranca.
      effectId: ev_heal_self_2
  - [san_06] Silenzio Sacro
      Nessun grido, solo pace.
      effectId: ev_wither_clear
  - [san_07] Voto di Guardia
      Scudi per il devoto.
      effectId: ev_shield_1
  - [san_08] Pellegrinaggio
      Il viaggio insegna.
      effectId: ev_draw_1
  - [san_09] Tributo alla Fede
      Il tempio chiede umiltà.
      effectId: ev_mana_loss_1
  - [san_10] Miracolo Minore
      Una ferita si chiude.
      effectId: ev_heal_self_2
  - [san_11] Luce Interiore
      Forza e vitalità.
      effectId: ev_atk_perm_1_hp_1

### 🌿 JUNGLA (jungla) — 11 carte
  - [jun_01] Crescita Selvaggia
      Viti e muschio ti induriscono.
      effectId: ev_hp_perm_1
  - [jun_02] Agguato
      Dalla folta vegetazione, un colpo.
      effectId: ev_dmg_enemy_adj_1
  - [jun_03] Frutti Amari
      Nutrono, ma stancano.
      effectId: ev_heal1_wither
  - [jun_04] Sentiero Animali
      Un passaggio più rapido.
      effectId: ev_draw_1
  - [jun_05] Morso Velenoso
      Qualcosa ti azzanna.
      effectId: ev_dmg_self_2
  - [jun_06] Radici Profonde
      Stabilità e forza.
      effectId: ev_shield_1
  - [jun_07] Canto degli Uccelli
      Il morale sale.
      effectId: ev_heal_self_2
  - [jun_08] Liane Strozzanti
      Restare fermi è pericoloso.
      effectId: ev_wither_self
  - [jun_09] Predatore Ferito
      Impari dalla sua rabbia.
      effectId: ev_atk_perm_1
  - [jun_10] Rugiada Mattutina
      Freschezza rinnovata.
      effectId: ev_heal_self_1
  - [jun_11] Stormo in Fuga
      Un segnale di pericolo vicino.
      effectId: ev_dmg_self_1

### 🏟️ COLOSSEO (colosseo) — 11 carte
  - [col_01] Folla in Festa
      Urla di incoraggiamento.
      effectId: ev_next_attack_plus_2
  - [col_02] Sangue sulla Sabbia
      Dolore e potenza.
      effectId: ev_dmg1_atk_perm_2
  - [col_03] Indulto
      La folla chiede pietà.
      effectId: ev_wither_clear
  - [col_04] Sfida Lanciata
      Un nemico ti fissa.
      effectId: ev_dmg_enemy_vis_1
  - [col_05] Allenamento Brutale
      Sudore e lividi.
      effectId: ev_dmg_self_1_atk_1
  - [col_06] Trofeo Minore
      Un ricordo della lotta.
      effectId: ev_draw_1
  - [col_07] Arena Infuocata
      Il calore brucia.
      effectId: ev_dmg_self_2
  - [col_08] Evviva il Campione
      Gloria temporanea.
      effectId: ev_shield_1_atk_1
  - [col_09] Scommessa Persa
      Hai puntato male.
      effectId: ev_mana_loss_1
  - [col_10] Scommessa Vinta
      Le monete tintinnano.
      effectId: ev_mana_gain_1
  - [col_11] Secondo Vento
      Ancora in piedi.
      effectId: ev_heal_self_2

### 🗿 STATUA DEL COLOSSO (statua) — 11 carte
  - [sta_01] Eco del Colosso
      La pietra condivide forza.
      effectId: ev_atk_perm_1_hp_1
  - [sta_02] Sguardo di Pietra
      Un nemico si irrigidisce.
      effectId: ev_wither_enemy_vis
  - [sta_03] Offerta al Monumento
      Sangue per saggezza.
      effectId: ev_sac_draw_2
  - [sta_04] Crepe
      Frammenti taglienti.
      effectId: ev_dmg_self_2
  - [sta_05] Iscrizione Eroica
      Leggi e impari.
      effectId: ev_draw_1
  - [sta_06] Ombra del Gigante
      Protezione imponente.
      effectId: ev_shield_2
  - [sta_07] Polvere di Marmo
      Irrita gli occhi.
      effectId: ev_dmg_self_1
  - [sta_08] Benedizione Antica
      Un tocco di eternità.
      effectId: ev_heal_self_3
  - [sta_09] Malocchio della Statua
      Sfortuna passeggera.
      effectId: ev_discard_1
  - [sta_10] Piedistallo Saldo
      Non cedi un centimetro.
      effectId: ev_shield_1
  - [sta_11] Richiamo di Pietra
      La forza fluisce.
      effectId: ev_atk_perm_1

### 🎴 MERCATO OMBROSO (mercato) — 11 carte
  - [mer_01] Affare Tentante
      Due carte al prezzo di un po' di mana.
      effectId: ev_pay2_draw2
  - [mer_02] Borseggio
      Mani veloci nella folla.
      effectId: ev_foe_discard_1
  - [mer_03] Sconto Occulto
      Il costo di una carta scende.
      effectId: ev_discount_hand_1
  - [mer_04] Truffa
      Hai pagato troppo.
      effectId: ev_mana_loss_1
  - [mer_05] Mercante Generoso
      Un regalo inatteso.
      effectId: ev_draw_1
  - [mer_06] Contrabbando
      Merce proibita ma utile.
      effectId: ev_shield_1_draw_1
  - [mer_07] Debito Imposto
      Dovrai restituire un favore.
      effectId: ev_dmg_self_1
  - [mer_08] Asta Riuscita
      Hai venduto al momento giusto.
      effectId: ev_mana_gain_1
  - [mer_09] Merce Guasta
      Meglio non aver mangiato.
      effectId: ev_dmg_self_2
  - [mer_10] Informazione Pagata
      Un segreto vale oro.
      effectId: ev_draw1_discard1
  - [mer_11] Patto Commerciale
      Scambio equo.
      effectId: ev_heal_self_2
