// =====================================================
// BATTLE FOR PENUMBRA - GAME DATA (v3.1 – sistemi completi)
// =====================================================

const MOUNTAINS = [
  [-8,4],[-8,5],[-8,6],
  [-7,2],[-7,3],[-7,6],
  [-6,0],[-6,1],[-6,6],
  [-5,-2],[-5,-1],[-5,1],[-5,3],[-5,4],[-5,6],
  [-4,-4],[-4,-3],[-4,1],[-4,4],[-4,6],
  [-3,-5],[-3,-2],[-3,1],[-3,6],
  [-2,-6],[-2,-3],[-2,4],[-2,5],[-2,6],
  [-1,-6],[-1,-4],[-1,3],[-1,6],
  [0,-6],[0,-2],[0,6],
  [1,-6],[1,-3],[1,4],[1,6],
  [2,-6],[2,-5],[2,-4],[2,0],[2,3],[2,6],
  [3,-6],[3,-1],[3,2],[3,5],
  [4,-6],[4,-4],[4,-1],[4,3],[4,4],
  [5,-6],[5,-4],[5,-3],[5,-1],[5,1],[5,2],
  [6,-6],[6,-1],[6,0],
  [7,-6],[7,-3],[7,-2],
  [8,-6],[8,-5],[8,-4]
];

const PLAINS = [
  [-7,4],[-7,5],
  [-6,2],[-6,3],[-6,5],
  [-5,0],[-5,2],[-5,5],
  [-4,-2],[-4,-1],[-4,0],[-4,2],[-4,3],[-4,5],
  [-3,-4],[-3,-3],[-3,-1],[-3,0],[-3,2],[-3,3],[-3,4],[-3,5],
  [-2,-5],[-2,-2],[-2,-1],[-2,0],[-2,1],[-2,2],[-2,3],
  [-1,-5],[-1,-3],[-1,-2],[-1,-1],[-1,0],[-1,1],[-1,2],[-1,4],[-1,5],
  [0,-5],[0,-4],[0,-3],[0,-1],[0,1],[0,2],[0,3],[0,4],[0,5],
  [1,-5],[1,-4],[1,-2],[1,-1],[1,0],[1,1],[1,2],[1,3],[1,5],
  [2,-3],[2,-2],[2,-1],[2,1],[2,2],[2,5],
  [3,-5],[3,-4],[3,-3],[3,-2],[3,0],[3,1],[3,3],[3,4],
  [4,-5],[4,-3],[4,-2],[4,0],[4,1],[4,2],
  [5,-5],[5,-2],[5,0],
  [6,-5],[6,-3],[6,-2],
  [7,-5],[7,-4]
];

const TEMPLES = {
  "-6,4":  { id: "cielo",  label: "☁", name: "Tempio del Cielo",  icon: "☁", color: "#81D4FA" },
  "-2,-4": { id: "luna",   label: "☾", name: "Tempio della Luna", icon: "☾", color: "#CE93D8" },
  "2,4":   { id: "guerra", label: "⚔", name: "Tempio della Guerra", icon: "⚔", color: "#EF9A9A" },
  "6,-4":  { id: "acqua",  label: "🌊", name: "Tempio dell'Acqua", icon: "🌊", color: "#80CBC4" }
};

const CITY = [0, 0];

// Build cell lookup
const CELL_TYPE = new Map();
MOUNTAINS.forEach(([q,r]) => CELL_TYPE.set(`${q},${r}`, "mountain"));
PLAINS.forEach(([q,r]) => CELL_TYPE.set(`${q},${r}`, "plain"));
Object.keys(TEMPLES).forEach(k => CELL_TYPE.set(k, "temple"));
CELL_TYPE.set("0,0", "city");

// =====================================================
// TESSERE SPECIALI & MAZZI EVENTI (v025)
// =====================================================

const TILE_TYPE_DEFS = {
  villaggio:     { name: "Villaggio",           icon: "🏠", color: "#BCAAA4" },
  cimitero:      { name: "Cimitero",            icon: "⚰", color: "#78909C" },
  rovine:        { name: "Rovine",              icon: "🏛", color: "#A1887F" },
  circolo:       { name: "Circolo Rituale",     icon: "✦", color: "#B39DDB" },
  teletrasporto: { name: "Teletrasporto",       icon: "🌀", color: "#4DD0E1" },
  santuario:     { name: "Santuario",           icon: "🕯", color: "#FFE082" },
  jungla:        { name: "Jungla",              icon: "🌿", color: "#558B2F" },
  colosseo:      { name: "Colosseo",            icon: "🏟️", color: "#FF8A65" },
  statua:        { name: "Statua del Colosso",  icon: "🗿", color: "#90A4AE" },
  mercato:       { name: "Mercato Ombroso",     icon: "🎴", color: "#CE93D8" }
};
const EVENT_TILE_TYPES = ["villaggio","cimitero","rovine","circolo","santuario","jungla","colosseo","statua","mercato"];
const EVENT_DECKS = {

  villaggio: [
    { id: "vil_01", name: "Riparo del Contadino", text: "Una famiglia ti offre riparo.", effectId: "ev_shield_1" },
    { id: "vil_02", name: "Tassa di Passaggio", text: "I locali pretendono un tributo.", effectId: "ev_mana_loss_1" },
    { id: "vil_03", name: "Recluta d'Emergenza", text: "Un giovane si unisce a te.", effectId: "ev_token_1_1" },
    { id: "vil_04", name: "Mercante Equivoco", text: "Il mercante svela due carte di un colore: scegline una.", effectId: "ev_choose_color_card" },
    { id: "vil_05", name: "Festa del Raccolto", text: "Cibo e vino per tutti.", effectId: "ev_heal_all_1" },
    { id: "vil_06", name: "Rissa in Taverna", text: "Qualcuno tira un boccale.", effectId: "ev_dmg_self_1" },
    { id: "vil_07", name: "Guida Locale", text: "Una guida ti offre conoscenza: scegli una di due carte di un colore casuale.", effectId: "ev_choose_color_card" },
    { id: "vil_08", name: "Furto notturno", text: "Ti manca qualcosa allo zaino.", effectId: "ev_discard_1" },
    { id: "vil_09", name: "Benedizione del Borgo", text: "La gente prega per te.", effectId: "ev_heal_self_2" },
    { id: "vil_10", name: "Arruolamento Forzato", text: "Un miliziano esige servizio.", effectId: "ev_wither_self" },
    { id: "vil_11", name: "Dono del Sindaco", text: "Una moneta per la strada.", effectId: "ev_mana_gain_1" },
  ],
  cimitero: [
    { id: "cim_01", name: "Eco dei Caduti", text: "Una voce dal sottosuolo ti guida.", effectId: "ev_choose_color_card" },
    { id: "cim_02", name: "Maledizione Sottile", text: "Un brivido ti attraversa.", effectId: "ev_dmg_self_1" },
    { id: "cim_03", name: "Patto con l'Ombra", text: "Un patto di conoscenza: scegli una di due carte di un colore casuale.", effectId: "ev_choose_color_card" },
    { id: "cim_04", name: "Tenebre Fertili", text: "I morti nutrono i vivi.", effectId: "ev_heal_all_2_if_lost" },
    { id: "cim_05", name: "Mano dallo Spirito", text: "Qualcosa tira il tuo mantello.", effectId: "ev_discard_1" },
    { id: "cim_06", name: "Veglia Funebre", text: "Resti in silenzio fino all'alba.", effectId: "ev_shield_1" },
    { id: "cim_07", name: "Ossario Antico", text: "Un teschio sussurra un segreto.", effectId: "ev_atk_perm_1" },
    { id: "cim_08", name: "Fame dei Sepolcri", text: "La terra vuole un prezzo.", effectId: "ev_dmg_self_2" },
    { id: "cim_09", name: "Lamento", text: "Il pianto rafforza lo spirito.", effectId: "ev_heal_self_2" },
    { id: "cim_10", name: "Risveglio Momentaneo", text: "Un'eco di vita ritorna.", effectId: "ev_heal_self_3" },
    { id: "cim_11", name: "Sigillo Tombale", text: "Le ombre ti coprono.", effectId: "ev_shield_2" },
  ],
  rovine: [
    { id: "rov_01", name: "Reperto Antico", text: "Una lama ancora affilata.", effectId: "ev_atk_perm_1" },
    { id: "rov_02", name: "Trappola a Scatto", text: "Il pavimento cede.", effectId: "ev_dmg_self_1" },
    { id: "rov_03", name: "Iscrizione Dimenticata", text: "Parole di potere e confusione.", effectId: "ev_choose_color_card" },
    { id: "rov_04", name: "Collasso", text: "Polvere e detriti.", effectId: "ev_wither_self" },
    { id: "rov_05", name: "Reliquia Intatta", text: "Un amuleto caldo al tatto.", effectId: "ev_shield_1" },
    { id: "rov_06", name: "Corridoio Crollato", text: "Devi strisciare per uscire.", effectId: "ev_dmg_self_2" },
    { id: "rov_07", name: "Sala del Trono", text: "L'eco di antichi re.", effectId: "ev_atk_perm_1_hp_1" },
    { id: "rov_08", name: "Pozzo dei Desideri", text: "Getti una moneta simbolica.", effectId: "ev_mana_gain_1" },
    { id: "rov_09", name: "Affresco Sbiadito", text: "Comprendi un gesto di magia.", effectId: "ev_choose_color_card" },
    { id: "rov_10", name: "Polvere di Stelle", text: "Brilla e poi sparisce.", effectId: "ev_heal_self_2" },
    { id: "rov_11", name: "Guardiano di Pietra", text: "Si anima per un istante.", effectId: "ev_dmg_self_1_or_shield" },
  ],
  circolo: [
    { id: "cir_01", name: "Allineamento", text: "Le stelle favoriscono l'evocazione.", effectId: "ev_mana_gain_1" },
    { id: "cir_02", name: "Sovraccarico", text: "Energia pura scorre nelle vene.", effectId: "ev_temp_buff_1_1" },
    { id: "cir_03", name: "Rito Instabile", text: "Il circolo vibra in modo imprevedibile.", effectId: "ev_coin_heal2_or_dmg2" },
    { id: "cir_04", name: "Sigillo Protettivo", text: "Un alone ti avvolge.", effectId: "ev_shield_2" },
    { id: "cir_05", name: "Eco Rituale", text: "Il potere residuale cura.", effectId: "ev_heal_self_2" },
    { id: "cir_06", name: "Sacrificio Simbolico", text: "Una goccia di sangue basta.", effectId: "ev_dmg_self_1_draw_1" },
    { id: "cir_07", name: "Portale Minore", text: "Vedi oltre la nebbia.", effectId: "ev_clear_fog_self" },
    { id: "cir_08", name: "Runa Spezzata", text: "Il feedback è doloroso.", effectId: "ev_dmg_self_2" },
    { id: "cir_09", name: "Concentrazione", text: "La mente si fa affilata.", effectId: "ev_atk_perm_1" },
    { id: "cir_10", name: "Benedizione Arcana", text: "Mana che rifluisce.", effectId: "ev_mana_gain_1" },
    { id: "cir_11", name: "Vincolo Temporaneo", text: "Restate uniti.", effectId: "ev_heal_all_1" },
  ],
  santuario: [
    { id: "san_01", name: "Benedizione", text: "Luce calda sulle ferite.", effectId: "ev_heal_self_3" },
    { id: "san_02", name: "Asilo", text: "Qui non si sparge sangue.", effectId: "ev_shield_2" },
    { id: "san_03", name: "Offerta", text: "Doni e ricevi.", effectId: "ev_discard1_heal_all_2" },
    { id: "san_04", name: "Giudizio Mite", text: "Il giusto è protetto.", effectId: "ev_shield_mostrissimo" },
    { id: "san_05", name: "Acqua Santa", text: "Purifica e rinfranca.", effectId: "ev_heal_self_2" },
    { id: "san_06", name: "Silenzio Sacro", text: "Nessun grido, solo pace.", effectId: "ev_wither_clear" },
    { id: "san_07", name: "Voto di Guardia", text: "Scudi per il devoto.", effectId: "ev_shield_1" },
    { id: "san_08", name: "Pellegrinaggio", text: "Il viaggio insegna.", effectId: "ev_choose_color_card" },
    { id: "san_09", name: "Tributo alla Fede", text: "Il tempio chiede umiltà.", effectId: "ev_mana_loss_1" },
    { id: "san_10", name: "Miracolo Minore", text: "Una ferita si chiude.", effectId: "ev_heal_self_2" },
    { id: "san_11", name: "Luce Interiore", text: "Forza e vitalità.", effectId: "ev_atk_perm_1_hp_1" },
  ],
  jungla: [
    { id: "jun_01", name: "Crescita Selvaggia", text: "Viti e muschio ti induriscono.", effectId: "ev_hp_perm_1" },
    { id: "jun_02", name: "Agguato", text: "Dalla folta vegetazione, un colpo.", effectId: "ev_dmg_enemy_adj_1" },
    { id: "jun_03", name: "Frutti Amari", text: "Nutrono, ma stancano.", effectId: "ev_heal1_wither" },
    { id: "jun_04", name: "Sentiero Animali", text: "Un passaggio più rapido.", effectId: "ev_choose_color_card" },
    { id: "jun_05", name: "Morso Velenoso", text: "Qualcosa ti azzanna.", effectId: "ev_dmg_self_2" },
    { id: "jun_06", name: "Radici Profonde", text: "Stabilità e forza.", effectId: "ev_shield_1" },
    { id: "jun_07", name: "Canto degli Uccelli", text: "Il morale sale.", effectId: "ev_heal_self_2" },
    { id: "jun_08", name: "Liane Strozzanti", text: "Restare fermi è pericoloso.", effectId: "ev_wither_self" },
    { id: "jun_09", name: "Predatore Ferito", text: "Impari dalla sua rabbia.", effectId: "ev_atk_perm_1" },
    { id: "jun_10", name: "Rugiada Mattutina", text: "Freschezza rinnovata.", effectId: "ev_heal_self_1" },
    { id: "jun_11", name: "Stormo in Fuga", text: "Un segnale di pericolo vicino.", effectId: "ev_dmg_self_1" },
  ],
  colosseo: [
    { id: "col_01", name: "Folla in Festa", text: "Urla di incoraggiamento.", effectId: "ev_next_attack_plus_2" },
    { id: "col_02", name: "Sangue sulla Sabbia", text: "Dolore e potenza.", effectId: "ev_dmg1_atk_perm_2" },
    { id: "col_03", name: "Indulto", text: "La folla chiede pietà.", effectId: "ev_wither_clear" },
    { id: "col_04", name: "Sfida Lanciata", text: "Un nemico ti fissa.", effectId: "ev_dmg_enemy_vis_1" },
    { id: "col_05", name: "Allenamento Brutale", text: "Sudore e lividi.", effectId: "ev_dmg_self_1_atk_1" },
    { id: "col_06", name: "Trofeo Minore", text: "Un ricordo della lotta.", effectId: "ev_choose_color_card" },
    { id: "col_07", name: "Arena Infuocata", text: "Il calore brucia.", effectId: "ev_dmg_self_2" },
    { id: "col_08", name: "Evviva il Campione", text: "Gloria temporanea.", effectId: "ev_shield_1_atk_1" },
    { id: "col_09", name: "Scommessa Persa", text: "Hai puntato male.", effectId: "ev_mana_loss_1" },
    { id: "col_10", name: "Scommessa Vinta", text: "Le monete tintinnano.", effectId: "ev_mana_gain_1" },
    { id: "col_11", name: "Secondo Vento", text: "Ancora in piedi.", effectId: "ev_heal_self_2" },
  ],
  statua: [
    { id: "sta_01", name: "Eco del Colosso", text: "La pietra condivide forza.", effectId: "ev_atk_perm_1_hp_1" },
    { id: "sta_02", name: "Sguardo di Pietra", text: "Un nemico si irrigidisce.", effectId: "ev_wither_enemy_vis" },
    { id: "sta_03", name: "Offerta al Monumento", text: "La statua offre due vision di un colore: scegline una.", effectId: "ev_choose_color_card" },
    { id: "sta_04", name: "Crepe", text: "Frammenti taglienti.", effectId: "ev_dmg_self_2" },
    { id: "sta_05", name: "Iscrizione Eroica", text: "Leggi e impari.", effectId: "ev_choose_color_card" },
    { id: "sta_06", name: "Ombra del Gigante", text: "Protezione imponente.", effectId: "ev_shield_2" },
    { id: "sta_07", name: "Polvere di Marmo", text: "Irrita gli occhi.", effectId: "ev_dmg_self_1" },
    { id: "sta_08", name: "Benedizione Antica", text: "Un tocco di eternità.", effectId: "ev_heal_self_3" },
    { id: "sta_09", name: "Malocchio della Statua", text: "Sfortuna passeggera.", effectId: "ev_discard_1" },
    { id: "sta_10", name: "Piedistallo Saldo", text: "Non cedi un centimetro.", effectId: "ev_shield_1" },
    { id: "sta_11", name: "Richiamo di Pietra", text: "La forza fluisce.", effectId: "ev_atk_perm_1" },
  ],
  mercato: [
    { id: "mer_01", name: "Affare Tentante", text: "Due proposte di un colore casuale: scegline una per la mano.", effectId: "ev_choose_color_card" },
    { id: "mer_02", name: "Borseggio", text: "Mani veloci nella folla.", effectId: "ev_foe_discard_1" },
    { id: "mer_03", name: "Sconto Occulto", text: "Un affare liquido: +1 mana.", effectId: "ev_mana_gain_1" },
    { id: "mer_04", name: "Truffa", text: "Hai pagato troppo.", effectId: "ev_mana_loss_1" },
    { id: "mer_05", name: "Mercante Generoso", text: "Un regalo inatteso.", effectId: "ev_choose_color_card" },
    { id: "mer_06", name: "Contrabbando", text: "Merce proibita ma utile.", effectId: "ev_shield_1_draw_1" },
    { id: "mer_07", name: "Debito Imposto", text: "Dovrai restituire un favore.", effectId: "ev_dmg_self_1" },
    { id: "mer_08", name: "Asta Riuscita", text: "Hai venduto al momento giusto.", effectId: "ev_mana_gain_1" },
    { id: "mer_09", name: "Merce Guasta", text: "Meglio non aver mangiato.", effectId: "ev_dmg_self_2" },
    { id: "mer_10", name: "Informazione Pagata", text: "Un segreto vale oro.", effectId: "ev_choose_color_card" },
    { id: "mer_11", name: "Patto Commerciale", text: "Scambio equo.", effectId: "ev_heal_self_2" },
  ],
};

/** Genera le zone speciali sulla mappa (mutates CELL_TYPE). */
function generateSpecialZones(rng = Math.random) {
  const candidates = PLAINS.map(([q, r]) => q + "," + r).filter(k => {
    const t = CELL_TYPE.get(k);
    return t === "plain" || (typeof EVENT_TILE_TYPES !== "undefined" && EVENT_TILE_TYPES.includes(t)) || t === "teletrasporto";
  });
  candidates.forEach(k => CELL_TYPE.set(k, "plain"));

  function pickN(n) {
    const out = [];
    const pool = candidates.slice();
    for (let i = 0; i < n && pool.length; i++) {
      const idx = Math.floor(rng() * pool.length);
      out.push(pool.splice(idx, 1)[0]);
    }
    // remove picked from candidates for subsequent picks
    out.forEach(k => {
      const i = candidates.indexOf(k);
      if (i >= 0) candidates.splice(i, 1);
    });
    return out;
  }

  const zones = {};

  pickN(3).forEach(k => {
    CELL_TYPE.set(k, "teletrasporto");
    zones[k] = { type: "teletrasporto", name: "Teletrasporto", icon: "🌀" };
  });

  const nCircoli = 1 + (rng() < 0.5 ? 1 : 0);
  pickN(nCircoli).forEach(k => {
    CELL_TYPE.set(k, "circolo");
    zones[k] = { type: "circolo", name: "Circolo Rituale", icon: "✦" };
  });

  ["villaggio","cimitero","rovine","santuario","jungla","colosseo","statua","mercato"].forEach(type => {
    const picked = pickN(1);
    if (!picked.length) return;
    const k = picked[0];
    const def = TILE_TYPE_DEFS[type];
    CELL_TYPE.set(k, type);
    zones[k] = { type, name: def.name, icon: def.icon };
  });

  return zones;
}

let SPECIAL_ZONES = {};


// =====================================================
// CARD CATALOG – effetti strutturati (effectId)
// =====================================================
const ALL_CARDS = [
  // Mostri Economici (costo 1)
  { id: "m01", name: "Novizio d'Avorio", type: "mostro", color: "white", cost: 1, atk: 0, hp: 2,
    effect: "ETB: cura +1 PV a sé.", effectId: "etb_heal_self_1" },
  { id: "m02", name: "Scintilla Errante", type: "mostro", color: "red", cost: 1, atk: 2, hp: 1,
    effect: "ETB: 1 danno a bersaglio visibile.", effectId: "etb_damage_1" },
  { id: "m03", name: "Ghoul Affamato", type: "mostro", color: "black", cost: 1, atk: 1, hp: 1,
    effect: "ETB: si sacrifica e fa scartare 1 carta all'avversario.", effectId: "etb_sacrifice_discard" },
  { id: "m04", name: "Velo di Cristallo", type: "mostro", color: "blue", cost: 1, atk: 0, hp: 2,
    effect: "ETB: ottiene 1 scudo.", effectId: "etb_shield_self_1" },
  { id: "m05", name: "Germoglio Silvestre", type: "mostro", color: "green", cost: 1, atk: 1, hp: 2,
    effect: "Fine turno su Pianura: +1 ATK permanente.", effectId: "eot_plain_atk_1" },

  // Mostri Standard
  { id: "m06", name: "Guardiano d'Avorio", type: "mostro", color: "white", cost: 2, atk: 1, hp: 4,
    effect: "ETB: +2 PV a sé. Uscita: cura 2 PV a un alleato.", effectId: "etb_heal_self_2", leaveEffectId: "leave_heal_ally_2" },
  { id: "m07", name: "Furia Cremisi", type: "mostro", color: "red", cost: 2, atk: 3, hp: 2,
    effect: "ETB: 1 danno a bersaglio. Uscita: 1 danno all'attaccante.", effectId: "etb_damage_1", leaveEffectId: "leave_damage_attacker_1" },
  { id: "m08", name: "Ombra Strisciante", type: "mostro", color: "black", cost: 3, atk: 2, hp: 2,
    effect: "ETB: sacrifica una creatura alleata per distruggerne una nemica.", effectId: "etb_sac_destroy" },
  { id: "m09", name: "Sentinella di Cristallo", type: "mostro", color: "blue", cost: 2, atk: 1, hp: 3,
    effect: "ETB: ottiene 1 scudo.", effectId: "etb_shield_self_1" },
  { id: "m10", name: "Colosso delle Radici", type: "mostro", color: "green", cost: 3, atk: 3, hp: 3,
    effect: "ETB: se su Pianura +1 ATK. Fine turno adiacente a alleato: +1 ATK.", effectId: "etb_plain_atk_1" },

  // Mostri Potenti
  { id: "m11", name: "Arcangelo di Penumbra", type: "mostro", color: "white", cost: 6, atk: 3, hp: 8,
    effect: "ETB: +4 PV a tutti gli alleati.", effectId: "etb_heal_allies_4" },
  { id: "m12", name: "Drago del Cataclisma", type: "mostro", color: "red", cost: 6, atk: 6, hp: 5,
    effect: "ETB: 3 danni a bersaglio + 1 agli adiacenti.", effectId: "etb_damage_3_aoe1" },
  { id: "m13", name: "Signore dell'Olocausto", type: "mostro", color: "black", cost: 6, atk: 4, hp: 4,
    effect: "ETB: sacrifica fino a 2 alleati per distruggere altrettanti nemici.", effectId: "etb_sac_up_to_2" },
  { id: "m14", name: "Maestro dei Mari Eterei", type: "mostro", color: "blue", cost: 6, atk: 2, hp: 6,
    effect: "ETB: scudo +1 agli alleati adiacenti.", effectId: "etb_shield_adj_1" },
  { id: "m15", name: "Antico della Foresta", type: "mostro", color: "green", cost: 6, atk: 5, hp: 7,
    effect: "ETB: +2 ATK per ogni alleato presente.", effectId: "etb_atk_per_ally_2" },

  // Maledizioni 3
  { id: "c01", name: "Benedizione Maggiore", type: "maledizione", color: "white", cost: 3,
    effect: "Aumenta permanentemente i PV di una creatura di +3.", effectId: "curse_heal_3", needsTarget: true },
  { id: "c02", name: "Colpo Infuocato", type: "maledizione", color: "red", cost: 3,
    effect: "Infligge 3 danni diretti a una creatura.", effectId: "curse_damage_3", needsTarget: true },
  { id: "c03", name: "Disintegrazione", type: "maledizione", color: "black", cost: 3,
    effect: "Distrugge una creatura bersaglio.", effectId: "curse_destroy", needsTarget: true },
  { id: "c04", name: "Scudo Assoluto", type: "maledizione", color: "blue", cost: 3,
    effect: "La creatura bersaglio ottiene 1 scudo (tanka il prossimo danno).", effectId: "curse_shield_1", needsTarget: true },
  { id: "c05", name: "Furia Primordiale", type: "maledizione", color: "green", cost: 3,
    effect: "Aumenta permanentemente l'ATK di una creatura di +3.", effectId: "curse_atk_3", needsTarget: true },

  // Maledizioni 5
  { id: "c06", name: "Benedizione Suprema", type: "maledizione", color: "white", cost: 5,
    effect: "Aumenta i PV di +6.", effectId: "curse_heal_6", needsTarget: true },
  { id: "c07", name: "Tempesta di Fuoco", type: "maledizione", color: "red", cost: 5,
    effect: "Infligge 6 danni diretti.", effectId: "curse_damage_6", needsTarget: true },
  { id: "c08", name: "Olocausto", type: "maledizione", color: "black", cost: 5,
    effect: "Distrugge 2 creature bersaglio.", effectId: "curse_destroy_2", needsTarget: true, multiTarget: 2 },
  { id: "c09", name: "Barriera Eterea", type: "maledizione", color: "blue", cost: 5,
    effect: "Tanka i prossimi 2 danni subiti.", effectId: "curse_shield_2", needsTarget: true },
  { id: "c10", name: "Forza della Natura", type: "maledizione", color: "green", cost: 5,
    effect: "Aumenta l'ATK di +6.", effectId: "curse_atk_6", needsTarget: true },

  // Trappole costo 1
  { id: "t01", name: "Cura d'Emergenza", type: "trappola", color: "white", cost: 1,
    effect: "Dopo che una tua creatura subisce danno, la cura di quel danno (se viva).",
    effectId: "trap_heal_after_damage", trigger: "after_damage" },
  { id: "t02", name: "Ritorsione Veloce", type: "trappola", color: "red", cost: 1,
    effect: "Dopo che una tua creatura subisce danni, fa 1 danno all'attaccante.",
    effectId: "trap_retaliate_1", trigger: "after_damage" },
  { id: "t03", name: "Vendetta Postuma", type: "trappola", color: "black", cost: 1,
    effect: "Dopo che una tua creatura muore, uccide l'attaccante.",
    effectId: "trap_revenge_kill", trigger: "on_death" },
  { id: "t04", name: "Rimbalzo Tattico", type: "trappola", color: "blue", cost: 1,
    effect: "Quando una tua creatura viene attaccata, fa tornare in mano le creature ancora vive coinvolte.",
    effectId: "trap_bounce", trigger: "on_attack" },
  { id: "t05", name: "Carica Preventiva", type: "trappola", color: "green", cost: 1,
    effect: "Appena prima che la creatura venga attaccata, le dà +1 ATK.",
    effectId: "trap_pre_atk_1", trigger: "on_attack" },

  // Trappole costo 4
  { id: "t06", name: "Barriera di Luce", type: "trappola", color: "white", cost: 4,
    effect: "Quando una tua creatura viene attaccata, le dà 2 scudi.",
    effectId: "trap_shield_2", trigger: "on_attack" },
  { id: "t07", name: "Contraccolpo Infuocato", type: "trappola", color: "red", cost: 4,
    effect: "Dopo danni subiti, infligge 3 danni all'attaccante.",
    effectId: "trap_retaliate_3", trigger: "after_damage" },
  { id: "t08", name: "Maledizione del Sepolcro", type: "trappola", color: "black", cost: 4,
    effect: "Quando una tua creatura muore, distrugge anche l'attaccante e una creatura adiacente.",
    effectId: "trap_death_aoe", trigger: "on_death" },
  { id: "t09", name: "Specchio Etereo", type: "trappola", color: "blue", cost: 4,
    effect: "Quando attaccata, riflette tutto il danno all'attaccante.",
    effectId: "trap_reflect", trigger: "on_attack" },
  { id: "t10", name: "Radici Protettive", type: "trappola", color: "green", cost: 4,
    effect: "Prima dell'attacco, la creatura ottiene +3 ATK permanente.",
    effectId: "trap_pre_atk_3", trigger: "on_attack" },
];

// Artefatto

// Token gratuito inizio turno (1/1 sul tempio)
const FREE_TOKEN = {
  id: "token_free",
  name: "Spirito del Tempio",
  type: "mostro",
  color: "yellow",
  cost: 0,
  atk: 1,
  hp: 1,
  effect: "Token gratuito ricevuto a inizio turno sul proprio Tempio.",
  effectId: null
};

const ARTIFACT_CARD = {
  id: "artifact",
  name: "L'Artefatto",
  type: "artefatto",
  color: "yellow",
  cost: 0,
  atk: 0,
  hp: 1,
  effect: "Si lega a un permanente. Se muore torna in mano con +3 costo. Se assente a fine turno → sconfitta.",
  effectId: null
};

// =====================================================
// MOSTRISSIMI (pool pubblica)
// =====================================================
const MOSTRISSIMI = [
  // Costo 0 sacrifici (2/2)
  { id: "ms00w", name: "Avatar della Vita", type: "mostrissimo", color: "white", cost: 0, sacrifice: 0, atk: 2, hp: 2,
    effect: "ETB: cura 2 PV a tutti gli alleati.", effectId: "ms_heal_allies_2" },
  { id: "ms00r", name: "Avatar della Fiamma", type: "mostrissimo", color: "red", cost: 0, sacrifice: 0, atk: 2, hp: 2,
    effect: "ETB: 2 danni a un bersaglio.", effectId: "ms_damage_2" },
  { id: "ms00k", name: "Avatar dell'Abisso", type: "mostrissimo", color: "black", cost: 0, sacrifice: 0, atk: 2, hp: 2,
    effect: "ETB: distrugge una creatura con 2 o meno PV.", effectId: "ms_destroy_low" },
  { id: "ms00b", name: "Avatar del Velo", type: "mostrissimo", color: "blue", cost: 0, sacrifice: 0, atk: 2, hp: 2,
    effect: "ETB: scudo +1 a sé e adiacenti.", effectId: "ms_shield_self_adj" },
  { id: "ms00g", name: "Avatar della Selva", type: "mostrissimo", color: "green", cost: 0, sacrifice: 0, atk: 2, hp: 2,
    effect: "ETB: +1 ATK permanente a sé.", effectId: "ms_atk_self_1" },
  { id: "ms00y", name: "Avatar Prisma", type: "mostrissimo", color: "yellow", cost: 0, sacrifice: 0, atk: 2, hp: 2,
    effect: "ETB: effetto casuale di un Avatar.", effectId: "ms_random" },

  // Costo 1 sacrificio (4/4)
  { id: "ms01w", name: "Titano della Vita", type: "mostrissimo", color: "white", cost: 0, sacrifice: 1, atk: 4, hp: 4,
    effect: "ETB: cura 4 PV a tutti gli alleati.", effectId: "ms_heal_allies_4" },
  { id: "ms01r", name: "Titano della Fiamma", type: "mostrissimo", color: "red", cost: 0, sacrifice: 1, atk: 4, hp: 4,
    effect: "ETB: 4 danni a un bersaglio.", effectId: "ms_damage_4" },
  { id: "ms01k", name: "Titano dell'Abisso", type: "mostrissimo", color: "black", cost: 0, sacrifice: 1, atk: 4, hp: 4,
    effect: "ETB: distrugge una creatura.", effectId: "ms_destroy" },
  { id: "ms01b", name: "Titano del Velo", type: "mostrissimo", color: "blue", cost: 0, sacrifice: 1, atk: 4, hp: 4,
    effect: "ETB: 2 scudi a sé.", effectId: "ms_shield_self_2" },
  { id: "ms01g", name: "Titano della Selva", type: "mostrissimo", color: "green", cost: 0, sacrifice: 1, atk: 4, hp: 4,
    effect: "ETB: +2 ATK permanente a sé.", effectId: "ms_atk_self_2" },

  // Livello 2 (2 sacrifici – 6/6)
  { id: "ms02", name: "Dominatore della Nebbia", type: "mostrissimo", color: "blue", cost: 0, sacrifice: 2, atk: 6, hp: 6,
    effect: "Toglie la Nebbia di Guerra per TUTTI fino al prossimo turno.", effectId: "ms_clear_fog_all" },

  // Livello 3 (3 sacrifici – 8/8)
  { id: "ms03", name: "Signore della Visione", type: "mostrissimo", color: "blue", cost: 0, sacrifice: 3, atk: 8, hp: 8,
    effect: "Toglie la Nebbia solo per te + distrugge una creatura e cura adiacenti.", effectId: "ms_clear_fog_self_destroy" },

  // Livello 4 (4 sacrifici – 10/10)
  { id: "ms04", name: "Purificatore", type: "mostrissimo", color: "white", cost: 0, sacrifice: 4, atk: 10, hp: 10,
    effect: "Distrugge un nemico e cura tutti gli alleati di 3.", effectId: "ms_purge" },

  // Livello 5 (5 sacrifici – 11/11)
  { id: "ms05", name: "Occhio Eterno", type: "mostrissimo", color: "blue", cost: 0, sacrifice: 5, atk: 11, hp: 11,
    effect: "Toglie la Nebbia solo per te FINCHÉ non viene distrutto + raddoppia i PV degli alleati.", effectId: "ms_eternal_eye" },

  // Livello 6 (6 sacrifici – 12/12)
  { id: "ms06", name: "Apocalisse Vivente", type: "mostrissimo", color: "black", cost: 0, sacrifice: 6, atk: 12, hp: 12,
    effect: "Distrugge tutti i nemici adiacenti e raddoppia i PV degli alleati.", effectId: "ms_apocalypse" },
];

// Colori
const COLORS = ["white", "red", "black", "blue", "green", "yellow"];
const COLOR_NAMES = {
  white: "Bianco", red: "Rosso", black: "Nero",
  blue: "Blu", green: "Verde", yellow: "Giallo"
};

// Tipi di terreno per eventi
const ZONE_COLORS = {
  plain: "#7CB342", mountain: "#5D4037", temple: "#5C6BC0", city: "#FFD54F",
  cimitero: "#78909C", rovine: "#A1887F", statua: "#90A4AE", colosseo: "#FF8A65",
  circolo: "#B39DDB", santuario: "#FFE082", jungla: "#558B2F", villaggio: "#BCAAA4",
  teletrasporto: "#4DD0E1", mercato: "#CE93D8"
};
