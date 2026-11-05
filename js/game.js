// =====================================================
// GAME ENGINE – FASI 3-12 (sistemi completi)
// Effetti, Trappole, Mostrissimi, Eventi, Combattimento con rimbalzo
// =====================================================

class Entity {
  constructor(id, name, isHuman = false) {
    this.id = id;
    this.name = name;
    this.isHuman = isHuman;
    this.isFallen = false;
    this.manaMax = 1;
    this.mana = 1;
    this.hand = [];
    this.field = [];
    this.graveyard = [];
    this.traps = [];
    this.artifact = null;
    this.artifactAttachedTo = null;
    this.templeKey = null;
    this.explored = new Set();
    this.tokens = [];
    this.passives = []; // stringhe passive da eventi
    this.quest = null;
    this.clearFogUntil = 0;
    this.templeId = null; // cielo/luna/guerra/acqua
    this.factionPower = "Potere fazione (placeholder)"; // TODO futuro
    this.firstPackPicked = false; // v027: primo pacchetto scelto
    this.primaryColor = null;     // colore del primo pacchetto
    this.apexCardInstanceId = null; // unica carta costo 6
  }

  startTurn() {
    this.manaMax += 1;
    this.mana = this.manaMax;
    // Sveglia le creature avvizzite e resetta il movimento del turno
    this.field.forEach(u => {
      u.isWithered = false;
      u.movedThisTurn = false;
    });
  }

  canPay(cost) {
    return this.mana >= (cost || 0);
  }

  pay(cost) {
    cost = cost || 0;
    if (this.canPay(cost)) {
      this.mana -= cost;
      return true;
    }
    return false;
  }

  hasArtifactOnField() {
    if (this.field.some(c => c.id === "artifact" || c.type === "artefatto")) return true;
    if (this.artifactAttachedTo) {
      return this.field.some(p => p.instanceId === this.artifactAttachedTo);
    }
    return false;
  }
}

class GameState {
  constructor(config) {
    this.humanName = config.humanName || "Giocatore";
    this.numAI = config.numAI || 1;
    this.numFallenTemples = config.numFallenTemples || 0;
    this.entities = [];
    this.turnIndex = 0;
    this.turnNumber = 1;
    this.phase = "setup";
    this.log = [];
    this.winner = null;
    this.loseReason = null;
    this.selectedCard = null;
    this.selectedUnit = null;
    this.moveMode = false;
    this.playMode = false;
    this.attachMode = false;
    this.targetMode = null;
    this.attachMode = false;
    this.pendingTrap = null;
    this.mostrissimiPool = [];
    this.globalClearFogUntil = 0;
    this.flippedCells = new Set();
    this.frozenVisibility = null; // Set di "q,r" visibili al momento della sconfitta umana (per Guarda mappa)

    // --- Modalità Sacrificio Mostrissimo (v023) ---
    this.sacrificeMode = false;
    this.sacrificeCard = null;          // carta Mostrissimo in fase di evocazione
    this.sacrificeCount = 0;
    this.sacrificeNeeded = 0;
    this.sacrificedPositions = new Set(); // chiavi "q,r" di Altare/Circolo sbloccati dai sacrifici

    // v025
    this.mostrissimiSummonedThisTurn = 0;
    this.pendingEventChoice = null; // { options: [{type,key,label}], entityId }
    this.pendingTeleportSteps = []; // coda passi obbligatori post-TP
    this.pendingTeleportStep = null; // { unitInstanceId, entityId, q, r, legal: [[q,r],...] }
    this.specialZones = {};
    this._endTurnEntityId = null; // entità che sta chiudendo il turno (async TP/eventi)
    this.pendingTempleOverwrite = null; // { card, q, r, victimInstanceId }
    this.pendingEnemyTempleMove = null; // { unitInstanceId, q, r }
    this.pendingCardPick = null; // { options: [card,card], entityId }

    this._initEntities();
    this._assignTemples();
    this._initMostrissimiPool();
    if (typeof generateSpecialZones === "function") {
      this.specialZones = generateSpecialZones();
      if (typeof SPECIAL_ZONES !== "undefined") SPECIAL_ZONES = this.specialZones;
    }
  }

  _initEntities() {
    // Sempre 4 entità: 1 umano + numAI IA + numFallenTemples caduti
    // numAI = 3 - numFallenTemples
    this.entities.push(new Entity("human", this.humanName, true));
    for (let i = 1; i <= this.numAI; i++) {
      this.entities.push(new Entity("ai" + i, "IA-" + i, false));
    }
    for (let i = 1; i <= this.numFallenTemples; i++) {
      const fallen = new Entity("fallen" + i, "Tempio Caduto " + i, false);
      fallen.isFallen = true;
      this.entities.push(fallen);
    }
    // Sicurezza: esattamente 4
    this.entities = this.entities.slice(0, 4);
  }

  _assignTemples() {
    const templeKeys = Object.keys(TEMPLES);
    for (let i = templeKeys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [templeKeys[i], templeKeys[j]] = [templeKeys[j], templeKeys[i]];
    }
    this.entities.forEach((e, idx) => {
      e.templeKey = templeKeys[idx];
      const t = TEMPLES[templeKeys[idx]];
      e.templeId = t ? t.id : null;
      e.templeIcon = t ? t.icon : "?";
      e.templeName = t ? t.name : "Tempio";
      this._revealAround(e, ...templeKeys[idx].split(",").map(Number), 2);
    });
    // Ordine orario geometrico dei templi per turn order
    this._buildClockwiseOrder();
  }

  _initMostrissimiPool() {
    const usedSacs = new Set();
    while (this.mostrissimiPool.length < 3) {
      const candidates = MOSTRISSIMI.filter(m => !usedSacs.has(m.sacrifice));
      if (!candidates.length) break;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.mostrissimiPool.push({ ...pick, instanceId: pick.id + "_pool_" + Date.now() + Math.random() });
      usedSacs.add(pick.sacrifice);
    }
  }

  _refillMostrissimo(index) {
    const currentSacs = this.mostrissimiPool.map(m => m.sacrifice);
    const candidates = MOSTRISSIMI.filter(m => !currentSacs.includes(m.sacrifice));
    if (candidates.length) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      this.mostrissimiPool[index] = { ...pick, instanceId: pick.id + "_pool_" + Date.now() };
    }
  }

  _buildClockwiseOrder() {
    const withAngle = this.entities.map(e => {
      const [q, r] = (e.templeKey || "0,0").split(",").map(Number);
      const x = Math.sqrt(3) * q + Math.sqrt(3) / 2 * r;
      const y = 1.5 * r;
      const angle = Math.atan2(y, x);
      return { e, angle };
    });
    withAngle.sort((a, b) => a.angle - b.angle);
    this.clockwiseIds = withAngle.map(x => x.e.id);
  }

  _nextClockwiseIndex(fromIndex, reverse = false) {
    const order = this.clockwiseIds || this.entities.map(e => e.id);
    const curId = this.entities[fromIndex].id;
    let pos = order.indexOf(curId);
    if (pos < 0) pos = 0;
    for (let i = 0; i < order.length; i++) {
      pos = reverse ? (pos - 1 + order.length) % order.length : (pos + 1) % order.length;
      const ent = this.entities.find(e => e.id === order[pos]);
      if (!ent) continue;
      if (!ent.isFallen) return this.entities.indexOf(ent);
      if (ent.isFallen && ent.field.length > 0) return this.entities.indexOf(ent);
    }
    return fromIndex;
  }

  get currentEntity() { return this.entities[this.turnIndex]; }
  get activePlayers() { return this.entities.filter(e => !e.isFallen); }

  addLog(msg, important = false) {
    const ts = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const entry = {
      msg: "[" + ts + " T" + this.turnNumber + "] " + msg,
      important,
      turn: this.turnNumber,
      time: Date.now(),
      phase: this.phase,
      current: this.currentEntity ? this.currentEntity.name : "?"
    };
    this.log.push(entry);
    if (this.log.length > 600) this.log.shift();
    if (important) console.log("%c" + entry.msg, "color:#FFD54F");
    else console.log(entry.msg);

    // Popup per ogni azione di gioco (poi filtriamo). Esclude solo messaggi tecnici interni.
    const technical = typeof msg === "string" && (msg.startsWith("(") || msg.includes("ignorato") || msg.includes("timeout IA"));
    if (!technical && typeof window !== "undefined" && typeof window.enqueueGamePopup === "function") {
      const cur = this.currentEntity;
      const playerLabel = cur
        ? ((cur.templeIcon || "") + " " + cur.name).trim()
        : null;
      window.enqueueGamePopup(entry.msg, {
        important,
        playerLabel,
        autoSkippable: true,
        allowMap: true
      });
    }
  }

  _revealAround(entity, q, r, radius = 2) {
    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.abs(dq) + Math.abs(dr) + Math.abs(-dq - dr) <= radius * 2) {
          const key = (q + dq) + "," + (r + dr);
          if (CELL_TYPE.has(key)) entity.explored.add(key);
        }
      }
    }
  }

  isVisibleTo(entity, q, r) {
    // Se la partita è finita per sconfitta umana, usa lo snapshot congelato
    if (this.frozenVisibility && entity && entity.isHuman) {
      return this.frozenVisibility.has(q + "," + r);
    }
    if (entity.isFallen) return false;
    // Clear fog globale / personale (Mostrissimi)
    if (this.globalClearFogUntil >= this.turnNumber) return true;
    if (entity.clearFogUntil >= this.turnNumber) return true;
    // Sempre visibile la cella della propria creatura
    if (entity.field.some(u => u.q === q && u.r === r)) return true;
    // Visione dinamica raggio 2 attorno a ogni creatura (mostro/mostrissimo)
    for (const u of entity.field) {
      if (u.type === "mostro" || u.type === "mostrissimo" || u.id === "token_free") {
        if (hexDistance(u.q, u.r, q, r) <= 2) return true;
      }
    }
    // Sempre visione attorno al proprio tempio (raggio 2)
    if (entity.templeKey) {
      const [tq, tr] = entity.templeKey.split(",").map(Number);
      if (q === tq && r === tr) return true;
      if (hexDistance(tq, tr, q, r) <= 2) return true;
    }
    return false;
  }

  /** Ritorna true se la carta può essere giocata legalmente in questo momento dal giocatore corrente */
  isCardPlayable(card, entity) {
    if (!card || !entity || entity.isFallen) return false;
    if (this.phase !== "playing") return false;
    if (this.currentEntity !== entity) return false;

    const cost = card.currentCost !== undefined ? card.currentCost : (card.cost || 0);
    if (!entity.canPay(cost)) return false;

    const t = (card.type || "").toLowerCase();

    if (t === "trappola") return false; // si attivano solo nel turno avversario

    if (t === "mostro") {
      // Deve esistere il tempio libero
      if (!entity.templeKey) return false;
      const [tq, tr] = entity.templeKey.split(",").map(Number);
      if (this.getUnitAt(tq, tr)) return false;
      return true;
    }

    if (t === "mostrissimo") {
      // v023: i Mostrissimi si evocano solo dal pool con flusso sacrificio interattivo.
      // Qui controlliamo solo se ci sono abbastanza permanenti da sacrificare
      // e se il proprio tempio è libero (casella sempre legale).
      const sac = card.sacrifice || 0;
      const permanents = entity.field.filter(u => u.type === "mostro" || u.type === "mostrissimo");
      if (permanents.length < sac) return false;
      if (!entity.templeKey) return false;
      const [tq, tr] = entity.templeKey.split(",").map(Number);
      // Il tempio deve essere libero OPPURE abbiamo abbastanza creature (potremmo sbloccare altare/circolo)
      // Per semplicità: se il tempio è libero OK; se no, serve almeno 1 permanente (che potrebbe stare su altare/circolo)
      if (!this.getUnitAt(tq, tr)) return true;
      return permanents.length > 0; // potrebbe sbloccare altre celle via sacrificio
    }

    if (t === "artefatto") {
      // Serve almeno una creatura propria in campo (non artefatto)
      return entity.field.some(u => u.type === "mostro" || u.type === "mostrissimo" || u.id === "token_free");
    }

    if (t === "maledizione") {
      // Per semplicità: se ha bisogno di bersaglio, controlla che esista almeno un nemico visibile
      if (card.needsTarget) {
        for (const ent of this.entities) {
          if (ent.id === entity.id || ent.isFallen) continue;
          for (const u of ent.field) {
            if (this.isVisibleTo(entity, u.q, u.r)) return true;
          }
        }
        return false;
      }
      return true; // effetti globali o senza bersaglio
    }

    return true; // altri tipi generici
  }

  startDraft() {
    this.phase = "draft";
    // 7 Wonders style: 3 giri di bustine
    // Giro 1: senso orario | Giro 2: antiorario | Giro 3: orario
    const actives = this.activePlayers;
    this.draft = {
      packs: this._generatePacks(3),
      currentPick: 0,
      totalPicksNeeded: actives.length * 3,
      picks: {},
      round: 1, // 1,2,3
      picksInRound: 0,
      reverse: false,
      firstId: null
    };
    actives.forEach(e => this.draft.picks[e.id] = []);
    // Primo giocatore casuale
    const first = actives[Math.floor(Math.random() * actives.length)];
    this.draft.firstId = first.id;
    this.turnIndex = this.entities.indexOf(first);
    this.addLog("Draft stile 7 Wonders! Primo: " + first.name + " — Giro 1 (orario)", true);
  }

  _generatePacks(count, opts = {}) {
    const packs = [];
    const allowCost6 = !!opts.allowCost6;
    const forceColor = opts.forceColor || null;
    for (let p = 0; p < count; p++) {
      const color = forceColor || COLORS[Math.floor(Math.random() * COLORS.length)];
      let pool = ALL_CARDS.filter(c => c.color === color || color === "yellow");
      if (!allowCost6) pool = pool.filter(c => (c.cost || 0) < 6);
      const cards = [];
      const poolCopy = [...pool];
      for (let i = 0; i < 3 && poolCopy.length; i++) {
        const idx = Math.floor(Math.random() * poolCopy.length);
        const base = poolCopy[idx];
        cards.push({ ...base, instanceId: base.id + "_p" + Date.now() + "_" + p + "_" + i + "_" + Math.random().toString(36).slice(2,6) });
        poolCopy.splice(idx, 1);
      }
      packs.push({ color, cards, id: "pack_" + Date.now() + "_" + p + "_" + Math.random().toString(36).slice(2,5) });
    }
    return packs;
  }

  /** Inserisce nel pacchetto l'unica carta costo 6 del colore (mostro leggendario) */
  _injectApexIntoPack(pack) {
    const color = pack.color === "yellow"
      ? COLORS[Math.floor(Math.random() * COLORS.length)]
      : pack.color;
    const apexPool = ALL_CARDS.filter(c => c.type === "mostro" && c.color === color && (c.cost || 0) === 6);
    const apexBase = apexPool.length
      ? apexPool[Math.floor(Math.random() * apexPool.length)]
      : ALL_CARDS.filter(c => c.type === "mostro" && c.color === color).sort((a,b)=>(b.cost||0)-(a.cost||0))[0];
    if (!apexBase) return pack;
    const apex = {
      ...apexBase,
      cost: 6,
      instanceId: apexBase.id + "_apex_" + Date.now() + "_" + Math.random().toString(36).slice(2,6),
      isApex: true
    };
    // sostituisci la carta di costo più alto già presente, o aggiungi
    if (pack.cards.length >= 3) {
      let maxI = 0;
      for (let i = 1; i < pack.cards.length; i++) {
        if ((pack.cards[i].cost || 0) > (pack.cards[maxI].cost || 0)) maxI = i;
      }
      pack.cards[maxI] = apex;
    } else {
      pack.cards.push(apex);
    }
    pack.color = color;
    return pack;
  }

  /** Rimuove carte costo 6 da un pacchetto (dopo il primo pick) */
  _stripCost6FromPack(pack) {
    const cleaned = pack.cards.filter(c => (c.cost || 0) < 6 && !c.isApex);
    while (cleaned.length < pack.cards.length) {
      const color = pack.color;
      const pool = ALL_CARDS.filter(c => (c.color === color || color === "yellow") && (c.cost || 0) < 6);
      if (!pool.length) break;
      const base = pool[Math.floor(Math.random() * pool.length)];
      cleaned.push({
        ...base,
        instanceId: base.id + "_fill_" + Date.now() + "_" + Math.random().toString(36).slice(2,6)
      });
      if (cleaned.length >= 3) break;
    }
    pack.cards = cleaned.slice(0, 3);
    return pack;
  }

  getDraftCurrentPicker() {
    if (!this.draft || this.draft.currentPick >= this.draft.totalPicksNeeded) return null;
    const e = this.entities[this.turnIndex];
    if (!e || e.isFallen) return this.activePlayers[0] || null;
    return e;
  }

  // Scegli intera bustina (packIndex)
  draftPickPack(packIndex) {
    const picker = this.getDraftCurrentPicker();
    if (!picker) return false;
    if (packIndex < 0 || packIndex >= this.draft.packs.length) return false;
    let pack = this.draft.packs[packIndex];
    // v027: primo pacchetto → inietta leggendaria costo 6 del colore; dopo mai più costo 6
    if (!picker.firstPackPicked) {
      pack = this._injectApexIntoPack(pack);
      picker.firstPackPicked = true;
      picker.primaryColor = pack.color;
      const apex = pack.cards.find(c => (c.cost || 0) >= 6 || c.isApex);
      if (apex) picker.apexCardInstanceId = apex.instanceId;
      this.addLog(picker.name + " sceglie il colore principale: " + (COLOR_NAMES[pack.color] || pack.color) + " (carta leggendaria costo 6)", true);
    } else {
      pack = this._stripCost6FromPack(pack);
    }
    // Tutte le 3 carte della bustina vanno al giocatore
    pack.cards.forEach(card => {
      this.draft.picks[picker.id].push(card);
    });
    this.addLog(picker.name + " ha scelto la bustina " + (COLOR_NAMES[pack.color] || pack.color) + " (" + pack.cards.map(c => c.name).join(", ") + ")", true);
    // Rimuovi la bustina scelta
    this.draft.packs.splice(packIndex, 1);
    this.draft.currentPick++;
    this.draft.picksInRound++;
    const nActive = this.activePlayers.length;
    // Fine del giro?
    if (this.draft.picksInRound >= nActive) {
      this.draft.picksInRound = 0;
      this.draft.round++;
      if (this.draft.round === 2) {
        this.draft.reverse = true;
        this.addLog("Giro 2 del draft (antiorario)", true);
      } else if (this.draft.round === 3) {
        this.draft.reverse = false;
        this.addLog("Giro 3 del draft (orario)", true);
      }
      // Torna al first player per il nuovo giro
      const first = this.entities.find(e => e.id === this.draft.firstId);
      if (first) this.turnIndex = this.entities.indexOf(first);
    } else {
      this.turnIndex = this._nextClockwiseIndex(this.turnIndex, this.draft.reverse);
    }
    if (this.draft.currentPick < this.draft.totalPicksNeeded) {
      while (this.draft.packs.length < 3) {
        this.draft.packs.push(this._generatePacks(1)[0]);
      }
    }
    this._processAIDraftPacks();
    if (this.draft.currentPick >= this.draft.totalPicksNeeded) this._finishDraft();
    return true;
  }

  // Compatibilità vecchia API (non usata più)
  draftPick(packIndex, cardIndex) {
    return this.draftPickPack(packIndex);
  }

  _processAIDraftPacks() {
    while (this.draft.currentPick < this.draft.totalPicksNeeded) {
      const picker = this.getDraftCurrentPicker();
      if (!picker || picker.isHuman) break;
      let bestIdx = 0, bestScore = -1;
      this.draft.packs.forEach((pack, pi) => {
        const score = pack.cards.reduce((s, c) => s + (c.cost || 0) * 10 + (c.atk || 0) + (c.hp || 0), 0) + Math.random();
        if (score > bestScore) { bestScore = score; bestIdx = pi; }
      });
      // riusa draftPickPack senza ricorsione AI infinita
      let pack = this.draft.packs[bestIdx];
      if (!picker.firstPackPicked) {
        pack = this._injectApexIntoPack(pack);
        picker.firstPackPicked = true;
        picker.primaryColor = pack.color;
        const apex = pack.cards.find(c => (c.cost || 0) >= 6 || c.isApex);
        if (apex) picker.apexCardInstanceId = apex.instanceId;
        this.addLog(picker.name + " colore principale: " + (COLOR_NAMES[pack.color] || pack.color), true);
      } else {
        pack = this._stripCost6FromPack(pack);
      }
      pack.cards.forEach(card => this.draft.picks[picker.id].push(card));
      this.addLog(picker.name + " ha scelto la bustina " + (COLOR_NAMES[pack.color] || pack.color));
      this.draft.packs.splice(bestIdx, 1);
      this.draft.currentPick++;
      this.draft.picksInRound++;
      const nActive = this.activePlayers.length;
      if (this.draft.picksInRound >= nActive) {
        this.draft.picksInRound = 0;
        this.draft.round++;
        if (this.draft.round === 2) { this.draft.reverse = true; this.addLog("Giro 2 del draft (antiorario)", true); }
        else if (this.draft.round === 3) { this.draft.reverse = false; this.addLog("Giro 3 del draft (orario)", true); }
        const first = this.entities.find(e => e.id === this.draft.firstId);
        if (first) this.turnIndex = this.entities.indexOf(first);
      } else {
        this.turnIndex = this._nextClockwiseIndex(this.turnIndex, this.draft.reverse);
      }
      if (this.draft.currentPick < this.draft.totalPicksNeeded) {
        while (this.draft.packs.length < 3) this.draft.packs.push(this._generatePacks(1)[0]);
      }
    }
    if (this.draft.currentPick >= this.draft.totalPicksNeeded) this._finishDraft();
  }

  _finishDraft() {
    // Evita doppia chiamata (causa timeout IA multipli e chiusura automatica del turno umano)
    if (this.phase === "playing" || this._draftFinished) {
      this.addLog("(_finishDraft ignorato: già completato)");
      return;
    }
    this._draftFinished = true;

    this.activePlayers.forEach(e => {
      e.hand = (this.draft.picks[e.id] || []).map(c => ({ ...c }));
      e.artifact = { ...ARTIFACT_CARD, instanceId: "artifact_" + e.id, currentCost: 0 };
      e.hand.push({ ...e.artifact });
    });
    this.addLog("Draft terminato! Artefatto consegnato a tutti.", true);
    this.phase = "playing";
    this._startGame();
  }

  _startGame() {
    this.entities.forEach(e => {
      if (e.templeKey) {
        const [tq, tr] = e.templeKey.split(",").map(Number);
        this._revealAround(e, tq, tr, 2);
      }
    });
    const actives = this.activePlayers;
    this.firstPlayerIndex = Math.floor(Math.random() * actives.length);
    this.turnIndex = this.entities.indexOf(actives[this.firstPlayerIndex]);
    this.turnNumber = 1;
    this.currentEntity.startTurn();
    // Token gratuito a tutte le entità (anche cadute) sul tempio
    this.entities.forEach(e => this._spawnFreeToken(e));
    this.addLog("=== PARTITA AVVIATA (v" + (typeof APP_VERSION !== "undefined" ? APP_VERSION : "?") + ") ===", true);
    this.addLog("Primo giocatore: " + this.currentEntity.name + " | Entità attive: " + actives.map(e => e.name).join(", "), true);
    this.entities.forEach(e => {
      this.addLog(e.name + " — mano: " + e.hand.length + " carte, campo: " + e.field.length + ", tempio: " + (e.templeName || e.templeKey));
    });
  }

  selectCardFromHand(instanceId) {
    const e = this.currentEntity;
    if (!e.isHuman) return;
    const card = e.hand.find(c => c.instanceId === instanceId);
    if (!card) return;
    if (card.type === "trappola") {
      this.addLog("Le Trappole si attivano solo nel turno avversario (restano in mano armate).");
      return;
    }
    this.selectedCard = card;
    this.selectedUnit = null;
    this.moveMode = false;
    this.targetMode = null;

    // Artefatto: deve essere legato a una creatura GIÀ in campo
    if (card.type === "artefatto") {
      if (e.field.filter(u => u.type !== "artefatto").length === 0) {
        this.addLog("L'Artefatto deve essere legato a una creatura già in campo! Evocane prima una.");
        this.selectedCard = null;
        this.playMode = false;
        return;
      }
      this.playMode = false;
      this.attachMode = true;
      this.addLog("Seleziona una TUA creatura in campo a cui legare l'Artefatto.");
      return;
    }

    this.playMode = true;
    this.attachMode = false;
    this.addLog("Selezionata: " + card.name + ". Clicca un esagono valido" + (card.needsTarget ? " o un bersaglio." : "."));
  }

  playCardOnHex(q, r) {
    const e = this.currentEntity;
    if (!this.selectedCard || !this.playMode) return false;
    const card = this.selectedCard;
    const cost = card.currentCost !== undefined ? card.currentCost : card.cost;
    if (!e.canPay(cost)) { this.addLog("Mana insufficiente!"); return false; }

    if (card.type === "mostro" || card.type === "mostrissimo") {
      if (CELL_TYPE.get(q + "," + r) === "mountain") { this.addLog("Non puoi piazzare su una montagna!"); return false; }
      const occupant = this.getUnitAt(q, r);
      // MOSTRO: solo sul proprio tempio
      if (card.type === "mostro") {
        if (e.templeKey !== (q + "," + r)) {
          this.addLog("I mostri si evocano SOLO sul proprio Tempio!");
          return false;
        }
        if (occupant) {
          // Conferma distruzione (alleato o nemico)
          this.pendingTempleOverwrite = {
            card, q, r,
            victimInstanceId: occupant.instanceId,
            victimName: occupant.name,
            victimOwnerId: occupant.ownerId
          };
          if (e.isHuman && typeof window !== "undefined" && window.onTempleOverwritePrompt) {
            window.onTempleOverwritePrompt(this.pendingTempleOverwrite);
          } else {
            this.confirmTempleOverwrite(true);
          }
          return true;
        }
      }
      if (occupant && card.type === "mostrissimo") {
        this.addLog("Cella occupata!");
        return false;
      }
      // MOSTRISSIMO (v023): solo Tempio proprio, oppure Altare/Circolo sbloccati dai sacrifici
      if (card.type === "mostrissimo") {
        const key = q + "," + r;
        const isOwnTemple = e.templeKey === key;
        const isUnlockedSpecial = this.sacrificedPositions && this.sacrificedPositions.has(key);
        if (!isOwnTemple && !isUnlockedSpecial) {
          this.addLog("Casella non legale per questo Mostrissimo! Solo il tuo Tempio, o Altare/Circolo su cui hai sacrificato.");
          return false;
        }
      }
      e.pay(cost);
      // I sacrifici sono già stati fatti in sacrificeMode: non si sacrificano più qui.
      e.hand = e.hand.filter(c => c.instanceId !== card.instanceId);
      const unit = {
        ...card,
        q, r,
        currentHp: card.hp || 1,
        shields: 0,
        ownerId: e.id,
        permanentAtkBonus: 0,
        movedThisTurn: false,
        isWithered: (card.type === "mostrissimo") // Mostrissimi entrano avvizziti; mostri normali no
      };
      e.field.push(unit);
      if (card.type === "artefatto") e.artifactAttachedTo = unit.instanceId;
      this._revealAround(e, q, r, 2);
      this.addLog(e.name + " gioca " + card.name + " su (" + q + "," + r + ")", true);
      if (card.type === "mostrissimo") {
        const idx = this.mostrissimiPool.findIndex(m => m.id === card.id);
        if (idx >= 0) this._refillMostrissimo(idx);
      }
      this._resolveETB(unit, e);
      this.selectedCard = null;
      this.playMode = false;
      // Pulisci stato sacrificio Mostrissimo
      this.sacrificeMode = false;
      this.sacrificeCard = null;
      this.sacrificeCount = 0;
      this.sacrificeNeeded = 0;
      this.sacrificedPositions = new Set();
      if (card.type === "mostrissimo") {
        this.mostrissimiSummonedThisTurn = (this.mostrissimiSummonedThisTurn || 0) + 1;
      }
      return true;
    }

    if (card.type === "maledizione") {
      if (card.needsTarget) {
        this.targetMode = { card, effectId: card.effectId, remaining: card.multiTarget || 1, targets: [] };
        this.playMode = false;
        this.addLog("Seleziona " + (card.multiTarget || 1) + " bersaglio/i per " + card.name);
        return true;
      }
      e.pay(cost);
      e.hand = e.hand.filter(c => c.instanceId !== card.instanceId);
      e.graveyard.push(card);
      this._resolveEffect(card.effectId, e, null);
      this.addLog(e.name + " lancia " + card.name + "!", true);
      this.selectedCard = null;
      this.playMode = false;
      return true;
    }
    return false;
  }

  selectTargetUnit(unit) {
    if (!this.targetMode) return false;
    const e = this.currentEntity;
    const { card, effectId } = this.targetMode;
    this.targetMode.targets.push(unit);
    this.targetMode.remaining--;
    if (this.targetMode.remaining <= 0) {
      const cost = card.currentCost !== undefined ? card.currentCost : card.cost;
      if (!e.canPay(cost)) { this.addLog("Mana insufficiente!"); this.targetMode = null; return false; }
      e.pay(cost);
      e.hand = e.hand.filter(c => c.instanceId !== card.instanceId);
      e.graveyard.push(card);
      this.targetMode.targets.forEach(t => this._resolveEffect(effectId, e, t));
      this.addLog(e.name + " lancia " + card.name + "!", true);
      this.targetMode = null;
      this.selectedCard = null;
      return true;
    }
    this.addLog("Bersaglio selezionato. Ne restano " + this.targetMode.remaining);
    return true;
  }


  attachArtifactToUnit(unitInstanceId) {
    const e = this.currentEntity;
    if (!this.attachMode || !this.selectedCard || this.selectedCard.type !== "artefatto") return false;
    const unit = e.field.find(u => u.instanceId === unitInstanceId);
    if (!unit) { this.addLog("Devi legare l'Artefatto a una TUA creatura."); return false; }
    const cost = this.selectedCard.currentCost !== undefined ? this.selectedCard.currentCost : 0;
    if (!e.canPay(cost)) { this.addLog("Mana insufficiente!"); return false; }
    e.pay(cost);
    e.hand = e.hand.filter(c => c.instanceId !== this.selectedCard.instanceId);
    e.artifactAttachedTo = unit.instanceId;
    unit.hasArtifact = true;
    this.addLog(e.name + " lega l'Artefatto a " + unit.name + "!", true);
    // Pulisci TUTTO lo stato di selezione: non aprire anteprima né moveMode
    this.selectedCard = null;
    this.selectedUnit = null;
    this.attachMode = false;
    this.playMode = false;
    this.moveMode = false;
    this.targetMode = null;
    return true;
  }

  selectUnit(instanceId) {
    const e = this.currentEntity;
    if (!e.isHuman) return;
    const unit = e.field.find(u => u.instanceId === instanceId);
    if (!unit) return;
    this.selectedUnit = unit;
    this.selectedCard = null;
    this.playMode = false;
    this.moveMode = true;
    this.targetMode = null;
    const free = !unit.movedThisTurn;
    this.addLog("Modalità Muovi: " + unit.name + " in (" + unit.q + "," + unit.r + "). Caselle verdi = destinazioni legali" + (free ? " (primo passo gratuito)" : " (1 mana)") + (unit.isWithered ? " — AVVIZZITA, non può agire" : "") + ". Usa Annulla per uscire.");
  }

  isCellDiscovered(q, r, entity) {
    const key = q + "," + r;
    if (CELL_TYPE.get(key) === "mountain") return true;
    if (key === "0,0") return true;
    if (entity && entity.templeKey === key) return true;
    if (this.flippedCells && this.flippedCells.has(key)) return true;
    return false;
  }

  tryMoveOrAttack(q, r) {
    const e = this.currentEntity;
    if (!this.selectedUnit || !this.moveMode) return false;
    const unit = this.selectedUnit;

    // Avvizzita: non può fare azioni (solo difendere)
    if (unit.isWithered) {
      this.addLog(unit.name + " è avvizzita e non può agire questo turno.");
      this.moveMode = false;
      this.selectedUnit = null;
      return false;
    }

    // Se sei su cella non scoperta non puoi muoverti oltre questo turno
    if (!this.isCellDiscovered(unit.q, unit.r, e)) {
      this.addLog("Cella inesplorata: non puoi muoverti oltre in questo turno! (si scopre a fine turno)");
      this.moveMode = false;
      this.selectedUnit = null;
      return false;
    }
    const dist = hexDistance(unit.q, unit.r, q, r);
    if (dist !== 1) { this.addLog("Solo 1 passo alla volta!"); return false; }
    if (CELL_TYPE.get(q + "," + r) === "mountain") { this.addLog("Montagne invalicabili!"); return false; }

    // Primo movimento del turno della creatura è gratuito
    const cost = unit.movedThisTurn ? 1 : 0;
    if (!e.canPay(cost)) { this.addLog("Mana insufficiente!"); return false; }

    const targetUnit = this.getUnitAt(q, r);
    if (!targetUnit) {
      // Avviso tempio nemico
      const enemyTemple = this.entities.find(ent => !ent.isFallen && ent.id !== e.id && ent.templeKey === (q + "," + r));
      if (enemyTemple && e.isHuman && !this.pendingEnemyTempleMove) {
        this.pendingEnemyTempleMove = { unitInstanceId: unit.instanceId, q, r, cost };
        if (typeof window !== "undefined" && window.onEnemyTempleWarning) {
          window.onEnemyTempleWarning({ templeOwner: enemyTemple.name, unitName: unit.name, q, r });
        }
        return true;
      }
      return this._commitMove(unit, e, q, r, cost);
    }
    if (targetUnit.ownerId === e.id) { this.addLog("Cella alleata!"); return false; }

    // Attacco
    e.pay(cost);
    unit.movedThisTurn = true;
    unit.isWithered = true; // attaccare avvizzisce
    const originQ = unit.q, originR = unit.r;
    this._resolveCombat(unit, targetUnit, originQ, originR);
    this.addLog(unit.name + " ha attaccato e diventa avvizzita.");
    this.selectedUnit = null;
    this.moveMode = false;
    return true;
  }

  getUnitAt(q, r) {
    for (const ent of this.entities) {
      const u = ent.field.find(u => u.q === q && u.r === r);
      if (u) return u;
    }
    return null;
  }

  getEntityById(id) { return this.entities.find(e => e.id === id); }

  _resolveCombat(attacker, defender, originQ, originR) {
    const atkEnt = this.getEntityById(attacker.ownerId);
    const defEnt = this.getEntityById(defender.ownerId);
    this._checkTraps(defEnt, "on_attack", { attacker, defender });
    const atkPower = (attacker.atk || 0) + (attacker.permanentAtkBonus || 0);
    this.addLog("⚔️ " + attacker.name + " (" + atkPower + ") attacca " + defender.name + " (" + defender.currentHp + " PV)", true);
    let dmg = atkPower;
    if (defender.shields > 0) {
      const absorbed = Math.min(defender.shields, dmg);
      defender.shields -= absorbed; dmg -= absorbed;
      this.addLog("Scudo assorbe " + absorbed + " danni");
    }
    if (dmg >= defender.currentHp) {
      const defQ = defender.q, defR = defender.r;
      this._destroyUnit(defender, { attacker, defender });
      this._checkTraps(defEnt, "on_death", { attacker, defender });
      // L'attaccante occupa la cella del difensore solo se è ancora vivo
      if (atkEnt.field.some(u => u.instanceId === attacker.instanceId)) {
        attacker.q = defQ; attacker.r = defR;
        this._revealAround(atkEnt, attacker.q, attacker.r, 2);
      }
    } else {
      defender.currentHp -= dmg;
      this.addLog(defender.name + " subisce " + dmg + " → " + defender.currentHp + " PV");
      this._checkTraps(defEnt, "after_damage", { attacker, defender, damage: dmg });
      let counter = (defender.atk || 0) + (defender.permanentAtkBonus || 0);
      if (attacker.shields > 0) {
        const absorbed = Math.min(attacker.shields, counter);
        attacker.shields -= absorbed; counter -= absorbed;
      }
      if (counter >= (attacker.currentHp || 1)) {
        this.addLog(attacker.name + " muore dal contrattacco!");
        this._destroyUnit(attacker, { attacker: defender, defender: attacker });
      } else if (counter > 0) {
        attacker.currentHp -= counter;
        this.addLog("Contrattacco: " + attacker.name + " ha " + attacker.currentHp + " PV");
      }
      if (atkEnt.field.some(u => u.instanceId === attacker.instanceId)) {
        attacker.q = originQ; attacker.r = originR;
        this.addLog(attacker.name + " rimbalza alla cella di partenza.");
      }
    }
  }

  _checkTraps(owner, trigger, ctx) {
    if (!owner || owner.isFallen) return;
    const available = owner.hand.filter(c => c.type === "trappola" && c.trigger === trigger);
    if (!available.length) return;
    if (owner.isHuman) {
      this.pendingTrap = { owner, trigger, ctx, options: available };
      if (typeof window !== "undefined" && window.onTrapPrompt) window.onTrapPrompt(this.pendingTrap);
    } else {
      const trap = available[0];
      if (owner.canPay(trap.cost || 0)) this._activateTrap(owner, trap, ctx);
    }
  }

  activatePendingTrap(trapInstanceId) {
    if (!this.pendingTrap) return false;
    const { owner, ctx } = this.pendingTrap;
    const trap = owner.hand.find(c => c.instanceId === trapInstanceId);
    if (!trap) return false;
    if (!owner.canPay(trap.cost || 0)) { this.addLog("Mana insufficiente per la trappola!"); return false; }
    this._activateTrap(owner, trap, ctx);
    this.pendingTrap = null;
    return true;
  }

  declinePendingTrap() { this.pendingTrap = null; }

  _activateTrap(owner, trap, ctx) {
    owner.pay(trap.cost || 0);
    owner.hand = owner.hand.filter(c => c.instanceId !== trap.instanceId);
    owner.graveyard.push(trap);
    this.addLog("🪤 " + owner.name + " attiva " + trap.name + "!", true);
    this._resolveEffect(trap.effectId, owner, ctx && ctx.defender ? ctx.defender : (ctx && ctx.attacker ? ctx.attacker : null), ctx);
  }

  _resolveETB(unit, owner) {
    if (!unit.effectId) return;
    this._resolveEffect(unit.effectId, owner, unit);
  }

  _resolveEffect(effectId, sourceEntity, targetUnit, ctx) {
    if (!effectId) return;
    ctx = ctx || {};
    const self = targetUnit;
    switch (effectId) {
      case "etb_heal_self_1":
        if (self) { self.currentHp = (self.currentHp || 0) + 1; this.addLog(self.name + " cura +1 PV"); }
        break;
      case "etb_heal_self_2":
        if (self) { self.currentHp = (self.currentHp || 0) + 2; this.addLog(self.name + " cura +2 PV"); }
        break;
      case "etb_shield_self_1":
        if (self) { self.shields = (self.shields || 0) + 1; this.addLog(self.name + " ottiene 1 scudo"); }
        break;
      case "etb_damage_1":
        this._damageVisibleTarget(sourceEntity, 1);
        break;
      case "etb_plain_atk_1":
        if (self && CELL_TYPE.get(self.q + "," + self.r) === "plain") {
          self.permanentAtkBonus = (self.permanentAtkBonus || 0) + 1;
          this.addLog(self.name + " ottiene +1 ATK (Pianura)");
        }
        break;
      case "etb_heal_allies_4":
        sourceEntity.field.forEach(u => { u.currentHp = (u.currentHp || 0) + 4; });
        this.addLog("Tutti gli alleati +4 PV");
        break;
      case "etb_damage_3_aoe1":
        this._damageVisibleTarget(sourceEntity, 3, true);
        break;
      case "etb_shield_adj_1":
        if (self) {
          sourceEntity.field.forEach(u => {
            if (hexDistance(u.q, u.r, self.q, self.r) === 1) u.shields = (u.shields || 0) + 1;
          });
          this.addLog("Scudo +1 agli adiacenti");
        }
        break;
      case "etb_atk_per_ally_2":
        if (self) {
          const allies = sourceEntity.field.length - 1;
          self.permanentAtkBonus = (self.permanentAtkBonus || 0) + allies * 2;
          this.addLog(self.name + " ottiene +" + (allies * 2) + " ATK");
        }
        break;
      case "etb_sacrifice_discard":
        if (self) {
          sourceEntity.field = sourceEntity.field.filter(u => u.instanceId !== self.instanceId);
          sourceEntity.graveyard.push(self);
          this.addLog(self.name + " si sacrifica");
          const foes = this.activePlayers.filter(e => e.id !== sourceEntity.id);
          if (foes.length) {
            const foe = foes[Math.floor(Math.random() * foes.length)];
            if (foe.hand.length) {
              const idx = Math.floor(Math.random() * foe.hand.length);
              const discarded = foe.hand.splice(idx, 1)[0];
              foe.graveyard.push(discarded);
              this.addLog(foe.name + " scarta " + discarded.name);
            }
          }
        }
        break;
      case "etb_sac_destroy":
      case "etb_sac_up_to_2":
        this._destroyVisibleEnemy(sourceEntity);
        break;
      case "curse_heal_3":
        if (targetUnit) { targetUnit.currentHp = (targetUnit.currentHp || 0) + 3; this.addLog(targetUnit.name + " +3 PV"); }
        break;
      case "curse_heal_6":
        if (targetUnit) { targetUnit.currentHp = (targetUnit.currentHp || 0) + 6; this.addLog(targetUnit.name + " +6 PV"); }
        break;
      case "curse_damage_3":
        if (targetUnit) this._applyDamage(targetUnit, 3);
        break;
      case "curse_damage_6":
        if (targetUnit) this._applyDamage(targetUnit, 6);
        break;
      case "curse_destroy":
      case "curse_destroy_2":
        if (targetUnit) this._destroyUnit(targetUnit);
        break;
      case "curse_shield_1":
        if (targetUnit) { targetUnit.shields = (targetUnit.shields || 0) + 1; this.addLog(targetUnit.name + " ottiene 1 scudo"); }
        break;
      case "curse_shield_2":
        if (targetUnit) { targetUnit.shields = (targetUnit.shields || 0) + 2; this.addLog(targetUnit.name + " ottiene 2 scudi"); }
        break;
      case "curse_atk_3":
        if (targetUnit) { targetUnit.permanentAtkBonus = (targetUnit.permanentAtkBonus || 0) + 3; this.addLog(targetUnit.name + " +3 ATK"); }
        break;
      case "curse_atk_6":
        if (targetUnit) { targetUnit.permanentAtkBonus = (targetUnit.permanentAtkBonus || 0) + 6; this.addLog(targetUnit.name + " +6 ATK"); }
        break;
      case "trap_heal_after_damage":
        if (ctx.defender && ctx.damage) {
          ctx.defender.currentHp = (ctx.defender.currentHp || 0) + ctx.damage;
          this.addLog(ctx.defender.name + " viene curato di " + ctx.damage);
        }
        break;
      case "trap_retaliate_1":
        if (ctx.attacker) this._applyDamage(ctx.attacker, 1);
        break;
      case "trap_retaliate_3":
        if (ctx.attacker) this._applyDamage(ctx.attacker, 3);
        break;
      case "trap_revenge_kill":
        if (ctx.attacker) this._destroyUnit(ctx.attacker);
        break;
      case "trap_bounce":
        if (ctx.attacker) this._returnToHand(ctx.attacker);
        if (ctx.defender) this._returnToHand(ctx.defender);
        break;
      case "trap_pre_atk_1":
        if (ctx.defender) { ctx.defender.permanentAtkBonus = (ctx.defender.permanentAtkBonus || 0) + 1; this.addLog(ctx.defender.name + " +1 ATK preventivo"); }
        break;
      case "trap_pre_atk_3":
        if (ctx.defender) { ctx.defender.permanentAtkBonus = (ctx.defender.permanentAtkBonus || 0) + 3; this.addLog(ctx.defender.name + " +3 ATK preventivo"); }
        break;
      case "trap_shield_2":
        if (ctx.defender) { ctx.defender.shields = (ctx.defender.shields || 0) + 2; this.addLog(ctx.defender.name + " ottiene 2 scudi"); }
        break;
      case "trap_reflect":
        if (ctx.attacker && ctx.defender) {
          const dmg = (ctx.attacker.atk || 0) + (ctx.attacker.permanentAtkBonus || 0);
          this._applyDamage(ctx.attacker, dmg);
          this.addLog("Danno riflesso!");
        }
        break;
      case "trap_death_aoe":
        if (ctx.attacker) {
          this._destroyUnit(ctx.attacker);
          const adj = this._hexesInRange(ctx.attacker.q, ctx.attacker.r, 1);
          for (const [aq, ar] of adj) {
            const u = this.getUnitAt(aq, ar);
            if (u && u.ownerId !== sourceEntity.id) { this._destroyUnit(u); break; }
          }
        }
        break;
      case "ms_heal_allies_2":
        sourceEntity.field.forEach(u => { u.currentHp = (u.currentHp || 0) + 2; });
        break;
      case "ms_heal_allies_4":
        sourceEntity.field.forEach(u => { u.currentHp = (u.currentHp || 0) + 4; });
        break;
      case "ms_damage_2": this._damageVisibleTarget(sourceEntity, 2); break;
      case "ms_damage_4": this._damageVisibleTarget(sourceEntity, 4); break;
      case "ms_destroy_low":
      case "ms_destroy": this._destroyVisibleEnemy(sourceEntity); break;
      case "ms_shield_self_adj":
        if (self) {
          self.shields = (self.shields || 0) + 1;
          sourceEntity.field.forEach(u => {
            if (hexDistance(u.q, u.r, self.q, self.r) === 1) u.shields = (u.shields || 0) + 1;
          });
        }
        break;
      case "ms_shield_self_2":
        if (self) self.shields = (self.shields || 0) + 2;
        break;
      case "ms_atk_self_1":
        if (self) self.permanentAtkBonus = (self.permanentAtkBonus || 0) + 1;
        break;
      case "ms_atk_self_2":
        if (self) self.permanentAtkBonus = (self.permanentAtkBonus || 0) + 2;
        break;
      case "ms_clear_fog_all":
        this.globalClearFogUntil = this.turnNumber + 1;
        this.addLog("🌫️ Nebbia di Guerra rimossa per TUTTI fino al prossimo turno!", true);
        break;
      case "ms_clear_fog_self_destroy":
        sourceEntity.clearFogUntil = this.turnNumber + 1;
        this._destroyVisibleEnemy(sourceEntity);
        sourceEntity.field.forEach(u => { u.currentHp = (u.currentHp || 0) + 2; });
        break;
      case "ms_purge":
        this._destroyVisibleEnemy(sourceEntity);
        sourceEntity.field.forEach(u => { u.currentHp = (u.currentHp || 0) + 3; });
        break;
      case "ms_eternal_eye":
        sourceEntity.clearFogUntil = 9999;
        sourceEntity.field.forEach(u => { u.currentHp = (u.currentHp || 0) * 2; });
        this.addLog("👁️ Occhio Eterno: nebbia rimossa + PV raddoppiati!", true);
        break;
      case "ms_apocalypse":
        if (self) {
          const adj = this._hexesInRange(self.q, self.r, 1);
          adj.forEach(([aq, ar]) => {
            const u = this.getUnitAt(aq, ar);
            if (u && u.ownerId !== sourceEntity.id) this._destroyUnit(u);
          });
          sourceEntity.field.forEach(u => { u.currentHp = (u.currentHp || 0) * 2; });
        }
        break;
      case "ms_random":
        if (self) { self.currentHp = (self.currentHp || 0) + 1; self.shields = (self.shields || 0) + 1; }
        break;
      default:
        this.addLog("(effetto " + effectId + " non ancora mappato)");
    }
  }

  _applyDamage(unit, amount) {
    if (!unit) return;
    let dmg = amount;
    if (unit.shields > 0) {
      const abs = Math.min(unit.shields, dmg);
      unit.shields -= abs; dmg -= abs;
    }
    if (dmg <= 0) return;
    unit.currentHp = (unit.currentHp || 1) - dmg;
    this.addLog(unit.name + " subisce " + dmg + " danni → " + unit.currentHp + " PV");
    if (unit.currentHp <= 0) this._destroyUnit(unit);
  }

  /**
   * Distrugge un'unità e risolve gli effetti di Uscita.
   * @param {object} unit
   * @param {object} [ctx]  contesto opzionale (es. { attacker } in combattimento)
   */
  _destroyUnit(unit, ctx) {
    if (!unit) return;
    const ent = this.getEntityById(unit.ownerId);
    if (!ent) return;

    // Rimuovi dal campo PRIMA di risolvere Uscita (così "alleato" non include sé stesso)
    ent.field = ent.field.filter(u => u.instanceId !== unit.instanceId);
    ent.graveyard.push(unit);
    this.addLog(unit.name + " è stato distrutto!");

    // Artefatto attaccato torna in mano
    if (ent.artifactAttachedTo === unit.instanceId) {
      ent.artifactAttachedTo = null;
      if (ent.artifact) {
        const art = { ...ent.artifact, currentCost: (ent.artifact.currentCost || 0) + 3 };
        ent.hand.push(art);
        this.addLog("L'Artefatto di " + ent.name + " torna in mano (costo " + art.currentCost + ")");
      }
    }

    // Effetti di Uscita (leave)
    if (unit.leaveEffectId) {
      this._resolveLeaveEffect(unit, ent, ctx || {});
    }
  }

  /** Risolve leaveEffectId di una creatura appena uscita dal campo */
  _resolveLeaveEffect(unit, owner, ctx) {
    const id = unit.leaveEffectId;
    if (!id) return;
    switch (id) {
      case "leave_heal_ally_2": {
        const allies = owner.field.filter(u => u.instanceId !== unit.instanceId);
        if (!allies.length) {
          this.addLog("Uscita di " + unit.name + ": nessun alleato da curare.");
          break;
        }
        // Preferisce l'alleato con meno PV correnti
        allies.sort((a, b) => (a.currentHp || 0) - (b.currentHp || 0));
        const target = allies[0];
        target.currentHp = (target.currentHp || 0) + 2;
        this.addLog("Uscita di " + unit.name + ": " + target.name + " cura +2 PV (ora " + target.currentHp + ")");
        break;
      }
      case "leave_damage_attacker_1": {
        const attacker = ctx && ctx.attacker;
        if (!attacker) {
          this.addLog("Uscita di " + unit.name + ": nessun attaccante da colpire.");
          break;
        }
        // L'attaccante potrebbe essere già morto o rimosso
        const stillOnField = this.getEntityById(attacker.ownerId)
          && this.getEntityById(attacker.ownerId).field.some(u => u.instanceId === attacker.instanceId);
        if (!stillOnField) {
          this.addLog("Uscita di " + unit.name + ": l'attaccante non è più in campo.");
          break;
        }
        this._applyDamage(attacker, 1);
        this.addLog("Uscita di " + unit.name + ": 1 danno a " + attacker.name);
        break;
      }
      default:
        this.addLog("Uscita sconosciuta: " + id);
    }
  }

  _returnToHand(unit) {
    if (!unit) return;
    const ent = this.getEntityById(unit.ownerId);
    if (!ent) return;
    ent.field = ent.field.filter(u => u.instanceId !== unit.instanceId);
    const card = { ...unit };
    delete card.q; delete card.r; delete card.currentHp; delete card.shields;
    ent.hand.push(card);
    this.addLog(unit.name + " torna in mano");
  }

  _damageVisibleTarget(sourceEntity, amount, aoe) {
    for (const ent of this.entities) {
      if (ent.id === sourceEntity.id || ent.isFallen) continue;
      for (const u of ent.field) {
        if (this.isVisibleTo(sourceEntity, u.q, u.r)) {
          this._applyDamage(u, amount);
          if (aoe) {
            const adj = this._hexesInRange(u.q, u.r, 1);
            adj.forEach(([aq, ar]) => {
              const au = this.getUnitAt(aq, ar);
              if (au && au.ownerId !== sourceEntity.id) this._applyDamage(au, 1);
            });
          }
          return;
        }
      }
    }
    this.addLog("Nessun bersaglio visibile per il danno.");
  }

  _destroyVisibleEnemy(sourceEntity) {
    for (const ent of this.entities) {
      if (ent.id === sourceEntity.id || ent.isFallen) continue;
      for (const u of ent.field) {
        if (this.isVisibleTo(sourceEntity, u.q, u.r)) {
          this._destroyUnit(u);
          return;
        }
      }
    }
  }


  _spawnFreeToken(entity) {
    if (!entity.templeKey) return;
    const [tq, tr] = entity.templeKey.split(",").map(Number);
    // Se il tempio è già occupato, non piazzare
    if (this.getUnitAt(tq, tr)) return;
    const token = {
      ...FREE_TOKEN,
      instanceId: "token_" + entity.id + "_" + this.turnNumber + "_" + Math.random().toString(36).slice(2, 6),
      q: tq,
      r: tr,
      currentHp: 1,
      shields: 0,
      ownerId: entity.id,
      permanentAtkBonus: 0,
      movedThisTurn: false,
      isWithered: false
    };
    entity.field.push(token);
    this._revealAround(entity, tq, tr, 2);
    this.addLog(entity.name + " riceve Spirito del Tempio (1/1) sul tempio.");
  }

  endTurn() {
    const current = this.currentEntity;
    this.addLog(current.name + " termina il turno.");
    current.field.forEach(u => {
      if (u.effectId === "eot_plain_atk_1" && CELL_TYPE.get(u.q + "," + u.r) === "plain") {
        u.permanentAtkBonus = (u.permanentAtkBonus || 0) + 1;
        this.addLog(u.name + " (Pianura) ottiene +1 ATK permanente");
      }
    });

    // 1) Flip tutte le celle occupate da creature alleate
    if (current.field.length > 0) {
      current.field.forEach(u => {
        const key = u.q + "," + u.r;
        const wasNew = !this.flippedCells.has(key);
        this.flippedCells.add(key);
        if (wasNew) {
          const t = CELL_TYPE.get(key) || "plain";
          const def = (typeof TILE_TYPE_DEFS !== "undefined" && TILE_TYPE_DEFS[t]) ? TILE_TYPE_DEFS[t] : null;
          this.addLog("Esagono scoperto (" + u.q + "," + u.r + "): " + (def ? def.name : t), true);
        }
      });

      // 2) Teletrasporti: sposta sui portali, poi passo obbligatorio (manuale per umano)
      this._endTurnEntityId = current.id;
      const needStep = this._resolveTeleportsForEntity(current);
      if (needStep) {
        // In attesa di completeTeleportStep (umano) oppure già risolto in coda (IA)
        return;
      }

      // 3) Eventi
      if (this._runEndTurnEvents(current)) return; // in attesa scelta evento umana
    }
    this._finishEndTurn(current);
  }

  /** Ritorna true se resta in attesa di input umano (scelta evento) */
  _runEndTurnEvents(current) {
    const options = this._collectEventOptions(current);
    if (options.length === 1) {
      this._drawAndResolveEvent(current, options[0]);
      return false;
    }
    if (options.length > 1) {
      if (current.isHuman) {
        this.pendingEventChoice = { options, entityId: current.id };
        if (typeof window !== "undefined" && window.onEventChoicePrompt) {
          window.onEventChoicePrompt(this.pendingEventChoice);
        }
        return true;
      }
      const pick = options[Math.floor(Math.random() * options.length)];
      this._drawAndResolveEvent(current, pick);
    }
    return false;
  }

  /** Dopo l'ultimo passo TP obbligatorio → eventi → fine turno */
  _continueAfterTeleportSteps() {
    const current = this.getEntityById(this._endTurnEntityId) || this.currentEntity;
    this.pendingTeleportStep = null;
    this.pendingTeleportSteps = [];
    if (this._runEndTurnEvents(current)) return;
    this._finishEndTurn(current);
  }

  _finishEndTurn(current) {
    if (!current.isFallen) {
      // L'Artefatto deve essere SUL CAMPO a fine turno.
      // Eccezione di sicurezza: non far scattare la sconfitta se siamo ancora al turnNumber 1
      // e il giocatore ha ancora l'Artefatto in mano (non ha avuto modo di giocarlo).
      const hasArtInHand = current.hand.some(c => c.id === "artifact" || c.type === "artefatto");
      const shouldCheckArtifact = !(this.turnNumber <= 1 && hasArtInHand);

      if (shouldCheckArtifact && !current.hasArtifactOnField()) {
        // Snapshot della visione PRIMA di segnare caduto (serve per "Guarda la mappa")
        if (current.isHuman) {
          this.frozenVisibility = new Set();
          for (const [key, type] of CELL_TYPE) {
            const [q, r] = key.split(",").map(Number);
            if (type === "mountain" || this.isVisibleTo(current, q, r)) {
              this.frozenVisibility.add(key);
            }
          }
        }

        current.isFallen = true;
        current.hand = []; // caduto: niente carte
        this.loseReason = current.name + " ha perso: Artefatto non presente sul campo a fine turno";
        this.addLog("💀 " + current.name + " decade! (Artefatto assente sul campo)", true);

        // Se è l'umano a decadere e non ci sono più umani vivi → partita chiusa subito
        if (current.isHuman) {
          const stillHumans = this.entities.some(e => e.isHuman && !e.isFallen);
          if (!stillHumans) {
            this.winner = null;
            this.phase = "ended";
            if (typeof window !== "undefined" && window.onGameEnd) {
              window.onGameEnd(this);
            }
            return; // non far giocare le IA
          }
        }
      }
    }
    this._checkWin();
    if (this.phase === "ended") return;
    this.turnIndex = this._nextClockwiseIndex(this.turnIndex, false);
    this.turnNumber++;
    const nextE = this.currentEntity;
    nextE.startTurn();
    this.mostrissimiSummonedThisTurn = 0;
    this._spawnFreeToken(nextE);
    this.selectedCard = null;
    this.selectedUnit = null;
    this.moveMode = false;
    this.playMode = false;
    this.attachMode = false;
    this.targetMode = null;
    this.attachMode = false;
    this.pendingEventChoice = null;
    this.addLog("--- Turno " + this.turnNumber + ": " + nextE.name + " (Mana " + nextE.mana + "/" + nextE.manaMax + ") ---", true);
  }

  /** Continua endTurn dopo eventuale scelta evento umana */
  resolvePendingEventChoice(type) {
    if (!this.pendingEventChoice) return false;
    const current = this.getEntityById(this.pendingEventChoice.entityId) || this.currentEntity;
    const opt = this.pendingEventChoice.options.find(o => o.type === type);
    this.pendingEventChoice = null;
    if (opt) this._drawAndResolveEvent(current, opt);
    this._finishEndTurn(current);
    return true;
  }

  _collectEventOptions(entity) {
    const seen = new Map(); // type -> {type, key, label, unit}
    for (const u of entity.field) {
      const key = u.q + "," + u.r;
      const t = CELL_TYPE.get(key);
      if (!t || t === "teletrasporto") continue;
      if (typeof EVENT_TILE_TYPES !== "undefined" && !EVENT_TILE_TYPES.includes(t)) continue;
      if (seen.has(t)) continue;
      const def = (typeof TILE_TYPE_DEFS !== "undefined" && TILE_TYPE_DEFS[t]) ? TILE_TYPE_DEFS[t] : { name: t, icon: "?" };
      seen.set(t, { type: t, key, label: (def.icon || "") + " " + (def.name || t), unit: u });
    }
    return Array.from(seen.values());
  }

  _drawAndResolveEvent(entity, option) {
    const type = option.type;
    const deck = (typeof EVENT_DECKS !== "undefined" && EVENT_DECKS[type]) ? EVENT_DECKS[type] : [];
    if (!deck.length) {
      this.addLog("Nessun evento nel mazzo " + type);
      return;
    }
    // Pesca uniforme = mazzo sempre "rimischiato"
    const ev = deck[Math.floor(Math.random() * deck.length)];
    const unit = option.unit || entity.field.find(u => (u.q + "," + u.r) === option.key) || entity.field[0];
    this.addLog("📜 [" + type + "] " + ev.name + " — " + (ev.text || ""), true);
    this._resolveTileEvent(ev, unit, entity);
  }

  /**
   * Sposta le unità sui teletrasporti e prepara i passi obbligatori.
   * @returns {boolean} true se resta in attesa di input umano per un passo
   */
  _resolveTeleportsForEntity(entity) {
    const tpKeys = [];
    for (const [key, type] of CELL_TYPE) {
      if (type === "teletrasporto") tpKeys.push(key);
    }
    if (tpKeys.length < 2) return false;

    const steps = [];
    const units = entity.field.slice();
    for (const u of units) {
      const key = u.q + "," + u.r;
      if (CELL_TYPE.get(key) !== "teletrasporto") continue;

      const others = tpKeys.filter(k => k !== key);
      const destKey = others[Math.floor(Math.random() * others.length)];
      const [dq, dr] = destKey.split(",").map(Number);
      this.flippedCells.add(destKey);

      let tq = dq, tr = dr;
      const occupant = this.getUnitAt(dq, dr);
      if (occupant && occupant.instanceId !== u.instanceId) {
        const adj = this._hexesInRange(dq, dr, 1);
        const free = adj.find(([aq, ar]) => !this.getUnitAt(aq, ar) && CELL_TYPE.get(aq + "," + ar) !== "mountain");
        if (free) { tq = free[0]; tr = free[1]; }
        else {
          this.addLog(u.name + " non trova uscita dal teletrasporto!");
          continue;
        }
      }
      u.q = tq; u.r = tr;
      this.addLog("🌀 " + u.name + " teletrasportato su (" + tq + "," + tr + ")", true);
      this._revealAround(entity, tq, tr, 2);

      // Se è ancora su un TP (caso normale), serve passo obbligatorio
      if (CELL_TYPE.get(tq + "," + tr) === "teletrasporto") {
        const legal = this._legalTeleportExitSteps(tq, tr);
        if (!legal.length) {
          this.addLog(u.name + ": nessuna casella libera per uscire dal teletrasporto!");
          continue;
        }
        steps.push({
          unitInstanceId: u.instanceId,
          entityId: entity.id,
          q: tq,
          r: tr,
          legal
        });
      }
    }

    if (!steps.length) return false;

    // IA: esegue tutti i passi in automatico
    if (!entity.isHuman) {
      for (const step of steps) {
        const [sq, sr] = step.legal[Math.floor(Math.random() * step.legal.length)];
        this._applyTeleportStep(step, sq, sr);
      }
      return false;
    }

    // Umano: coda + primo passo in attesa
    this.pendingTeleportSteps = steps.slice(1);
    this.pendingTeleportStep = steps[0];
    this.addLog("Devi compiere un passo obbligatorio (gratuito) fuori dal teletrasporto con " +
      (entity.field.find(x => x.instanceId === steps[0].unitInstanceId) || {}).name +
      ". Clicca una casella evidenziata.", true);
    if (typeof window !== "undefined" && window.onTeleportStepPrompt) {
      window.onTeleportStepPrompt(this.pendingTeleportStep);
    }
    return true;
  }

  _legalTeleportExitSteps(q, r) {
    const stepAdj = this._hexesInRange(q, r, 1);
    return stepAdj.filter(([aq, ar]) => {
      if (this.getUnitAt(aq, ar)) return false;
      const ct = CELL_TYPE.get(aq + "," + ar);
      if (!ct || ct === "mountain" || ct === "teletrasporto") return false;
      return true;
    });
  }

  _applyTeleportStep(step, sq, sr) {
    const ent = this.getEntityById(step.entityId);
    if (!ent) return false;
    const unit = ent.field.find(u => u.instanceId === step.unitInstanceId);
    if (!unit) return false;
    const ok = step.legal.some(([lq, lr]) => lq === sq && lr === sr);
    if (!ok) return false;
    unit.q = sq; unit.r = sr;
    this.flippedCells.add(sq + "," + sr);
    this.addLog(unit.name + " esce dal teletrasporto su (" + sq + "," + sr + ")", true);
    this._revealAround(ent, sq, sr, 2);
    return true;
  }

  /** Click umano su casella di uscita dal TP */
  completeTeleportStep(q, r) {
    if (!this.pendingTeleportStep) return false;
    const step = this.pendingTeleportStep;
    if (!this._applyTeleportStep(step, q, r)) {
      this.addLog("Casella non valida per l'uscita dal teletrasporto.");
      return false;
    }
    // Prossimo in coda
    if (this.pendingTeleportSteps.length) {
      this.pendingTeleportStep = this.pendingTeleportSteps.shift();
      const ent = this.getEntityById(this.pendingTeleportStep.entityId);
      const unit = ent && ent.field.find(u => u.instanceId === this.pendingTeleportStep.unitInstanceId);
      this.addLog("Altro passo obbligatorio: " + ((unit && unit.name) || "creatura") + ". Clicca una casella evidenziata.", true);
      if (typeof window !== "undefined" && window.onTeleportStepPrompt) {
        window.onTeleportStepPrompt(this.pendingTeleportStep);
      }
      return true;
    }
    // Fine passi TP → eventi / chiusura turno
    if (typeof window !== "undefined" && window.onTeleportStepDone) {
      window.onTeleportStepDone();
    }
    this._continueAfterTeleportSteps();
    return true;
  }

  _resolveTileEvent(ev, unit, owner) {
    if (!ev || !ev.effectId) return;
    const id = ev.effectId;
    const self = unit;
    switch (id) {
      case "ev_shield_1":
        if (self) { self.shields = (self.shields || 0) + 1; this.addLog(self.name + " +1 scudo"); }
        break;
      case "ev_shield_2":
        if (self) { self.shields = (self.shields || 0) + 2; this.addLog(self.name + " +2 scudi"); }
        break;
      case "ev_heal_self_1":
        if (self) { self.currentHp = (self.currentHp || 0) + 1; this.addLog(self.name + " +1 PV"); }
        break;
      case "ev_heal_self_2":
        if (self) { self.currentHp = (self.currentHp || 0) + 2; this.addLog(self.name + " +2 PV"); }
        break;
      case "ev_heal_self_3":
        if (self) { self.currentHp = (self.currentHp || 0) + 3; this.addLog(self.name + " +3 PV"); }
        break;
      case "ev_heal_all_1":
        owner.field.forEach(u => { u.currentHp = (u.currentHp || 0) + 1; });
        this.addLog("Tutti gli alleati +1 PV");
        break;
      case "ev_heal_all_2_if_lost":
        // Semplicificato: cura sempre 2 (il "se hai perso" richiederebbe tracking)
        owner.field.forEach(u => { u.currentHp = (u.currentHp || 0) + 2; });
        this.addLog("Tenebre fertili: alleati +2 PV");
        break;
      case "ev_dmg_self_1":
        this._applyEventDamage(self, owner, 1);
        break;
      case "ev_dmg_self_2":
        this._applyEventDamage(self, owner, 2);
        break;
      case "ev_atk_perm_1":
        if (self) { self.permanentAtkBonus = (self.permanentAtkBonus || 0) + 1; this.addLog(self.name + " +1 ATK permanente"); }
        break;
      case "ev_atk_perm_1_hp_1":
        if (self) {
          self.permanentAtkBonus = (self.permanentAtkBonus || 0) + 1;
          self.currentHp = (self.currentHp || 0) + 1;
          this.addLog(self.name + " +1/+1");
        }
        break;
      case "ev_hp_perm_1":
        if (self) { self.currentHp = (self.currentHp || 0) + 1; this.addLog(self.name + " +1 PV"); }
        break;
      case "ev_wither_self":
        if (self) { self.isWithered = true; this.addLog(self.name + " diventa avvizzita"); }
        break;
      case "ev_wither_clear":
        if (self) { self.isWithered = false; this.addLog(self.name + " non è più avvizzita"); }
        break;
      case "ev_draw_1":
      case "ev_pay1_draw1":
      case "ev_pay2_draw2":
      case "ev_draw1_discard1":
      case "ev_choose_color_card":
        this._offerColorCardChoice(owner);
        break;
      case "ev_token_1_1":
        this._spawnEventToken(owner);
        break;
      case "ev_foe_discard_1": {
        const foes = this.activePlayers.filter(e => e.id !== owner.id && e.hand.length);
        if (foes.length) {
          const foe = foes[Math.floor(Math.random() * foes.length)];
          const idx = Math.floor(Math.random() * foe.hand.length);
          const c = foe.hand.splice(idx, 1)[0];
          foe.graveyard.push(c);
          this.addLog(foe.name + " scarta " + c.name);
        }
        break;
      }
      case "ev_dmg_enemy_vis_1":
        this._damageVisibleTarget(owner, 1);
        break;
      case "ev_dmg_enemy_adj_1":
        if (self) {
          const adj = this._hexesInRange(self.q, self.r, 1);
          for (const [aq, ar] of adj) {
            const au = this.getUnitAt(aq, ar);
            if (au && au.ownerId !== owner.id) {
              this._applyDamage(au, 1);
              this.addLog("Agguato: 1 danno a " + au.name);
              break;
            }
          }
        }
        break;
      case "ev_wither_enemy_vis": {
        for (const ent of this.entities) {
          if (ent.id === owner.id || ent.isFallen) continue;
          for (const u of ent.field) {
            if (this.isVisibleTo(owner, u.q, u.r)) {
              u.isWithered = true;
              this.addLog(u.name + " diventa avvizzita (sguardo di pietra)");
              return;
            }
          }
        }
        break;
      }
      case "ev_coin_heal2_or_dmg2":
        if (Math.random() < 0.5) {
          if (self) { self.currentHp = (self.currentHp || 0) + 2; this.addLog("Rito: +2 PV"); }
        } else {
          this._applyEventDamage(self, owner, 2);
          this.addLog("Rito instabile: 2 danni");
        }
        break;
      case "ev_next_attack_plus_2":
        if (self) { self.permanentAtkBonus = (self.permanentAtkBonus || 0) + 2; this.addLog(self.name + " +2 ATK (folla)"); }
        break;
      case "ev_dmg1_atk_perm_2":
        this._applyEventDamage(self, owner, 1);
        if (self && (self.currentHp || 0) > 0) {
          self.permanentAtkBonus = (self.permanentAtkBonus || 0) + 2;
          this.addLog(self.name + " +2 ATK permanente");
        }
        break;
      case "ev_shield_1_atk_1":
        if (self) {
          self.shields = (self.shields || 0) + 1;
          self.permanentAtkBonus = (self.permanentAtkBonus || 0) + 1;
          this.addLog(self.name + " +1 scudo +1 ATK");
        }
        break;
      case "ev_dmg_self_1_atk_1":
        this._applyEventDamage(self, owner, 1);
        if (self) { self.permanentAtkBonus = (self.permanentAtkBonus || 0) + 1; }
        break;
      case "ev_heal1_wither":
        if (self) { self.currentHp = (self.currentHp || 0) + 1; self.isWithered = true; this.addLog(self.name + " +1 PV e avvizzita"); }
        break;
      case "ev_shield_mostrissimo": {
        const ms = owner.field.find(u => u.type === "mostrissimo");
        if (ms) { ms.shields = (ms.shields || 0) + 1; this.addLog(ms.name + " +1 scudo"); }
        else this.addLog("Nessun Mostrissimo da proteggere");
        break;
      }
      case "ev_clear_fog_self":
        owner.clearFogUntil = this.turnNumber + 1;
        this.addLog(owner.name + ": nebbia squarciata fino al prossimo turno");
        break;
      case "ev_next_summon_discount":
      case "ev_discount_hand_1":
        owner.mana = (owner.mana || 0) + 1;
        this.addLog(owner.name + " guadagna 1 mana (ex-sconto)");
        break;
      case "ev_sac_buff_2":
      case "ev_sac_draw_2":
        this._offerColorCardChoice(owner);
        break;
      case "ev_discard1_heal_all_2":
      case "ev_dmg_self_1_draw_1":
      case "ev_dmg_self_1_or_shield":
      case "ev_temp_buff_1_1":
      case "ev_shield_1_draw_1":
        // Effetti compositi semplificati
        if (id === "ev_temp_buff_1_1" && self) {
          self.shields = (self.shields || 0) + 1;
          self.permanentAtkBonus = (self.permanentAtkBonus || 0) + 1;
          this.addLog(self.name + " sovraccarico +1/+1 scudo");
        } else if (id === "ev_shield_1_draw_1" && self) {
          self.shields = (self.shields || 0) + 1;
          this.addLog(self.name + " +1 scudo");
        } else if (id === "ev_dmg_self_1_draw_1") {
          this._applyEventDamage(self, owner, 1);
        } else if (id === "ev_dmg_self_1_or_shield") {
          if (Math.random() < 0.5) this._applyEventDamage(self, owner, 1);
          else if (self) { self.shields = (self.shields || 0) + 1; this.addLog(self.name + " +1 scudo"); }
        } else if (id === "ev_discard1_heal_all_2") {
          if (owner.hand.length) {
            const idx = Math.floor(Math.random() * owner.hand.length);
            const c = owner.hand.splice(idx, 1)[0];
            owner.graveyard.push(c);
            this.addLog("Offerta: scarta " + c.name);
          }
          owner.field.forEach(u => { u.currentHp = (u.currentHp || 0) + 2; });
          this.addLog("Alleati +2 PV");
        } else {
          this.addLog("Evento " + id + " (effetto parziale)");
        }
        break;
      default:
        this.addLog("Evento non gestito: " + id);
    }
    if (ev.name && owner.passives) {
      owner.passives.push(ev.name);
      if (owner.passives.length > 8) owner.passives.shift();
    }
  }

  _applyTerrainEvent(ev, unit, owner) {
    const a = ev.apply || "";
    if (a.includes("atk2")) unit.permanentAtkBonus = (unit.permanentAtkBonus || 0) + 2;
    else if (a.includes("atk1")) unit.permanentAtkBonus = (unit.permanentAtkBonus || 0) + 1;
    else if (a.includes("atk-1")) unit.permanentAtkBonus = (unit.permanentAtkBonus || 0) - 1;
    if (a.includes("hp3")) unit.currentHp = (unit.currentHp || 0) + 3;
    else if (a.includes("hp2")) unit.currentHp = (unit.currentHp || 0) + 2;
    if (a.includes("shield1")) unit.shields = (unit.shields || 0) + 1;
    // Danni da evento: l'Artefatto protegge il portatore dalla morte
    if (a.includes("dmg2")) this._applyEventDamage(unit, owner, 2);
    else if (a.includes("dmg1")) this._applyEventDamage(unit, owner, 1);
    if (ev.passive && owner) {
      owner.passives.push(ev.name + ": " + ev.passive);
      if (owner.passives.length > 8) owner.passives.shift();
    }
  }

  /** Danno da evento di zona: non può uccidere il portatore dell'Artefatto */
  _applyEventDamage(unit, owner, amount) {
    if (!unit) return;
    let dmg = amount;
    if (unit.shields > 0) {
      const abs = Math.min(unit.shields, dmg);
      unit.shields -= abs;
      dmg -= abs;
    }
    if (dmg <= 0) return;

    const holdsArtifact = owner && owner.artifactAttachedTo === unit.instanceId;
    const wouldDie = (unit.currentHp || 1) - dmg <= 0;

    if (holdsArtifact && wouldDie) {
      // L'Artefatto assorbe il colpo mortale: la creatura resta a 1 PV
      unit.currentHp = 1;
      this.addLog("✨ L'Artefatto protegge " + unit.name + " dal destino: il colpo viene assorbito (resta a 1 PV).", true);
      return;
    }

    unit.currentHp = (unit.currentHp || 1) - dmg;
    this.addLog(unit.name + " subisce " + dmg + " danni → " + unit.currentHp + " PV");
    if (unit.currentHp <= 0) this._destroyUnit(unit);
  }

  _checkWin() {
    const living = this.entities.filter(e => !e.isFallen);
    if (living.length <= 1) {
      this.winner = living[0] || null;
      if (this.winner && this.winner.isFallen) this.winner = null;
      this.phase = "ended";
      if (this.winner) this.addLog("🏆 " + this.winner.name + " vince la partita!", true);
      else this.addLog("Partita terminata - nessun vincitore.", true);
      if (typeof window !== "undefined" && window.onGameEnd) window.onGameEnd(this);
    }
  }


  getUnitByInstanceId(id) {
    for (const ent of this.entities) {
      const u = ent.field.find(x => x.instanceId === id);
      if (u) return u;
    }
    return null;
  }

  _runFallenTurn(ai) {
    this.addLog(ai.name + " (caduto) agisce...");
    for (const unit of [...ai.field]) {
      let target = null;
      if (unit.chaseTargetId) {
        target = this.getUnitByInstanceId(unit.chaseTargetId);
        if (!target) unit.chaseTargetId = null;
      }
      if (!target) {
        for (const ent of this.entities) {
          if (ent.id === ai.id) continue;
          for (const u of ent.field) {
            if (hexDistance(unit.q, unit.r, u.q, u.r) <= 2) {
              target = u;
              unit.chaseTargetId = u.instanceId;
              break;
            }
          }
          if (target) break;
        }
      }
      if (target) {
        const nbs = this._hexesInRange(unit.q, unit.r, 1);
        let best = null, bestD = 999;
        for (const [q, r] of nbs) {
          if (CELL_TYPE.get(q + "," + r) === "mountain") continue;
          const occ = this.getUnitAt(q, r);
          if (occ && occ.instanceId !== target.instanceId) continue;
          const d = hexDistance(q, r, target.q, target.r);
          if (d < bestD) { bestD = d; best = [q, r]; }
        }
        if (best) {
          const occ = this.getUnitAt(best[0], best[1]);
          if (occ && occ.ownerId !== ai.id) {
            this._resolveCombat(unit, occ, unit.q, unit.r);
          } else if (!occ) {
            unit.q = best[0];
            unit.r = best[1];
            this.addLog(unit.name + " (caduto) insegue verso (" + best[0] + "," + best[1] + ")");
          }
        }
      } else {
        const nbs = this._hexesInRange(unit.q, unit.r, 1).filter(([q, r]) => {
          return CELL_TYPE.get(q + "," + r) !== "mountain" && !this.getUnitAt(q, r);
        });
        if (nbs.length) {
          const [q, r] = nbs[Math.floor(Math.random() * nbs.length)];
          unit.q = q;
          unit.r = r;
          this.addLog(unit.name + " (caduto) vaga su (" + q + "," + r + ")");
        }
      }
    }
  }

  runAITurn() {
    const ai = this.currentEntity;
    if (ai.isHuman || this.phase !== "playing") return;
    // CADUTO: solo movimento creature (chase o random)
    if (ai.isFallen) {
      this._runFallenTurn(ai);
      if (this._aiEndTurnTimeout) clearTimeout(this._aiEndTurnTimeout);
      this._aiEndTurnTimeout = setTimeout(async () => {
        this._aiEndTurnTimeout = null;
        if (typeof window !== "undefined" && window.waitForPopups) {
          await window.waitForPopups();
        }
        if (this.currentEntity && this.currentEntity.isHuman) {
          this.addLog("(timeout IA caduta ignorato: è il turno dell'umano)");
          if (typeof window !== "undefined" && window.onGameUpdate) window.onGameUpdate();
          return;
        }
        this.endTurn();
        if (typeof window !== "undefined" && window.onGameUpdate) window.onGameUpdate();
        if (this.phase === "ended" && window.onGameEnd) window.onGameEnd(this);
        else if (!this.currentEntity.isHuman && this.phase === "playing") {
          setTimeout(() => this.runAITurn(), 400);
        }
      }, 500);
      return;
    }
    this.addLog(ai.name + " sta pensando...");
    if (!ai.hasArtifactOnField()) {
      const artCard = ai.hand.find(c => c.id === "artifact" || c.type === "artefatto");
      if (artCard && ai.canPay(artCard.currentCost || 0)) {
        // Preferisci una creatura già in campo
        const creatures = ai.field.filter(u => u.type === "mostro" || u.type === "mostrissimo");
        if (creatures.length) {
          this.selectedCard = artCard;
          this.attachMode = true;
          this.attachArtifactToUnit(creatures[0].instanceId);
        } else {
          // Evoca prima un mostro se possibile, altrimenti skip
          const mon = ai.hand.find(c => c.type === "mostro" && ai.canPay(c.cost || 0));
          if (mon) {
            const target = this._findPlacementHex(ai);
            if (target) {
              this.selectedCard = mon; this.playMode = true; this.playCardOnHex(target[0], target[1]);
              // Poi lega artefatto
              if (ai.field.length) {
                this.selectedCard = artCard; this.attachMode = true;
                this.attachArtifactToUnit(ai.field[0].instanceId);
              }
            }
          }
        }
      }
    }
    const playable = ai.hand.filter(c => c.type === "mostro" && ai.canPay(c.currentCost !== undefined ? c.currentCost : c.cost));
    if (playable.length > 0 && ai.field.length < 5) {
      playable.sort((a, b) => (b.cost || 0) - (a.cost || 0));
      const card = playable[0];
      const target = this._findPlacementHex(ai);
      if (target) { this.selectedCard = card; this.playMode = true; this.playCardOnHex(target[0], target[1]); }
    }
    const curses = ai.hand.filter(c => c.type === "maledizione" && ai.canPay(c.cost || 0));
    if (curses.length) {
      const curse = curses[0];
      for (const ent of this.entities) {
        if (ent.id === ai.id || ent.isFallen) continue;
        for (const u of ent.field) {
          if (this.isVisibleTo(ai, u.q, u.r)) {
            this.selectedCard = curse;
            this.targetMode = { card: curse, effectId: curse.effectId, remaining: 1, targets: [] };
            this.selectTargetUnit(u);
            break;
          }
        }
        if (!this.selectedCard) break;
      }
    }
    for (const unit of [...ai.field]) {
      if (unit.isWithered) continue;
      const cost = unit.movedThisTurn ? 1 : 0;
      if (!ai.canPay(cost)) continue;
      const neighbors = this._hexesInRange(unit.q, unit.r, 1);
      for (const [q, r] of neighbors) {
        const enemy = this.getUnitAt(q, r);
        if (enemy && enemy.ownerId !== ai.id) {
          const atkP = (unit.atk || 0) + (unit.permanentAtkBonus || 0);
          if (atkP >= (enemy.currentHp || 1) || atkP >= ((enemy.atk || 0) + 1)) {
            this.selectedUnit = unit; this.moveMode = true; this.tryMoveOrAttack(q, r); break;
          }
        }
      }
    }
    for (const unit of [...ai.field]) {
      if (unit.isWithered) continue;
      const cost = unit.movedThisTurn ? 1 : 0;
      if (!ai.canPay(cost)) continue;
      const neighbors = this._hexesInRange(unit.q, unit.r, 1);
      let best = null, bestScore = 999;
      const human = this.entities.find(e => e.isHuman);
      if (human && human.field.length) {
        for (const [q, r] of neighbors) {
          if (CELL_TYPE.get(q + "," + r) === "mountain" || this.getUnitAt(q, r)) continue;
          const d = hexDistance(q, r, human.field[0].q, human.field[0].r);
          if (d < bestScore) { bestScore = d; best = [q, r]; }
        }
      }
      if (best) { this.selectedUnit = unit; this.moveMode = true; this.tryMoveOrAttack(best[0], best[1]); break; }
    }
    // Salva il timeout così possiamo annullarlo se il turno diventa umano
    if (this._aiEndTurnTimeout) clearTimeout(this._aiEndTurnTimeout);
    this._aiEndTurnTimeout = setTimeout(async () => {
      this._aiEndTurnTimeout = null;
      // Aspetta che l'utente abbia chiuso tutti i popup
      if (typeof window !== "undefined" && window.waitForPopups) {
        await window.waitForPopups();
      }
      // Sicurezza: non chiudere mai il turno di un umano da qui
      if (this.currentEntity && this.currentEntity.isHuman) {
        this.addLog("(timeout IA ignorato: è il turno dell'umano)");
        if (typeof window !== "undefined" && window.onGameUpdate) window.onGameUpdate();
        return;
      }
      this.endTurn();
      if (typeof window !== "undefined" && window.onGameUpdate) window.onGameUpdate();
      if (this.phase === "ended" && window.onGameEnd) window.onGameEnd(this);
      else if (!this.currentEntity.isHuman && this.phase === "playing") {
        setTimeout(() => this.runAITurn(), 400);
      }
    }, 500);
  }

  _findPlacementHex(entity) {
    // Mostri solo sul tempio
    if (entity.templeKey) {
      const [tq, tr] = entity.templeKey.split(",").map(Number);
      if (CELL_TYPE.get(tq + "," + tr) !== "mountain" && !this.getUnitAt(tq, tr)) {
        return [tq, tr];
      }
    }
    return null;
  }

  _hexesInRange(cq, cr, range) {
    const res = [];
    for (let dq = -range; dq <= range; dq++) {
      for (let dr = -range; dr <= range; dr++) {
        const ds = -dq - dr;
        if (Math.abs(dq) + Math.abs(dr) + Math.abs(ds) <= range * 2 && (dq !== 0 || dr !== 0)) {
          const key = (cq + dq) + "," + (cr + dr);
          if (CELL_TYPE.has(key)) res.push([cq + dq, cr + dr]);
        }
      }
    }
    return res;
  }

  // =====================================================
  // MOSTRISSIMI – flusso sacrificio interattivo (v023)
  // =====================================================

  /** Avvia la procedura di evocazione di un Mostrissimo dal pool */
  startMostrissimoSacrifice(ms) {
    const e = this.currentEntity;
    if (!e || !e.isHuman || this.phase !== "playing") return false;
    if ((this.mostrissimiSummonedThisTurn || 0) >= 1) {
      this.addLog("Puoi evocare al massimo 1 Mostrissimo per turno.");
      return false;
    }
    if (this.sacrificeMode || this.playMode || this.moveMode || this.attachMode) {
      this.addLog("Termina l'azione in corso prima di evocare un Mostrissimo.");
      return false;
    }

    const sac = ms.sacrifice || 0;
    const permanents = e.field.filter(u => u.type === "mostro" || u.type === "mostrissimo");
    if (permanents.length < sac) {
      this.addLog("Non hai abbastanza creature da sacrificare (servono " + sac + ").");
      return false;
    }

    // Copia carta pronta per il piazzamento
    const card = { ...ms, instanceId: (ms.instanceId || ms.id) + "_sum_" + Date.now() };

    // Caso 0 sacrifici → vai diretto in modalità piazzamento
    if (sac === 0) {
      this.selectedCard = card;
      this.playMode = true;
      this.sacrificeMode = false;
      this.sacrificeCard = null;
      this.sacrificeCount = 0;
      this.sacrificeNeeded = 0;
      this.sacrificedPositions = new Set();
      this.addLog("Selezionato " + card.name + " (0 sacrifici). Clicca il tuo Tempio per evocarlo.");
      return true;
    }

    // Entra in modalità sacrificio
    this.sacrificeMode = true;
    this.sacrificeCard = card;
    this.sacrificeCount = 0;
    this.sacrificeNeeded = sac;
    this.sacrificedPositions = new Set();
    this.selectedCard = null;
    this.playMode = false;
    this.moveMode = false;
    this.attachMode = false;
    this.selectedUnit = null;
    this.addLog("Evocazione " + card.name + ": sacrifica esattamente " + sac + " creature. Clicca le tue unità.");
    return true;
  }

  /** Sacrifica una creatura durante la modalità sacrificio Mostrissimo */
  sacrificeUnitForMostrissimo(unit) {
    if (!this.sacrificeMode || !this.sacrificeCard) return false;
    const e = this.currentEntity;
    if (!e || !unit || unit.ownerId !== e.id) return false;
    if (unit.type !== "mostro" && unit.type !== "mostrissimo") {
      this.addLog("Puoi sacrificare solo mostri o mostrissimi.");
      return false;
    }
    if (this.sacrificeCount >= this.sacrificeNeeded) return false;

    const key = unit.q + "," + unit.r;
    const cellType = CELL_TYPE.get(key);

    // Distruggi la creatura (effetti on-death/uscita se implementati passano da _destroyUnit)
    this._destroyUnit(unit);
    this.addLog("Sacrificato: " + unit.name + " su (" + unit.q + "," + unit.r + ")");

    // Se stava su Altare o Circolo, sblocca quella cella
    if (cellType === "city" || cellType === "circolo") {
      this.sacrificedPositions.add(key);
      this.addLog("Cella speciale sbloccata: " + (cellType === "city" ? "Altare" : "Circolo Rituale") + " (" + key + ")");
    }

    this.sacrificeCount++;

    if (this.sacrificeCount >= this.sacrificeNeeded) {
      // Passa in modalità piazzamento
      this.selectedCard = this.sacrificeCard;
      this.playMode = true;
      this.sacrificeMode = false;
      this.addLog("Sacrifici completati (" + this.sacrificeNeeded + "). Scegli dove evocare " + this.sacrificeCard.name + ".");
    }
    return true;
  }

  /** Annulla completamente la procedura di evocazione Mostrissimo */
  cancelSacrificeMode() {
    if (!this.sacrificeMode && !(this.playMode && this.selectedCard && this.selectedCard.type === "mostrissimo")) {
      return false;
    }
    this.sacrificeMode = false;
    this.sacrificeCard = null;
    this.sacrificeCount = 0;
    this.sacrificeNeeded = 0;
    this.sacrificedPositions = new Set();
    this.selectedCard = null;
    this.playMode = false;
    this.addLog("Evocazione Mostrissimo annullata.");
    return true;
  }

  /** Restituisce le caselle legali per il Mostrissimo attualmente selezionato */
  getMostrissimoLegalCells() {
    const e = this.currentEntity;
    if (!e || !this.selectedCard || this.selectedCard.type !== "mostrissimo") return [];
    const legal = [];

    // 1) Sempre il proprio Tempio (se libero)
    if (e.templeKey) {
      const [tq, tr] = e.templeKey.split(",").map(Number);
      if (!this.getUnitAt(tq, tr)) legal.push([tq, tr]);
    }

    // 2) Celle speciali sbloccate dai sacrifici (se ancora libere)
    if (this.sacrificedPositions) {
      for (const key of this.sacrificedPositions) {
        const [q, r] = key.split(",").map(Number);
        if (!this.getUnitAt(q, r)) legal.push([q, r]);
      }
    }
    return legal;
  }

  summonMostrissimo(poolIndex, q, r) {
    // Mantenuto per compatibilità; il flusso principale passa da startMostrissimoSacrifice
    if (poolIndex < 0 || poolIndex >= this.mostrissimiPool.length) return false;
    const ms = this.mostrissimiPool[poolIndex];
    return this.startMostrissimoSacrifice(ms);
  }
}

function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}
