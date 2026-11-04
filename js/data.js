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
  "-6,4":  { id: "A", label: "Tempio A", name: "Lago NW" },
  "-2,-4": { id: "B", label: "Tempio B", name: "Lago SW" },
  "2,4":   { id: "D", label: "Tempio D", name: "Lago NE" },
  "6,-4":  { id: "C", label: "Tempio C", name: "Lago SE" }
};

const CITY = [0, 0];

// Build cell lookup
const CELL_TYPE = new Map();
MOUNTAINS.forEach(([q,r]) => CELL_TYPE.set(`${q},${r}`, "mountain"));
PLAINS.forEach(([q,r]) => CELL_TYPE.set(`${q},${r}`, "plain"));
Object.keys(TEMPLES).forEach(k => CELL_TYPE.set(k, "water"));
CELL_TYPE.set("0,0", "city");

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
    effect: "ETB: +2 PV a sé. Uscita: cura 2 PV a un alleato.", effectId: "etb_heal_self_2" },
  { id: "m07", name: "Furia Cremisi", type: "mostro", color: "red", cost: 2, atk: 3, hp: 2,
    effect: "ETB: 1 danno a bersaglio. Uscita: 1 danno all'attaccante.", effectId: "etb_damage_1" },
  { id: "m08", name: "Ombra Strisciante", type: "mostro", color: "black", cost: 3, atk: 2, hp: 2,
    effect: "ETB: sacrifica una creatura alleata per distruggerne una nemica.", effectId: "etb_sac_destroy" },
  { id: "m09", name: "Sentinella di Cristallo", type: "mostro", color: "blue", cost: 2, atk: 1, hp: 3,
    effect: "ETB: ottiene 1 scudo.", effectId: "etb_shield_self_1" },
  { id: "m10", name: "Colosso delle Radici", type: "mostro", color: "green", cost: 3, atk: 3, hp: 3,
    effect: "ETB: se su Pianura +1 ATK. Fine turno adiacente a alleato: +1 ATK.", effectId: "etb_plain_atk_1" },

  // Mostri Potenti
  { id: "m11", name: "Arcangelo di Penumbra", type: "mostro", color: "white", cost: 5, atk: 3, hp: 8,
    effect: "ETB: +4 PV a tutti gli alleati.", effectId: "etb_heal_allies_4" },
  { id: "m12", name: "Drago del Cataclisma", type: "mostro", color: "red", cost: 6, atk: 6, hp: 5,
    effect: "ETB: 3 danni a bersaglio + 1 agli adiacenti.", effectId: "etb_damage_3_aoe1" },
  { id: "m13", name: "Signore dell'Olocausto", type: "mostro", color: "black", cost: 6, atk: 4, hp: 4,
    effect: "ETB: sacrifica fino a 2 alleati per distruggere altrettanti nemici.", effectId: "etb_sac_up_to_2" },
  { id: "m14", name: "Maestro dei Mari Eterei", type: "mostro", color: "blue", cost: 5, atk: 2, hp: 6,
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
const TERRAIN_EVENTS = {
  plain: [
    { id: "e_plain_1", name: "Benedizione della Pianura", color: "green", effect: "La creatura ottiene +1 ATK permanente." },
    { id: "e_plain_2", name: "Erbe Curative", color: "white", effect: "La creatura recupera 2 PV." },
    { id: "e_plain_3", name: "Trappola Naturale", color: "black", effect: "La creatura subisce 1 danno." }
  ],
  water: [
    { id: "e_water_1", name: "Acque Sacre", color: "blue", effect: "La creatura ottiene 1 scudo." },
    { id: "e_water_2", name: "Corrente Vigorosa", color: "green", effect: "La creatura ottiene +1 ATK e +1 PV." }
  ],
  city: [
    { id: "e_city_1", name: "Potere dell'Altare", color: "yellow", effect: "La creatura ottiene +2 ATK permanente." },
    { id: "e_city_2", name: "Rivelazione", color: "blue", effect: "Rivela tutte le celle adiacenti." }
  ]
};
