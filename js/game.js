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
    this.quest = null;
    this.clearFogUntil = 0;
  }

  startTurn() {
    this.manaMax += 1;
    this.mana = this.manaMax;
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

    this._initEntities();
    this._assignTemples();
    this._initMostrissimiPool();
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
      this._revealAround(e, ...templeKeys[idx].split(",").map(Number), 2);
    });
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

  get currentEntity() { return this.entities[this.turnIndex]; }
  get activePlayers() { return this.entities.filter(e => !e.isFallen); }

  addLog(msg, important = false) {
    this.log.push({ msg, important, turn: this.turnNumber, time: Date.now() });
    if (this.log.length > 400) this.log.shift();
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
    if (entity.isFallen) return false;
    if (this.globalClearFogUntil >= this.turnNumber) return true;
    if (entity.clearFogUntil >= this.turnNumber) return true;
    if (entity.field.some(u => u.q === q && u.r === r)) return true;
    if (entity.templeKey === q + "," + r) return true;
    for (const u of entity.field) {
      if (hexDistance(u.q, u.r, q, r) <= 2) return true;
    }
    if (entity.templeKey) {
      const [tq, tr] = entity.templeKey.split(",").map(Number);
      if (hexDistance(tq, tr, q, r) <= 2) return true;
    }
    return entity.explored.has(q + "," + r);
  }

  startDraft() {
    this.phase = "draft";
    // Draft a bustine: ogni giocatore attivo sceglie 3 bustine in totale (9 carte)
    // Si vedono sempre 3 bustine; ne scegli 1 intera; poi si passa/refill
    this.draft = {
      packs: this._generatePacks(3),
      currentPick: 0,
      totalPicksNeeded: this.activePlayers.length * 3, // ogni attivo prende 3 bustine
      picks: {},
      pickerIndex: 0  // indice tra activePlayers
    };
    this.activePlayers.forEach(e => this.draft.picks[e.id] = []);
    // Primo picker casuale tra attivi
    this.draft.pickerIndex = Math.floor(Math.random() * this.activePlayers.length);
    this.addLog("Inizia la fase di Draft a bustine!", true);
  }

  _generatePacks(count) {
    const packs = [];
    for (let p = 0; p < count; p++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const pool = ALL_CARDS.filter(c => c.color === color || color === "yellow");
      const cards = [];
      const poolCopy = [...pool];
      for (let i = 0; i < 3 && poolCopy.length; i++) {
        const idx = Math.floor(Math.random() * poolCopy.length);
        const base = poolCopy[idx];
        cards.push({ ...base, instanceId: base.id + "_p" + Date.now() + "_" + p + "_" + i + "_" + Math.random().toString(36).slice(2,6) });
        poolCopy.splice(idx, 1);
      }
      packs.push({ color, cards, id: "pack_" + Date.now() + "_" + p });
    }
    return packs;
  }

  getDraftCurrentPicker() {
    if (!this.draft || this.draft.currentPick >= this.draft.totalPicksNeeded) return null;
    const actives = this.activePlayers;
    if (!actives.length) return null;
    return actives[this.draft.pickerIndex % actives.length];
  }

  // Scegli intera bustina (packIndex)
  draftPickPack(packIndex) {
    const picker = this.getDraftCurrentPicker();
    if (!picker) return false;
    if (packIndex < 0 || packIndex >= this.draft.packs.length) return false;
    const pack = this.draft.packs[packIndex];
    // Tutte le 3 carte della bustina vanno al giocatore
    pack.cards.forEach(card => {
      this.draft.picks[picker.id].push(card);
    });
    this.addLog(picker.name + " ha scelto la bustina " + (COLOR_NAMES[pack.color] || pack.color) + " (" + pack.cards.map(c => c.name).join(", ") + ")", true);
    // Rimuovi la bustina scelta
    this.draft.packs.splice(packIndex, 1);
    this.draft.currentPick++;
    // Passa al prossimo giocatore
    this.draft.pickerIndex = (this.draft.pickerIndex + 1) % this.activePlayers.length;
    // Refill fino a 3 bustine se non abbiamo finito
    if (this.draft.currentPick < this.draft.totalPicksNeeded) {
      while (this.draft.packs.length < 3) {
        const newPacks = this._generatePacks(1);
        this.draft.packs.push(newPacks[0]);
      }
    }
    // AI auto-pick
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
      // AI sceglie la bustina con score medio più alto
      let bestIdx = 0, bestScore = -1;
      this.draft.packs.forEach((pack, pi) => {
        const score = pack.cards.reduce((s, c) => s + (c.cost || 0) * 10 + (c.atk || 0) + (c.hp || 0), 0) + Math.random();
        if (score > bestScore) { bestScore = score; bestIdx = pi; }
      });
      const pack = this.draft.packs[bestIdx];
      pack.cards.forEach(card => this.draft.picks[picker.id].push(card));
      this.addLog(picker.name + " ha scelto la bustina " + (COLOR_NAMES[pack.color] || pack.color));
      this.draft.packs.splice(bestIdx, 1);
      this.draft.currentPick++;
      this.draft.pickerIndex = (this.draft.pickerIndex + 1) % this.activePlayers.length;
      if (this.draft.currentPick < this.draft.totalPicksNeeded) {
        while (this.draft.packs.length < 3) {
          this.draft.packs.push(this._generatePacks(1)[0]);
        }
      }
    }
  }

  _finishDraft() {
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
    this.addLog("Inizia la partita! Primo: " + this.currentEntity.name, true);
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
      if (this.getUnitAt(q, r)) { this.addLog("Cella occupata!"); return false; }
      if (!this.isVisibleTo(e, q, r) && e.field.length > 0) {
        if (e.templeKey !== q + "," + r) { this.addLog("Cella non visibile!"); return false; }
      }
      if (card.type === "mostrissimo") {
        const cellType = CELL_TYPE.get(q + "," + r);
        if (cellType !== "city" && cellType !== "water") {
          this.addLog("I Mostrissimi si evocano solo sull\\'Altare o su un Tempio!");
          return false;
        }
        const sac = card.sacrifice || 0;
        if (e.field.length < sac) {
          this.addLog("Servono " + sac + " permanenti da sacrificare!");
          return false;
        }
      }
      e.pay(cost);
      if (card.type === "mostrissimo" && (card.sacrifice || 0) > 0) {
        const toSac = e.field.slice(0, card.sacrifice);
        toSac.forEach(u => {
          e.field = e.field.filter(x => x.instanceId !== u.instanceId);
          e.graveyard.push(u);
          this.addLog("Sacrificato: " + u.name);
        });
      }
      e.hand = e.hand.filter(c => c.instanceId !== card.instanceId);
      const unit = { ...card, q, r, currentHp: card.hp || 1, shields: 0, ownerId: e.id, permanentAtkBonus: 0 };
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
    // Marca la creatura
    unit.hasArtifact = true;
    this.addLog(e.name + " lega l'Artefatto a " + unit.name + "!", true);
    this.selectedCard = null;
    this.attachMode = false;
    this.playMode = false;
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
    this.addLog("Selezionato " + unit.name + ". Clicca cella adiacente (1 mana).");
  }

  tryMoveOrAttack(q, r) {
    const e = this.currentEntity;
    if (!this.selectedUnit || !this.moveMode) return false;
    const unit = this.selectedUnit;
    const dist = hexDistance(unit.q, unit.r, q, r);
    if (dist !== 1) { this.addLog("Solo 1 passo alla volta!"); return false; }
    if (CELL_TYPE.get(q + "," + r) === "mountain") { this.addLog("Montagne invalicabili!"); return false; }
    if (!e.canPay(1)) { this.addLog("Mana insufficiente!"); return false; }
    const targetUnit = this.getUnitAt(q, r);
    if (!targetUnit) {
      e.pay(1);
      unit.q = q; unit.r = r;
      this._revealAround(e, q, r, 2);
      this.addLog(unit.name + " si muove su (" + q + "," + r + ")");
      this.selectedUnit = null; this.moveMode = false;
      return true;
    }
    if (targetUnit.ownerId === e.id) { this.addLog("Cella alleata!"); return false; }
    e.pay(1);
    const originQ = unit.q, originR = unit.r;
    this._resolveCombat(unit, targetUnit, originQ, originR);
    this.selectedUnit = null; this.moveMode = false;
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
      this.addLog(defender.name + " viene distrutto!");
      defEnt.field = defEnt.field.filter(u => u.instanceId !== defender.instanceId);
      defEnt.graveyard.push(defender);
      if (defEnt.artifactAttachedTo === defender.instanceId) {
        defEnt.artifactAttachedTo = null;
        const art = { ...defEnt.artifact, currentCost: (defEnt.artifact.currentCost || 0) + 3 };
        defEnt.hand.push(art);
        this.addLog("L\\'Artefatto di " + defEnt.name + " torna in mano (costo " + art.currentCost + ")");
      }
      this._checkTraps(defEnt, "on_death", { attacker, defender });
      attacker.q = defender.q; attacker.r = defender.r;
      this._revealAround(atkEnt, attacker.q, attacker.r, 2);
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
        atkEnt.field = atkEnt.field.filter(u => u.instanceId !== attacker.instanceId);
        atkEnt.graveyard.push(attacker);
        if (atkEnt.artifactAttachedTo === attacker.instanceId) {
          atkEnt.artifactAttachedTo = null;
          const art = { ...atkEnt.artifact, currentCost: (atkEnt.artifact.currentCost || 0) + 3 };
          atkEnt.hand.push(art);
          this.addLog("L\\'Artefatto di " + atkEnt.name + " torna in mano");
        }
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

  _destroyUnit(unit) {
    if (!unit) return;
    const ent = this.getEntityById(unit.ownerId);
    if (!ent) return;
    ent.field = ent.field.filter(u => u.instanceId !== unit.instanceId);
    ent.graveyard.push(unit);
    this.addLog(unit.name + " è stato distrutto!");
    if (ent.artifactAttachedTo === unit.instanceId) {
      ent.artifactAttachedTo = null;
      const art = { ...ent.artifact, currentCost: (ent.artifact.currentCost || 0) + 3 };
      ent.hand.push(art);
      this.addLog("L\\'Artefatto di " + ent.name + " torna in mano (costo " + art.currentCost + ")");
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
      permanentAtkBonus: 0
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
    current.field.forEach(u => {
      const key = u.q + "," + u.r;
      if (!this.flippedCells.has(key)) {
        this.flippedCells.add(key);
        const type = CELL_TYPE.get(key);
        const events = TERRAIN_EVENTS[type];
        if (events && events.length) {
          const ev = events[Math.floor(Math.random() * events.length)];
          this.addLog("📜 Evento su (" + u.q + "," + u.r + "): " + ev.name + " – " + ev.effect, true);
          this._applyTerrainEvent(ev, u, current);
        }
      }
    });
    if (!current.isFallen) {
      if (!current.hasArtifactOnField()) {
        current.isFallen = true;
        this.loseReason = current.name + " ha perso: Artefatto non presente sul campo a fine turno";
        this.addLog("💀 " + current.name + " decade! (Artefatto assente sul campo)", true);
      }
    }
    this._checkWin();
    if (this.phase === "ended") return;
    let next = (this.turnIndex + 1) % this.entities.length;
    let safety = 0;
    while (this.entities[next].isFallen && safety < 8) {
      next = (next + 1) % this.entities.length;
      safety++;
    }
    this.turnIndex = next;
    this.turnNumber++;
    const nextE = this.currentEntity;
    nextE.startTurn();
    this._spawnFreeToken(nextE);
    this.selectedCard = null;
    this.selectedUnit = null;
    this.moveMode = false;
    this.playMode = false;
    this.attachMode = false;
    this.targetMode = null;
    this.attachMode = false;
    this.addLog("--- Turno " + this.turnNumber + ": " + nextE.name + " (Mana " + nextE.mana + "/" + nextE.manaMax + ") ---", true);
  }

  _applyTerrainEvent(ev, unit, owner) {
    if (ev.effect.includes("+1 ATK")) unit.permanentAtkBonus = (unit.permanentAtkBonus || 0) + 1;
    else if (ev.effect.includes("+2 ATK")) unit.permanentAtkBonus = (unit.permanentAtkBonus || 0) + 2;
    else if (ev.effect.includes("recupera 2 PV") || ev.effect.includes("+1 PV")) unit.currentHp = (unit.currentHp || 0) + 2;
    else if (ev.effect.includes("1 scudo")) unit.shields = (unit.shields || 0) + 1;
    else if (ev.effect.includes("1 danno")) this._applyDamage(unit, 1);
    else if (ev.effect.includes("Rivela")) this._revealAround(owner, unit.q, unit.r, 2);
  }

  _checkWin() {
    const living = this.entities.filter(e => !e.isFallen);
    if (living.length <= 1) {
      this.winner = living[0] || null;
      this.phase = "ended";
      if (this.winner) this.addLog("🏆 " + this.winner.name + " vince la partita!", true);
      else this.addLog("Partita terminata - nessun vincitore.", true);
      if (typeof window !== "undefined" && window.onGameEnd) window.onGameEnd(this);
    }
  }

  runAITurn() {
    const ai = this.currentEntity;
    if (ai.isHuman || ai.isFallen || this.phase !== "playing") return;
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
      if (!ai.canPay(1)) break;
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
      if (!ai.canPay(1)) break;
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
    setTimeout(() => {
      this.endTurn();
      if (typeof window !== "undefined" && window.onGameUpdate) window.onGameUpdate();
      if (this.phase === "ended" && window.onGameEnd) window.onGameEnd(this);
      else if (!this.currentEntity.isHuman && this.phase === "playing") {
        setTimeout(() => this.runAITurn(), 600);
      }
    }, 800);
  }

  _findPlacementHex(entity) {
    const candidates = [];
    if (entity.templeKey) {
      const [tq, tr] = entity.templeKey.split(",").map(Number);
      candidates.push(...this._hexesInRange(tq, tr, 2));
      candidates.unshift([tq, tr]);
    }
    for (const u of entity.field) candidates.push(...this._hexesInRange(u.q, u.r, 1));
    candidates.push([0, 0]);
    for (const [q, r] of candidates) {
      if (CELL_TYPE.get(q + "," + r) !== "mountain" && !this.getUnitAt(q, r)) return [q, r];
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

  summonMostrissimo(poolIndex, q, r) {
    if (poolIndex < 0 || poolIndex >= this.mostrissimiPool.length) return false;
    const ms = this.mostrissimiPool[poolIndex];
    const card = { ...ms, instanceId: ms.instanceId + "_sum_" + Date.now() };
    this.selectedCard = card;
    this.playMode = true;
    return this.playCardOnHex(q, r);
  }
}

function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
}
