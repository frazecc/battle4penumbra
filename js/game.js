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
    this._aiTurnLock = false;
    this.pendingEventChoice = null; // { options: [{type,key,label}], entityId }
    this.pendingEventDetail = null; // { event, unitInstanceId, entityId } scelta effetto
    this.pendingTeleportSteps = []; // coda passi obbligatori post-TP
    this.pendingTeleportStep = null; // { unitInstanceId, entityId, q, r, legal: [[q,r],...] }
    this.specialZones = {};
    this._endTurnEntityId = null; // entità che sta chiudendo il turno (async TP/eventi)
    this.pendingTempleOverwrite = null; // { card, q, r, victimInstanceId }
    this.pendingEnemyTempleMove = null; // { unitInstanceId, q, r }
    this.pendingCardPick = null; // { options: [card,card], entityId }
    this.pendingMovePath = null; // { unitInstanceId, path: [[q,r],...], cost }
    this.pendingSpellTarget = null; // { card, targets: [], remaining, need }


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
      // v028: serve abbastanza permanenti da sacrificare (0 ok) e almeno un Altare/Circolo esistente
      const sac = card.sacrifice || 0;
      const permanents = entity.field.filter(u => u.type === "mostro" || u.type === "mostrissimo");
      if (permanents.length < sac) return false;
      for (const [key, type] of CELL_TYPE) {
        if (type === "city" || type === "circolo") return true;
      }
      return false;
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
      // MOSTRISSIMO (v028): solo Altare o Circolo su cui hai sacrificato (mai Tempio)
      if (card.type === "mostrissimo") {
        const key = q + "," + r;
        const cellType = CELL_TYPE.get(key);
        const isUnlockedSpecial = this.sacrificedPositions && this.sacrificedPositions.has(key);
        if (!(isUnlockedSpecial && (cellType === "city" || cellType === "circolo"))) {
          this.addLog("I Mostrissimi si evocano solo su Altare o Circolo Rituale (dopo aver sacrificato lì). Non più sui Templi.");
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
    if (!this.targetMode || !unit) return false;
    const e = this.currentEntity;
    const { card, effectId } = this.targetMode;
    const need = card.multiTarget || 1;
    // Evita duplicati
    if (this.targetMode.targets.some(t => t.instanceId === unit.instanceId)) {
      this.addLog("Bersaglio già selezionato.");
      return false;
    }
    this.targetMode.targets.push(unit);
    this.targetMode.remaining = need - this.targetMode.targets.length;
    this.addLog("Bersaglio: " + unit.name + " (" + this.targetMode.targets.length + "/" + need + ")");
    // Umano: conferma esplicita; IA: auto-conferma quando completo
    if (e.isHuman) {
      this.pendingSpellTarget = {
        card, effectId,
        targets: this.targetMode.targets.slice(),
        need,
        selected: this.targetMode.targets.length
      };
      if (typeof window !== "undefined" && window.onSpellTargetPrompt) {
        window.onSpellTargetPrompt(this.pendingSpellTarget);
      }
      return true;
    }
    if (this.targetMode.remaining <= 0) {
      return this.confirmSpellCast(true);
    }
    return true;
  }

  confirmSpellCast(yes) {
    if (!this.targetMode && !this.pendingSpellTarget) return false;
    const e = this.currentEntity;
    const tm = this.targetMode;
    const card = (tm && tm.card) || (this.pendingSpellTarget && this.pendingSpellTarget.card);
    const effectId = (tm && tm.effectId) || (this.pendingSpellTarget && this.pendingSpellTarget.effectId);
    const targets = (tm && tm.targets) || (this.pendingSpellTarget && this.pendingSpellTarget.targets) || [];
    const need = (card && (card.multiTarget || 1)) || 1;
    this.pendingSpellTarget = null;
    if (!yes) {
      // Rimuovi ultimo bersaglio o annulla tutto
      if (tm && tm.targets.length) {
        tm.targets.pop();
        tm.remaining = need - tm.targets.length;
        this.addLog("Bersaglio rimosso. " + tm.targets.length + "/" + need);
        if (tm.targets.length && e.isHuman && typeof window !== "undefined" && window.onSpellTargetPrompt) {
          this.pendingSpellTarget = { card, effectId, targets: tm.targets.slice(), need, selected: tm.targets.length };
          window.onSpellTargetPrompt(this.pendingSpellTarget);
        }
      } else {
        this.targetMode = null;
        this.selectedCard = null;
        this.addLog("Lancio annullato.");
      }
      return false;
    }
    if (targets.length < 1) {
      this.addLog("Seleziona almeno un bersaglio.");
      return false;
    }
    if (targets.length > need) {
      this.addLog("Troppi bersagli.");
      return false;
    }
    const cost = card.currentCost !== undefined ? card.currentCost : card.cost;
    if (!e.canPay(cost)) { this.addLog("Mana insufficiente!"); this.targetMode = null; return false; }
    e.pay(cost);
    e.hand = e.hand.filter(c => c.instanceId !== card.instanceId);
    e.graveyard.push(card);
    targets.forEach(t => this._resolveEffect(effectId, e, t));
    this.addLog(e.name + " lancia " + card.name + "!", true);
    this.targetMode = null;
    this.selectedCard = null;
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


  _commitMove(unit, e, q, r, cost) {
    e.pay(cost || 0);
    unit.q = Number(q);
    unit.r = Number(r);
    unit.movedThisTurn = true;
    this._revealAround(e, unit.q, unit.r, 2);
    if (!this.isCellDiscovered(unit.q, unit.r, e)) {
      unit.isWithered = true;
      this.addLog(unit.name + " entra in territorio inesplorato e diventa avvizzita.");
    } else {
      this.addLog(unit.name + " si muove su (" + unit.q + "," + unit.r + ")" + ((cost || 0) === 0 ? " (primo passo gratuito)" : ""));
    }
    this.selectedUnit = null;
    this.moveMode = false;
    this.pendingEnemyTempleMove = null;
    return true;
  }

  confirmEnemyTempleEntry(yes) {
    const p = this.pendingEnemyTempleMove;
    if (!p) return false;
    const e = this.currentEntity;
    const unit = e && e.field.find(u => u.instanceId === p.unitInstanceId);
    this.pendingEnemyTempleMove = null;
    if (!yes || !unit) {
      this.addLog("Movimento annullato.");
      return false;
    }
    if (p.path && p.path.length) {
      this.pendingMovePath = { unitInstanceId: unit.instanceId, path: p.path, cost: p.cost || 0 };
      return this.confirmMovePath(true);
    }
    return this._commitMove(unit, e, p.q, p.r, p.cost || 0);
  }

  confirmTempleOverwrite(yes) {
    const p = this.pendingTempleOverwrite;
    this.pendingTempleOverwrite = null;
    if (!yes || !p) {
      this.addLog("Evocazione annullata.");
      this.selectedCard = null;
      this.playMode = false;
      return false;
    }
    const victim = this.getUnitAt(p.q, p.r);
    if (victim && victim.instanceId === p.victimInstanceId) {
      this._destroyUnit(victim, {});
      this.addLog("Tempio liberato: " + p.victimName + " distrutto/a.");
    }
    this.selectedCard = p.card;
    this.playMode = true;
    return this.playCardOnHex(p.q, p.r);
  }


  /** Nome leggibile di una cella (Desolazione al posto di plain) */
  tileDisplayName(type) {
    if (!type || type === "plain") return "Desolazione";
    const def = (typeof TILE_TYPE_DEFS !== "undefined" && TILE_TYPE_DEFS[type]) ? TILE_TYPE_DEFS[type] : null;
    if (def && def.name) return def.name;
    const map = {
      mountain: "Montagna", temple: "Tempio", city: "Altare",
      desolazione: "Desolazione"
    };
    return map[type] || type;
  }

  isEventTileType(type) {
    if (!type || type === "plain" || type === "desolazione" || type === "mountain" || type === "temple") return false;
    if (type === "city") return false; // altare: strutturale
    if (typeof EVENT_TILE_TYPES !== "undefined" && EVENT_TILE_TYPES.includes(type)) return true;
    return type === "teletrasporto";
  }

  /**
   * Celle raggiungibili entro maxSteps (mana + eventuale passo gratis).
   * Prima cella non scoperta termina il path (avvizzisce).
   * Non attraversa montagne né celle occupate (nemico = destinazione di attacco solo se adiacente in tryMove).
   */
  getReachableCells(unit, entity) {
    if (!unit || !entity) return { cells: new Map(), attackTargets: [] };
    const freeFirst = !unit.movedThisTurn;
    const maxSteps = freeFirst ? (entity.mana + 1) : entity.mana;
    // Caduti: senza mana → 1 solo passo
    const stepLimit = entity.isFallen ? 1 : maxSteps;
    if (stepLimit <= 0) return { cells: new Map(), attackTargets: [] };

    const dirs = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
    const best = new Map();
    const queue = [{ q: unit.q, r: unit.r, steps: 0, manaCost: 0, path: [] }];
    const attackTargets = [];

    while (queue.length) {
      const cur = queue.shift();
      if (cur.steps >= stepLimit) continue;
      for (const [dq, dr] of dirs) {
        const nq = cur.q + dq, nr = cur.r + dr;
        const key = nq + "," + nr;
        if (!CELL_TYPE.has(key)) continue;
        const ct = CELL_TYPE.get(key);
        if (ct === "mountain") continue;

        const nextSteps = cur.steps + 1;
        const stepMana = (cur.steps === 0 && freeFirst && !entity.isFallen) ? 0 : 1;
        const nextMana = entity.isFallen ? 0 : (cur.manaCost + stepMana);
        if (!entity.isFallen && nextMana > entity.mana) continue;

        const occ = this.getUnitAt(nq, nr);
        if (occ) {
          if (occ.ownerId !== entity.id && cur.steps === 0) {
            attackTargets.push({ q: nq, r: nr, unit: occ });
          }
          continue;
        }

        const discovered = this.isCellDiscovered(nq, nr, entity);
        const visible = typeof this.isVisibleTo === "function" ? this.isVisibleTo(entity, nq, nr) : discovered;

        // Destinazione: può essere non scoperta (termina movimento) se adiacente al path su celle ok
        // Intermedia: solo scoperte E visibili (no attraversare fog)
        const nextPath = cur.path.concat([[nq, nr]]);
        const prev = best.get(key);
        if (prev && prev.cost <= nextMana && prev.steps <= nextSteps) continue;
        best.set(key, { cost: nextMana, path: nextPath, steps: nextSteps });

        // Non continuare oltre una cella non scoperta o non visibile
        if (!discovered || !visible) continue;
        queue.push({ q: nq, r: nr, steps: nextSteps, manaCost: nextMana, path: nextPath });
      }
    }
    best.delete(unit.q + "," + unit.r);
    return { cells: best, attackTargets };
  }

  /** Esegue il path confermato (sposta sulla destinazione, paga mana, avvizzisce se serve) */
  confirmMovePath(yes) {
    if (!yes) {
      this.pendingMovePath = null;
      this.addLog("Movimento annullato.");
      return false;
    }
    const p = this.pendingMovePath;
    if (!p) return false;
    const e = this.currentEntity;
    const unit = e.field.find(u => u.instanceId === p.unitInstanceId);
    this.pendingMovePath = null;
    if (!unit) return false;
    if ((p.cost || 0) > e.mana) {
      this.addLog("Mana insufficiente!");
      return false;
    }
    const dest = p.path[p.path.length - 1];
    if (!dest) return false;
    // Paga mana
    e.pay(p.cost || 0);
    const [dq, dr] = dest;
    unit.q = Number(dq);
    unit.r = Number(dr);
    unit.movedThisTurn = true;
    this._revealAround(e, unit.q, unit.r, 2);
    // Avvizzisce se destinazione o path ha attraversato inesplorato: destinazione non scoperta
    // Nota: isCellDiscovered prima del flip fine turno
    if (!this.isCellDiscovered(unit.q, unit.r, e)) {
      unit.isWithered = true;
      this.addLog(unit.name + " si muove su (" + unit.q + "," + unit.r + ") — territorio inesplorato: avvizzita. Costo mana: " + (p.cost || 0));
    } else {
      this.addLog(unit.name + " si muove su (" + unit.q + "," + unit.r + ") (path " + p.path.length + ", mana " + (p.cost || 0) + ")");
    }
    this.selectedUnit = null;
    this.moveMode = false;
    return true;
  }

  /** Imposta path in attesa di conferma */
  proposeMovePath(unit, path, cost) {
    this.pendingMovePath = {
      unitInstanceId: unit.instanceId,
      path: path.map(([q, r]) => [Number(q), Number(r)]),
      cost: cost || 0
    };
    if (typeof window !== "undefined" && window.onMovePathPrompt) {
      window.onMovePathPrompt(this.pendingMovePath, unit);
    }
    return true;
  }

  tryMoveOrAttack(q, r) {
    const e = this.currentEntity;
    if (!this.selectedUnit || !this.moveMode) return false;
    const unit = e.field.find(u => u.instanceId === this.selectedUnit.instanceId) || this.selectedUnit;
    this.selectedUnit = unit;
    q = Number(q); r = Number(r);
    unit.q = Number(unit.q); unit.r = Number(unit.r);

    if (unit.isWithered) {
      this.addLog(unit.name + " è avvizzita e non può agire questo turno.");
      this.moveMode = false;
      this.selectedUnit = null;
      return false;
    }
    if (!this.isCellDiscovered(unit.q, unit.r, e)) {
      this.addLog("Cella inesplorata: non puoi muoverti oltre in questo turno! (si scopre a fine turno)");
      this.moveMode = false;
      this.selectedUnit = null;
      return false;
    }

    const targetUnit = this.getUnitAt(q, r);
    // Attacco: solo adiacente
    if (targetUnit) {
      if (targetUnit.ownerId === e.id) { this.addLog("Cella alleata!"); return false; }
      const dist = hexDistance(unit.q, unit.r, q, r);
      if (dist !== 1) { this.addLog("Puoi attaccare solo una creatura adiacente!"); return false; }
      const cost = unit.movedThisTurn ? 1 : 0;
      if (!e.canPay(cost)) { this.addLog("Mana insufficiente!"); return false; }
      e.pay(cost);
      unit.movedThisTurn = true;
      unit.isWithered = true;
      const originQ = unit.q, originR = unit.r;
      this._resolveCombat(unit, targetUnit, originQ, originR);
      this.addLog(unit.name + " ha attaccato e diventa avvizzita.");
      this.selectedUnit = null;
      this.moveMode = false;
      this.pendingMovePath = null;
      return true;
    }

    if (CELL_TYPE.get(q + "," + r) === "mountain") { this.addLog("Montagne invalicabili!"); return false; }

    // Movimento multi-passo: calcola path a costo minimo
    const { cells } = this.getReachableCells(unit, e);
    const key = q + "," + r;
    const info = cells.get(key);
    if (!info) {
      this.addLog("Cella non raggiungibile con il mana attuale.");
      return false;
    }

    // Avviso tempio nemico sulla destinazione
    const enemyTemple = this.entities.find(ent => !ent.isFallen && ent.id !== e.id && ent.templeKey === key);
    if (enemyTemple && e.isHuman && !this.pendingEnemyTempleMove) {
      this.pendingEnemyTempleMove = {
        unitInstanceId: unit.instanceId, q, r, cost: info.cost,
        path: info.path
      };
      if (typeof window !== "undefined" && window.onEnemyTempleWarning) {
        window.onEnemyTempleWarning({ templeOwner: enemyTemple.name, unitName: unit.name, q, r });
      }
      return true;
    }

    // Proponi path (umano conferma); IA esegue subito
    if (e.isHuman) {
      return this.proposeMovePath(unit, info.path, info.cost);
    }
    this.pendingMovePath = { unitInstanceId: unit.instanceId, path: info.path, cost: info.cost };
    return this.confirmMovePath(true);
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
    const ctx = { attacker, defender, originQ, originR };
    // Fase 1: trappole on_attack (pausa se serve)
    if (this._checkTraps("on_attack", ctx, () => this._combatDealDamage(attacker, defender, originQ, originR))) {
      return; // in attesa decisione trappola
    }
    this._combatDealDamage(attacker, defender, originQ, originR);
  }

  _combatDealDamage(attacker, defender, originQ, originR) {
    // Creatura già rimossa?
    const atkEnt = this.getEntityById(attacker.ownerId);
    const defEnt = this.getEntityById(defender.ownerId);
    if (!atkEnt || !defEnt) return;
    if (!atkEnt.field.some(u => u.instanceId === attacker.instanceId)) return;
    if (!defEnt.field.some(u => u.instanceId === defender.instanceId)) return;

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
      const cont = () => {
        if (atkEnt.field.some(u => u.instanceId === attacker.instanceId)) {
          attacker.q = defQ; attacker.r = defR;
          this._revealAround(atkEnt, attacker.q, attacker.r, 2);
        }
      };
      if (this._checkTraps("on_death", { attacker, defender }, cont)) return;
      cont();
    } else {
      defender.currentHp -= dmg;
      this.addLog(defender.name + " subisce " + dmg + " → " + defender.currentHp + " PV");
      const afterDmg = () => this._combatCounter(attacker, defender);
      if (this._checkTraps("after_damage", { attacker, defender, damage: dmg }, afterDmg)) return;
      afterDmg();
    }
  }

  _combatCounter(attacker, defender) {
    const atkEnt = this.getEntityById(attacker.ownerId);
    const defEnt = this.getEntityById(defender.ownerId);
    if (!atkEnt || !defEnt) return;
    if (!defEnt.field.some(u => u.instanceId === defender.instanceId)) return;
    if (!atkEnt.field.some(u => u.instanceId === attacker.instanceId)) return;
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
  }



  _resumeAfterTrapPause() {
    if (typeof window !== "undefined" && window.onGameUpdate) window.onGameUpdate();
    const cur = this.currentEntity;
    if (cur && !cur.isHuman && this.phase === "playing" && !this.pendingTrapWindow) {
      if (this._aiEndTurnTimeout) clearTimeout(this._aiEndTurnTimeout);
      this._aiEndTurnTimeout = setTimeout(() => {
        this._aiEndTurnTimeout = null;
        this._aiTurnLock = false;
        if (this.currentEntity && !this.currentEntity.isHuman && this.phase === "playing") {
          this.endTurn();
          if (typeof window !== "undefined" && window.onGameUpdate) window.onGameUpdate();
          if (this.currentEntity && !this.currentEntity.isHuman && this.phase === "playing") {
            setTimeout(() => this.runAITurn(), 400);
          }
        }
      }, 500);
    }
  }

  /**
   * Trappole v037: mai nel proprio turno; coda dal giocatore successivo;
   * una sola attivazione; niente risposta a trappola.
   * @returns {boolean} true se in pausa
   */
  _checkTraps(trigger, ctx, onComplete) {
    if (this.pendingTrapWindow) return true;
    const current = this.currentEntity;
    if (!current) {
      if (onComplete) onComplete();
      return false;
    }
    const n = this.entities.length;
    const startIdx = this.entities.findIndex(e => e.id === current.id);
    const queue = [];
    for (let i = 1; i < n; i++) {
      const ent = this.entities[(startIdx + i) % n];
      if (!ent || ent.isFallen) continue;
      const traps = ent.hand.filter(c => c.type === "trappola" && c.trigger === trigger);
      if (traps.length) queue.push({ entityId: ent.id, traps: traps.map(t => t.instanceId) });
    }
    if (!queue.length) {
      if (onComplete) onComplete();
      return false;
    }
    this.pendingTrapWindow = { trigger, ctx: ctx || {}, queue, onComplete: onComplete || null };
    this._promptNextTrapDecider();
    return true;
  }

  _promptNextTrapDecider() {
    const w = this.pendingTrapWindow;
    if (!w || !w.queue.length) {
      const cb = w && w.onComplete;
      this.pendingTrapWindow = null;
      this.pendingTrap = null;
      if (cb) cb();
      this._resumeAfterTrapPause();
      return;
    }
    const next = w.queue[0];
    const ent = this.getEntityById(next.entityId);
    if (!ent) {
      w.queue.shift();
      this._promptNextTrapDecider();
      return;
    }
    const options = ent.hand.filter(c => next.traps.includes(c.instanceId) && c.type === "trappola");
    if (!options.length) {
      w.queue.shift();
      this._promptNextTrapDecider();
      return;
    }
    this.pendingTrap = { owner: ent, trigger: w.trigger, ctx: w.ctx, options };
    if (ent.isHuman) {
      this.addLog("In attesa di trappola da " + ent.name + "…", true);
      if (this._aiEndTurnTimeout) {
        clearTimeout(this._aiEndTurnTimeout);
        this._aiEndTurnTimeout = null;
      }
      this._aiTurnLock = false;
      if (typeof window !== "undefined" && window.onTrapPrompt) window.onTrapPrompt(this.pendingTrap);
      if (typeof window !== "undefined" && window.onGameUpdate) window.onGameUpdate();
    } else {
      const trap = options.find(t => ent.canPay(t.cost || 0));
      if (trap && Math.random() < 0.55) {
        this._activateTrap(ent, trap, w.ctx);
        const cb = w.onComplete;
        this.pendingTrapWindow = null;
        this.pendingTrap = null;
        if (cb) cb();
        this._resumeAfterTrapPause();
      } else {
        w.queue.shift();
        this.pendingTrap = null;
        this._promptNextTrapDecider();
      }
    }
  }

  activatePendingTrap(trapInstanceId) {
    if (!this.pendingTrap || !this.pendingTrapWindow) return false;
    const { owner, ctx } = this.pendingTrap;
    const trap = owner.hand.find(c => c.instanceId === trapInstanceId);
    if (!trap) return false;
    if (!owner.canPay(trap.cost || 0)) { this.addLog("Mana insufficiente per la trappola!"); return false; }
    this._activateTrap(owner, trap, ctx);
    const cb = this.pendingTrapWindow.onComplete;
    this.pendingTrapWindow = null;
    this.pendingTrap = null;
    if (cb) cb();
    this._resumeAfterTrapPause();
    return true;
  }

  declinePendingTrap() {
    if (!this.pendingTrapWindow) {
      this.pendingTrap = null;
      return;
    }
    this.pendingTrapWindow.queue.shift();
    this.pendingTrap = null;
    this._promptNextTrapDecider();
  }

  _activateTrap(owner, trap, ctx) {
    owner.pay(trap.cost || 0);
    owner.hand = owner.hand.filter(c => c.instanceId !== trap.instanceId);
    owner.graveyard.push(trap);
    this.addLog("🪤 " + owner.name + " attiva " + trap.name + "!", true);
    this._resolveEffect(trap.effectId, owner, ctx && ctx.defender ? ctx.defender : (ctx && ctx.attacker ? ctx.attacker : null), ctx);
  }

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
    if (this.pendingTrapWindow || this.pendingTrap) {
      this.addLog("Risolvi prima la trappola in sospeso.");
      return;
    }
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
      const newlySpecial = [];
      current.field.forEach(u => {
        const key = u.q + "," + u.r;
        const wasNew = !this.flippedCells.has(key);
        this.flippedCells.add(key);
        if (wasNew) {
          const t = CELL_TYPE.get(key) || "plain";
          const name = this.tileDisplayName(t);
          this.addLog("Esagono scoperto (" + u.q + "," + u.r + "): " + name, true);
          if (this.isEventTileType(t) || t === "teletrasporto") {
            newlySpecial.push(name);
          }
        }
      });
      if (newlySpecial.length && current.isHuman && typeof window !== "undefined" && window.onDiscoveryPrompt) {
        const unique = [...new Set(newlySpecial)];
        window.onDiscoveryPrompt(unique);
      }

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
      return !!this.pendingEventDetail;
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
    this._scheduleNextActor();
  }

  /** Dopo chiusura turno async: refresh UI e avvia IA se serve */
  _scheduleNextActor() {
    if (typeof window !== "undefined") {
      if (window.onGameUpdate) window.onGameUpdate();
      else if (typeof window.renderGameState === "function") window.renderGameState();
    }
    if (this.phase === "ended") return;
    const cur = this.currentEntity;
    if (cur && !cur.isHuman && this.phase === "playing") {
      const self = this;
      setTimeout(() => {
        if (self.phase === "playing" && self.currentEntity && !self.currentEntity.isHuman) {
          self.runAITurn();
        }
      }, 500);
    }
  }

  /** Continua endTurn dopo eventuale scelta evento umana */
  resolvePendingEventChoice(type) {
    if (!this.pendingEventChoice) return false;
    const current = this.getEntityById(this.pendingEventChoice.entityId) || this.currentEntity;
    const opt = this.pendingEventChoice.options.find(o => o.type === type);
    this.pendingEventChoice = null;
    if (opt) this._drawAndResolveEvent(current, opt);
    if (this.pendingEventDetail) return true;
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
    const narrative = ev.narrative || ev.text || "";
    this.addLog("📜 [" + type + "] " + ev.name, true);

    // Nuovo formato: narrative + choices[]
    if (ev.choices && ev.choices.length >= 2) {
      if (entity.isHuman) {
        this.pendingEventDetail = {
          event: ev,
          unitInstanceId: unit ? unit.instanceId : null,
          entityId: entity.id,
          tileType: type
        };
        if (typeof window !== "undefined" && window.onEventDetailPrompt) {
          window.onEventDetailPrompt(this.pendingEventDetail);
        }
        return; // attende resolveEventChoice
      }
      // IA: scelta casuale
      const pick = ev.choices[Math.floor(Math.random() * ev.choices.length)];
      this.addLog(entity.name + " sceglie: " + pick.text);
      this._resolveTileEvent({ effectId: pick.effectId, name: ev.name }, unit, entity);
      return;
    }

    // Retrocompatibilità vecchio formato
    this.addLog(narrative);
    this._resolveTileEvent(ev, unit, entity);
  }

  /** Scelta umana tra le opzioni dell'evento pescato */
  resolveEventChoice(choiceIndex) {
    if (!this.pendingEventDetail) return false;
    const pending = this.pendingEventDetail;
    this.pendingEventDetail = null;
    const ev = pending.event;
    const choice = ev.choices && ev.choices[choiceIndex];
    const entity = this.getEntityById(pending.entityId) || this.currentEntity;
    const unit = entity.field.find(u => u.instanceId === pending.unitInstanceId) || entity.field[0];
    if (!choice) {
      this.addLog("Scelta evento non valida.");
      return false;
    }
    this.addLog("Scelta: " + choice.text, true);
    this._resolveTileEvent({ effectId: choice.effectId, name: ev.name }, unit, entity);
    if (!this.pendingCardPick) {
      this._finishEndTurn(entity);
    } else {
      this._endTurnEntityId = entity.id;
    }
    return true;
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


  _offerColorCardChoice(owner) {
    const colors = (typeof COLORS !== "undefined") ? COLORS.filter(c => c !== "yellow") : ["white","red","black","blue","green"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const pool = ALL_CARDS.filter(c => c.color === color && (c.cost || 0) < 6);
    if (!pool.length) {
      this.addLog("Nessuna carta disponibile per il colore " + color);
      return;
    }
    const shuffle = [...pool].sort(() => Math.random() - 0.5);
    const opts = [];
    for (let i = 0; i < 2 && i < shuffle.length; i++) {
      opts.push({
        ...shuffle[i],
        instanceId: shuffle[i].id + "_evt_" + Date.now() + "_" + i + "_" + Math.random().toString(36).slice(2,5)
      });
    }
    if (opts.length === 1 || !owner.isHuman) {
      const pick = opts[Math.floor(Math.random() * opts.length)];
      owner.hand.push(pick);
      this.addLog(owner.name + " ottiene " + pick.name + " (" + color + ")");
      return;
    }
    this.pendingCardPick = { options: opts, entityId: owner.id, color };
    this.addLog("Scegli una carta " + ((typeof COLOR_NAMES !== "undefined" && COLOR_NAMES[color]) || color) + " tra le due proposte.", true);
    if (typeof window !== "undefined" && window.onCardPickPrompt) {
      window.onCardPickPrompt(this.pendingCardPick);
    }
  }

  resolveCardPick(instanceId) {
    if (!this.pendingCardPick) return false;
    const owner = this.getEntityById(this.pendingCardPick.entityId);
    const card = this.pendingCardPick.options.find(c => c.instanceId === instanceId);
    this.pendingCardPick = null;
    if (!owner || !card) return false;
    owner.hand.push(card);
    this.addLog(owner.name + " aggiunge in mano: " + card.name, true);
    if (this._endTurnEntityId && !this.pendingEventDetail && !this.pendingEventChoice) {
      const ent = this.getEntityById(this._endTurnEntityId) || owner;
      this._finishEndTurn(ent);
    }
    return true;
  }

  _spawnEventToken(owner) {
    if (!owner.templeKey) {
      this.addLog("Nessun tempio: token non generato.");
      return;
    }
    const [tq, tr] = owner.templeKey.split(",").map(Number);
    if (this.getUnitAt(tq, tr)) {
      this.addLog("Tempio occupato: la recluta non trova spazio.");
      return;
    }
    const base = (typeof FREE_TOKEN !== "undefined") ? FREE_TOKEN : { id: "token_free", name: "Recluta", type: "mostro", atk: 1, hp: 1 };
    const token = {
      ...base,
      instanceId: "evt_token_" + owner.id + "_" + Date.now(),
      q: tq, r: tr,
      currentHp: 1,
      shields: 0,
      ownerId: owner.id,
      permanentAtkBonus: 0,
      movedThisTurn: false,
      isWithered: false,
      atk: 1, hp: 1
    };
    owner.field.push(token);
    this._revealAround(owner, tq, tr, 2);
    this.addLog("Recluta 1/1 evocata sul Tempio di " + owner.name, true);
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
    if (this._aiTurnLock) return;
    if (this.pendingTrapWindow || this.pendingTrap) return;
    const ai = this.currentEntity;
    if (!ai || ai.isHuman || this.phase !== "playing") return;
    this._aiTurnLock = true;
    // CADUTO: solo movimento creature (chase o random)
    if (ai.isFallen) {
      this._runFallenTurn(ai);
      if (this._aiEndTurnTimeout) clearTimeout(this._aiEndTurnTimeout);
      this._aiEndTurnTimeout = setTimeout(async () => {
        this._aiEndTurnTimeout = null;
        this._aiTurnLock = false;
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
        else if (this.currentEntity && !this.currentEntity.isHuman && this.phase === "playing") {
          setTimeout(() => this.runAITurn(), 400);
        }
      }, 500);
      return;
    }
    this.addLog(ai.name + " sta pensando...");
    // =====================================================
    // IA – obiettivi (in ordine):
    // 1) Artefatto SEMPRE sul campo (priorità assoluta)
    // 2) Evocare mostri sul tempio se libero e mana lo permette
    // 3) Lanciare magie utili su bersagli di valore
    // 4) Attaccare se favorevole (adiacente, non suicida se evitabile)
    // 5) Avanzare verso nemici / Altare senza sprecare mana
    // =====================================================

    // --- 1) Artefatto ---
    if (!ai.hasArtifactOnField()) {
      const artCard = ai.hand.find(c => c.id === "artifact" || c.type === "artefatto");
      if (artCard && ai.canPay(artCard.currentCost || 0)) {
        const creatures = ai.field.filter(u => u.type === "mostro" || u.type === "mostrissimo");
        if (creatures.length) {
          // Preferisci la creatura più tosta
          creatures.sort((a, b) => ((b.atk||0)+(b.currentHp||0)) - ((a.atk||0)+(a.currentHp||0)));
          this.selectedCard = artCard;
          this.attachMode = true;
          this.attachArtifactToUnit(creatures[0].instanceId);
        } else {
          const mon = ai.hand
            .filter(c => c.type === "mostro" && ai.canPay(c.currentCost !== undefined ? c.currentCost : c.cost))
            .sort((a, b) => (b.cost||0) - (a.cost||0))[0];
          if (mon) {
            const target = this._findPlacementHex(ai);
            if (target) {
              this.selectedCard = mon; this.playMode = true; this.playCardOnHex(target[0], target[1]);
              if (ai.field.length) {
                this.selectedCard = artCard; this.attachMode = true;
                this.attachArtifactToUnit(ai.field[0].instanceId);
              }
            }
          }
        }
      }
    }

    // --- 2) Evocazioni (dal più costoso giocabile: valore) ---
    const place = this._findPlacementHex(ai);
    if (place) {
      const monsters = ai.hand
        .filter(c => c.type === "mostro" && ai.canPay(c.currentCost !== undefined ? c.currentCost : c.cost))
        .sort((a, b) => {
          const va = (a.atk||0) + (a.hp||0) + (a.cost||0);
          const vb = (b.atk||0) + (b.hp||0) + (b.cost||0);
          return vb - va;
        });
      if (monsters[0]) {
        this.selectedCard = monsters[0];
        this.playMode = true;
        this.playCardOnHex(place[0], place[1]);
      }
    }

    // --- 3) Magie a bersaglio: preferisci uccidere o danneggiare minacce ---
    const curses = ai.hand.filter(c => c.type === "maledizione" && ai.canPay(c.currentCost !== undefined ? c.currentCost : c.cost));
    for (const card of curses) {
      const enemies = [];
      for (const ent of this.entities) {
        if (ent.id === ai.id || ent.isFallen) continue;
        for (const u of ent.field) enemies.push(u);
      }
      if (!enemies.length) break;
      // Mira al più forte / con artefatto
      enemies.sort((a, b) => {
        const ea = this.getEntityById(a.ownerId);
        const eb = this.getEntityById(b.ownerId);
        const artA = ea && ea.artifactAttachedTo === a.instanceId ? 5 : 0;
        const artB = eb && eb.artifactAttachedTo === b.instanceId ? 5 : 0;
        return ((b.atk||0)+(b.currentHp||0)+artB) - ((a.atk||0)+(a.currentHp||0)+artA);
      });
      const target = enemies[0];
      if (card.needsTarget || card.effectId) {
        this.targetMode = { card, effectId: card.effectId, remaining: card.multiTarget || 1, targets: [] };
        this.selectTargetUnit(target);
        if (this.targetMode && this.targetMode.targets.length >= 1) {
          this.confirmSpellCast(true);
        }
        break; // una magia per turno
      }
    }

    // --- 4) Combattimento favorevole ---
    for (const unit of [...ai.field]) {
      if (unit.isWithered) continue;
      const nbs = this._hexesInRange(unit.q, unit.r, 1);
      let bestAtk = null;
      for (const [q, r] of nbs) {
        const enemy = this.getUnitAt(q, r);
        if (!enemy || enemy.ownerId === ai.id) continue;
        const atkP = (unit.atk || 0) + (unit.permanentAtkBonus || 0);
        const defHp = enemy.currentHp || 1;
        // Attacca se uccidi o se hai almeno pari attacco
        if (atkP >= defHp || atkP >= ((enemy.atk || 0))) {
          bestAtk = [q, r];
          if (atkP >= defHp) break; // priorità kill
        }
      }
      if (bestAtk) {
        this.selectedUnit = unit;
        this.moveMode = true;
        this.tryMoveOrAttack(bestAtk[0], bestAtk[1]);
      }
    }

    // --- 5) Movimento: avvicinati al nemico più debole o all'Altare ---
    const human = this.entities.find(e => e.isHuman && !e.isFallen);
    for (const unit of [...ai.field]) {
      if (unit.isWithered) continue;
      if (unit.movedThisTurn && ai.mana <= 0) continue;
      const { cells } = this.getReachableCells(unit, ai);
      if (!cells.size) continue;
      let best = null, bestScore = -1e9;
      for (const [key, info] of cells) {
        const [q, r] = key.split(",").map(Number);
        let score = 0;
        // Verso creature umane
        if (human && human.field.length) {
          let minD = 99;
          for (const hu of human.field) {
            minD = Math.min(minD, hexDistance(q, r, hu.q, hu.r));
          }
          score += (20 - minD) * 3;
        }
        // Verso altare
        score += (12 - hexDistance(q, r, 0, 0));
        // Preferisci path economici
        score -= (info.cost || 0) * 0.5;
        // Evita di finire avvizziti se non necessario
        if (!this.isCellDiscovered(q, r, ai)) score -= 8;
        if (score > bestScore) { bestScore = score; best = { q, r, info }; }
      }
      if (best) {
        this.selectedUnit = unit;
        this.moveMode = true;
        this.tryMoveOrAttack(best.q, best.r);
        // solo una creatura si muove in modo aggressivo per non bruciare tutto il mana
        break;
      }
    }

    // Salva il timeout così possiamo annullarlo se il turno diventa umano
    if (this._aiEndTurnTimeout) clearTimeout(this._aiEndTurnTimeout);
    this._aiEndTurnTimeout = setTimeout(async () => {
      this._aiEndTurnTimeout = null;
      this._aiTurnLock = false;
      if (typeof window !== "undefined" && window.waitForPopups) {
        await window.waitForPopups();
      }
      if (this.currentEntity && this.currentEntity.isHuman) {
        this.addLog("(timeout IA ignorato: è il turno dell'umano)");
        if (typeof window !== "undefined" && window.onGameUpdate) window.onGameUpdate();
        return;
      }
      this.endTurn();
      if (typeof window !== "undefined" && window.onGameUpdate) window.onGameUpdate();
      if (this.phase === "ended" && window.onGameEnd) window.onGameEnd(this);
      else if (this.currentEntity && !this.currentEntity.isHuman && this.phase === "playing") {
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

    // Caso 0 sacrifici → piazzamento su Altare/Circolo liberi
    if (sac === 0) {
      this.selectedCard = card;
      this.playMode = true;
      this.sacrificeMode = false;
      this.sacrificeCard = null;
      this.sacrificeCount = 0;
      this.sacrificeNeeded = 0;
      this.sacrificedPositions = new Set();
      for (const [key, type] of CELL_TYPE) {
        if (type === "city" || type === "circolo") {
          const [qq, rr] = key.split(",").map(Number);
          if (!this.getUnitAt(qq, rr)) this.sacrificedPositions.add(key);
        }
      }
      this.addLog("Selezionato " + card.name + " (0 sacrifici). Clicca Altare o Circolo libero.");
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
    // v028: SOLO Altare (city) e Circoli sbloccati dai sacrifici — mai i Templi
    if (this.sacrificedPositions) {
      for (const key of this.sacrificedPositions) {
        const [q, r] = key.split(",").map(Number);
        const t = CELL_TYPE.get(key);
        if ((t === "city" || t === "circolo") && !this.getUnitAt(q, r)) legal.push([q, r]);
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

  // =====================================================
  // SALVATAGGIO PARTITA (serializzazione)
  // =====================================================
  toSaveData() {
    const setToArr = (s) => (s && typeof s[Symbol.iterator] === "function") ? [...s] : [];
    return {
      version: (typeof APP_VERSION !== "undefined" ? APP_VERSION : "037"),
      gameId: this.gameId,
      savedAt: Date.now(),
      humanName: this.humanName,
      numAI: this.numAI,
      numFallenTemples: this.numFallenTemples,
      turnIndex: this.turnIndex,
      turnNumber: this.turnNumber,
      phase: this.phase,
      log: this.log.slice(-80),
      winner: this.winner && this.winner.id,
      loseReason: this.loseReason,
      mostrissimiPool: this.mostrissimiPool,
      globalClearFogUntil: this.globalClearFogUntil,
      flippedCells: setToArr(this.flippedCells),
      mostrissimiSummonedThisTurn: this.mostrissimiSummonedThisTurn || 0,
      specialZones: this.specialZones || {},
      cellTypeOverrides: (() => {
        const o = {};
        for (const [k, t] of CELL_TYPE) {
          if (t !== "mountain" && t !== "plain" && t !== "temple" && t !== "city") o[k] = t;
        }
        // always store specials
        if (this.specialZones) {
          for (const k of Object.keys(this.specialZones)) o[k] = this.specialZones[k].type || CELL_TYPE.get(k);
        }
        return o;
      })(),
      entities: this.entities.map(e => ({
        id: e.id,
        name: e.name,
        isHuman: e.isHuman,
        isFallen: e.isFallen,
        manaMax: e.manaMax,
        mana: e.mana,
        hand: e.hand,
        field: e.field,
        graveyard: e.graveyard,
        traps: e.traps || [],
        artifact: e.artifact,
        artifactAttachedTo: e.artifactAttachedTo,
        templeKey: e.templeKey,
        templeId: e.templeId,
        templeName: e.templeName,
        templeIcon: e.templeIcon,
        passives: e.passives || [],
        clearFogUntil: e.clearFogUntil || 0,
        firstPackPicked: e.firstPackPicked,
        primaryColor: e.primaryColor,
        apexCardInstanceId: e.apexCardInstanceId,
        explored: setToArr(e.explored)
      }))
    };
  }

  static fromSaveData(data) {
    const g = new GameState({
      humanName: data.humanName || "Giocatore",
      numAI: data.numAI || 1,
      numFallenTemples: data.numFallenTemples || 0
    });
    // Applica zone speciali salvate
    if (data.cellTypeOverrides) {
      for (const [k, t] of Object.entries(data.cellTypeOverrides)) {
        CELL_TYPE.set(k, t);
      }
    }
    if (data.specialZones) {
      g.specialZones = data.specialZones;
      if (typeof SPECIAL_ZONES !== "undefined") SPECIAL_ZONES = data.specialZones;
    }
    g.entities = (data.entities || []).map(ed => {
      const e = new Entity(ed.id, ed.name, !!ed.isHuman);
      Object.assign(e, {
        isFallen: ed.isFallen,
        manaMax: ed.manaMax,
        mana: ed.mana,
        hand: ed.hand || [],
        field: (ed.field || []).map(u => ({ ...u, q: Number(u.q), r: Number(u.r) })),
        graveyard: ed.graveyard || [],
        traps: ed.traps || [],
        artifact: ed.artifact,
        artifactAttachedTo: ed.artifactAttachedTo,
        templeKey: ed.templeKey,
        templeId: ed.templeId,
        templeName: ed.templeName,
        templeIcon: ed.templeIcon,
        passives: ed.passives || [],
        clearFogUntil: ed.clearFogUntil || 0,
        firstPackPicked: ed.firstPackPicked,
        primaryColor: ed.primaryColor,
        apexCardInstanceId: ed.apexCardInstanceId,
        explored: new Set(ed.explored || [])
      });
      return e;
    });
    g.gameId = data.gameId || g.gameId;
    g.turnIndex = data.turnIndex || 0;
    g.turnNumber = data.turnNumber || 1;
    g.phase = data.phase || "playing";
    g.log = data.log || [];
    g.mostrissimiPool = data.mostrissimiPool || [];
    g.globalClearFogUntil = data.globalClearFogUntil || 0;
    g.flippedCells = new Set(data.flippedCells || []);
    g.mostrissimiSummonedThisTurn = data.mostrissimiSummonedThisTurn || 0;
    g.winner = data.winner ? g.getEntityById(data.winner) : null;
    g.loseReason = data.loseReason || null;
    // reset UI state
    g.selectedCard = null;
    g.selectedUnit = null;
    g.moveMode = false;
    g.playMode = false;
    g.attachMode = false;
    g.sacrificeMode = false;
    g.pendingTeleportStep = null;
    g.pendingEventChoice = null;
    return g;
  }
}


function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}
