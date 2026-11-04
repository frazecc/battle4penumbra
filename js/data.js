// =====================================================
// BATTLE FOR PENUMBRA - GAME DATA
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
// CARD CATALOG (from design doc)
// =====================================================
const ALL_CARDS = [
  // Mostri Economici (costo 1)
  { id: "m01", name: "Novizio d'Avorio", type: "mostro", color: "white", cost: 1, atk: 0, hp: 2, effect: "ETB: cura +1 PV." },
  { id: "m02", name: "Scintilla Errante", type: "mostro", color: "red", cost: 1, atk: 2, hp: 1, effect: "ETB: fa 1 danno visibile." },
  { id: "m03", name: "Ghoul Affamato", type: "mostro", color: "black", cost: 1, atk: 1, hp: 1, effect: "ETB: si sacrifica per far scartare una carta." },
  { id: "m04", name: "Velo di Cristallo", type: "mostro", color: "blue", cost: 1, atk: 0, hp: 2, effect: "ETB: applica uno scudo base." },
  { id: "m05", name: "Germoglio Silvestre", type: "mostro", color: "green", cost: 1, atk: 1, hp: 2, effect: "Fine turno su Pianura ottiene +1 ATK permanente." },

  // Mostri Standard
  { id: "m06", name: "Guardiano d'Avorio", type: "mostro", color: "white", cost: 2, atk: 1, hp: 4, effect: "ETB: +2 PV a sé o a un alleato. Uscita: cura 2 PV." },
  { id: "m07", name: "Furia Cremisi", type: "mostro", color: "red", cost: 2, atk: 3, hp: 2, effect: "ETB: 1 danno a target visibile. Uscita: 1 danno all'attaccante." },
  { id: "m08", name: "Ombra Strisciante", type: "mostro", color: "black", cost: 3, atk: 2, hp: 2, effect: "ETB: sacrifica una creatura per distruggerne una avversaria." },
  { id: "m09", name: "Sentinella di Cristallo", type: "mostro", color: "blue", cost: 2, atk: 1, hp: 3, effect: "ETB: applica scudo al prossimo danno." },
  { id: "m10", name: "Colosso delle Radici", type: "mostro", color: "green", cost: 3, atk: 3, hp: 3, effect: "ETB: +1 ATK su Pianura. Fine turno adiacente a alleato +1 ATK permanente." },

  // Mostri Potenti
  { id: "m11", name: "Arcangelo di Penumbra", type: "mostro", color: "white", cost: 5, atk: 3, hp: 8, effect: "ETB: +4 PV a tutti gli alleati." },
  { id: "m12", name: "Drago del Cataclisma", type: "mostro", color: "red", cost: 6, atk: 6, hp: 5, effect: "ETB: 3 danni a bersaglio e 1 agli adiacenti." },
  { id: "m13", name: "Signore dell'Olocausto", type: "mostro", color: "black", cost: 6, atk: 4, hp: 4, effect: "ETB: sacrifica fino a 2 alleati per distruggere altrettanti nemici." },
  { id: "m14", name: "Maestro dei Mari Eterei", type: "mostro", color: "blue", cost: 5, atk: 2, hp: 6, effect: "ETB: scudo permanente agli adiacenti." },
  { id: "m15", name: "Antico della Foresta", type: "mostro", color: "green", cost: 6, atk: 5, hp: 7, effect: "ETB: +2 ATK per ogni alleato presente." },

  // Maledizioni 3
  { id: "c01", name: "Benedizione Maggiore", type: "maledizione", color: "white", cost: 3, effect: "Aumenta permanentemente i PV di una creatura di +3." },
  { id: "c02", name: "Colpo Infuocato", type: "maledizione", color: "red", cost: 3, effect: "Infligge 3 danni diretti a una creatura o entità bersaglio." },
  { id: "c03", name: "Disintegrazione", type: "maledizione", color: "black", cost: 3, effect: "Distrugge una creatura bersaglio." },
  { id: "c04", name: "Scudo Assoluto", type: "maledizione", color: "blue", cost: 3, effect: "Fa tankare completamente il prossimo danno alla creatura bersaglio." },
  { id: "c05", name: "Furia Primordiale", type: "maledizione", color: "green", cost: 3, effect: "Aumenta permanentemente l'ATK di una creatura di +3." },

  // Maledizioni 5
  { id: "c06", name: "Benedizione Suprema", type: "maledizione", color: "white", cost: 5, effect: "Aumenta i PV di +6." },
  { id: "c07", name: "Tempesta di Fuoco", type: "maledizione", color: "red", cost: 5, effect: "Infligge 6 danni diretti." },
  { id: "c08", name: "Olocausto", type: "maledizione", color: "black", cost: 5, effect: "Distrugge 2 creature bersaglio." },
  { id: "c09", name: "Barriera Eterea", type: "maledizione", color: "blue", cost: 5, effect: "Tanka i prossimi 2 danni subiti." },
  { id: "c10", name: "Forza della Natura", type: "maledizione", color: "green", cost: 5, effect: "Aumenta l'ATK di +6." },

  // Trappole 1
  { id: "t01", name: "Cura d'Emergenza", type: "trappola", color: "white", cost: 1, effect: "Dopo che una creatura subisce danno, la cura del danno subito (se ancora viva)." },
  { id: "t02", name: "Ritorsione Veloce", type: "trappola", color: "red", cost: 1, effect: "Dopo che una creatura subisce danni, fa 1 danno all'attaccante." },
  { id: "t03", name: "Vendetta Postuma", type: "trappola", color: "black", cost: 1, effect: "Dopo che una creatura muore, uccide l'attaccante." },
  { id: "t04", name: "Rimbalzo Tattico", type: "trappola", color: "blue", cost: 1, effect: "Quando una creatura viene attaccata, fa tornare in mano le creature ancora vive coinvolte." },
  { id: "t05", name: "Carica Preventiva", type: "trappola", color: "green", cost: 1, effect: "Appena prima che la creatura venga attaccata, le dà +1 ATK." },
];

// Artifact (special)
const ARTIFACT_CARD = {
  id: "artifact",
  name: "L'Artefatto",
  type: "artefatto",
  color: "yellow",
  cost: 0,
  effect: "Si lega a un permanente alleato. Se il permanente muore, l'Artefatto va al cimitero e torna in mano con costo +3. Se non è sul campo a fine turno → sconfitta."
};

// Colors for packs
const COLORS = ["white", "red", "black", "blue", "green", "yellow"];
const COLOR_NAMES = {
  white: "Bianco", red: "Rosso", black: "Nero",
  blue: "Blu", green: "Verde", yellow: "Giallo"
};
