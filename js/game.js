// =====================================================
// GAME ENGINE - FASI 3-9 (MVP COMPLETO PARTITA BASE)
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
    this.artifact = null;
    this.artifactAttachedTo = null;
    this.templeKey = null;
    this.explored = new Set();
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
    if (this.field.some(c => c.id === "artifact")) return true;
    if (this.artifactAttachedTo) {
      return this.field.some(p => p.instanceId === this.artifactAttachedTo);
    }
    // Also accept if artifact card itself is on field
    return this.field.some(c => c.type === "artefatto");
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

    this._initEntities();
    this._assignTemples();
  }

  _initEntities() {
    this.entities.push(new Entity("human", this.humanName, true));
    for (let i = 1; i <= this.numAI; i++) {
      this.entities.push(new Entity("ai" + i, "IA-" + i, false));
    }
    for (let i = 1; i <= this.numFallenTemples; i++) {
      const fallen = new Entity("fallen" + i, "Tempio Caduto " + i, false);
      fallen.isFallen = true;
      this.entities.push(fallen);
    }
    while (this.entities.length < 4) {
      const filler = new Entity("filler" + this.entities.length, "Entità " + (this.entities.length+1), false);
      filler.isFallen = true;
      this.entities.push(filler);
    }
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

  get currentEntity() { return this.entities[this.turnIndex]; }
  get activePlayers() { return this.entities.filter(e => !e.isFallen); }

  addLog(msg, important = false) {
    this.log.push({ msg, important, turn: this.turnNumber, time: Date.now() });
    if (this.log.length > 300) this.log.shift();
  }

  _revealAround(entity, q, r, radius = 2) {
    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.abs(dq) + Math.abs(dr) + Math.abs(-dq-dr) <= radius * 2) {
          const key = (q+dq) + "," + (r+dr);
          if (CELL_TYPE.has(key)) entity.explored.add(key);
        }
      }
    }
  }

  isVisibleTo(entity, q, r) {
    if (entity.isFallen) return false;
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

  // ========== DRAFT ==========
  startDraft() {
    this.phase = "draft";
    this.draft = { packs: this._generatePacks(), currentPick: 0, picks: {} };
    this.activePlayers.forEach(e => this.draft.picks[e.id] = []);
    this.addLog("Inizia la fase di Draft!", true);
  }

  _generatePacks() {
    const usedColors = [];
    const packs = [];
    for (let p = 0; p < 3; p++) {
      let color;
      do { color = COLORS[Math.floor(Math.random() * COLORS.length)]; }
      while (usedColors.includes(color) && usedColors.length < 5);
      usedColors.push(color);
      const pool = ALL_CARDS.filter(c => c.color === color || color === "yellow");
      const cards = [];
      const poolCopy = [...pool];
      for (let i = 0; i < 3 && poolCopy.length; i++) {
        const idx = Math.floor(Math.random() * poolCopy.length);
        cards.push({ ...poolCopy[idx], instanceId: poolCopy[idx].id + "_p" + p + "_" + i });
        poolCopy.splice(idx, 1);
      }
      packs.push({ color, cards, taken: [false, false, false] });
    }
    return packs;
  }

  getDraftCurrentPicker() {
    const order = [1, 0, 0, 1, 1, 0];
    const step = this.draft.currentPick;
    if (step >= 6) return null;
    if (order[step] === 0) return this.entities.find(e => e.isHuman);
    return this.activePlayers.find(e => !e.isHuman) || this.activePlayers[0];
  }

  draftPick(packIndex, cardIndex) {
    const picker = this.getDraftCurrentPicker();
    if (!picker) return false;
    const pack = this.draft.packs[packIndex];
    if (!pack || pack.taken[cardIndex]) return false;
    const card = pack.cards[cardIndex];
    pack.taken[cardIndex] = true;
    this.draft.picks[picker.id].push(card);
    this.addLog(picker.name + " ha scelto: " + card.name);
    this.draft.currentPick++;
    this._processAIDraftPicks();
    if (this.draft.currentPick >= 6) this._finishDraft();
    return true;
  }

  _processAIDraftPicks() {
    while (this.draft.currentPick < 6) {
      const picker = this.getDraftCurrentPicker();
      if (!picker || picker.isHuman) break;
      let best = null, bestScore = -1, bestPack = -1, bestCard = -1;
      this.draft.packs.forEach((pack, pi) => {
        pack.cards.forEach((card, ci) => {
          if (pack.taken[ci]) return;
          const score = (card.cost||0)*10 + (card.atk||0) + (card.hp||0) + Math.random();
          if (score > bestScore) { bestScore = score; best = card; bestPack = pi; bestCard = ci; }
        });
      });
      if (best) {
        this.draft.packs[bestPack].taken[bestCard] = true;
        this.draft.picks[picker.id].push(best);
        this.addLog(picker.name + " ha scelto: " + best.name);
      }
      this.draft.currentPick++;
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
    this.addLog("Inizia la partita! Primo: " + this.currentEntity.name, true);
  }

  // ========== PLAY CARD ==========
  selectCardFromHand(instanceId) {
    const e = this.currentEntity;
    if (!e.isHuman) return;
    const card = e.hand.find(c => c.instanceId === instanceId);
    if (!card) return;
    this.selectedCard = card;
    this.selectedUnit = null;
    this.moveMode = false;
    this.playMode = true;
    this.addLog("Selezionata: " + card.name + ". Clicca un esagono valido.");
  }

  playCardOnHex(q, r) {
    const e = this.currentEntity;
    if (!this.selectedCard || !this.playMode) return false;
    const card = this.selectedCard;
    const cost = card.currentCost !== undefined ? card.currentCost : card.cost;

    if (!e.canPay(cost)) { this.addLog("Mana insufficiente!"); return false; }

    if (card.type === "mostro" || card.type === "artefatto") {
      if (CELL_TYPE.get(q+","+r) === "mountain") { this.addLog("Non puoi piazzare su una montagna!"); return false; }
      if (this.getUnitAt(q, r)) { this.addLog("Cella occupata!"); return false; }
      if (!this.isVisibleTo(e, q, r) && e.field.length > 0) {
        if (e.templeKey !== q+","+r) { this.addLog("Cella non visibile!"); return false; }
      }

      e.pay(cost);
      e.hand = e.hand.filter(c => c.instanceId !== card.instanceId);
      const unit = { ...card, q, r, currentHp: card.hp || 1, shields: 0, ownerId: e.id };
      e.field.push(unit);
      if (card.type === "artefatto") e.artifactAttachedTo = unit.instanceId;
      this._revealAround(e, q, r, 2);
      this.addLog(e.name + " gioca " + card.name + " su (" + q + "," + r + ")", true);
    } else if (card.type === "maledizione") {
      e.pay(cost);
      e.hand = e.hand.filter(c => c.instanceId !== card.instanceId);
      e.graveyard.push(card);
      this.addLog(e.name + " lancia " + card.name + "!", true);
    }

    this.selectedCard = null;
    this.playMode = false;
    return true;
  }

  // ========== MOVEMENT & COMBAT ==========
  selectUnit(instanceId) {
    const e = this.currentEntity;
    if (!e.isHuman) return;
    const unit = e.field.find(u => u.instanceId === instanceId);
    if (!unit) return;
    this.selectedUnit = unit;
    this.selectedCard = null;
    this.playMode = false;
    this.moveMode = true;
    this.addLog("Selezionato " + unit.name + ". Clicca cella adiacente (1 mana).");
  }

  tryMoveOrAttack(q, r) {
    const e = this.currentEntity;
    if (!this.selectedUnit || !this.moveMode) return false;
    const unit = this.selectedUnit;
    const dist = hexDistance(unit.q, unit.r, q, r);
    if (dist !== 1) { this.addLog("Solo 1 passo alla volta!"); return false; }
    if (CELL_TYPE.get(q+","+r) === "mountain") { this.addLog("Montagne invalicabili!"); return false; }
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
    this._resolveCombat(unit, targetUnit);
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

  _resolveCombat(attacker, defender) {
    const atkEnt = this.getEntityById(attacker.ownerId);
    const defEnt = this.getEntityById(defender.ownerId);
    this.addLog("⚔️ " + attacker.name + " (" + (attacker.atk||0) + ") attacca " + defender.name + " (" + defender.currentHp + " PV)", true);

    let dmg = attacker.atk || 0;
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
        const art = { ...defEnt.artifact, currentCost: (defEnt.artifact.currentCost||0) + 3 };
        defEnt.hand.push(art);
        this.addLog("L'Artefatto di " + defEnt.name + " torna in mano (costo " + art.currentCost + ")");
      }
      attacker.q = defender.q; attacker.r = defender.r;
      this._revealAround(atkEnt, attacker.q, attacker.r, 2);
    } else {
      defender.currentHp -= dmg;
      this.addLog(defender.name + " subisce " + dmg + " → " + defender.currentHp + " PV");
      let counter = defender.atk || 0;
      if (attacker.shields > 0) {
        const absorbed = Math.min(attacker.shields, counter);
        attacker.shields -= absorbed; counter -= absorbed;
      }
      if (counter >= attacker.currentHp) {
        this.addLog(attacker.name + " muore dal contrattacco!");
        atkEnt.field = atkEnt.field.filter(u => u.instanceId !== attacker.instanceId);
        atkEnt.graveyard.push(attacker);
        if (atkEnt.artifactAttachedTo === attacker.instanceId) {
          atkEnt.artifactAttachedTo = null;
          const art = { ...atkEnt.artifact, currentCost: (atkEnt.artifact.currentCost||0) + 3 };
          atkEnt.hand.push(art);
          this.addLog("L'Artefatto di " + atkEnt.name + " torna in mano");
        }
      } else if (counter > 0) {
        attacker.currentHp -= counter;
        this.addLog("Contrattacco: " + attacker.name + " ha " + attacker.currentHp + " PV");
      }
    }
  }

  // ========== TURN + ARTIFACT LOSE CONDITION ==========
  endTurn() {
    const current = this.currentEntity;
    this.addLog(current.name + " termina il turno.");

    // STRICT Artifact rule: if you have no artifact on field at end of turn → you fall
    if (!current.isFallen) {
      const hasArt = current.hasArtifactOnField();
      const hasArtInHand = current.hand.some(c => c.id === "artifact" || c.type === "artefatto");
      // You must have it ON THE FIELD. If only in hand → lose.
      if (!hasArt) {
        current.isFallen = true;
        this.loseReason = current.name + " ha perso: Artefatto non presente sul campo a fine turno";
        this.addLog("💀 " + current.name + " decade! (Artefatto assente sul campo)", true);
      }
    }

    this._checkWin();
    if (this.phase === "ended") return;

    // Next living
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
    this.selectedCard = null;
    this.selectedUnit = null;
    this.moveMode = false;
    this.playMode = false;
    this.addLog("--- Turno " + this.turnNumber + ": " + nextE.name + " (Mana " + nextE.mana + "/" + nextE.manaMax + ") ---", true);
  }

  _checkWin() {
    const living = this.entities.filter(e => !e.isFallen);
    if (living.length <= 1) {
      this.winner = living[0] || null;
      this.phase = "ended";
      if (this.winner) {
        this.addLog("🏆 " + this.winner.name + " vince la partita!", true);
      } else {
        this.addLog("Partita terminata - nessun vincitore.", true);
      }
      if (typeof window !== "undefined" && window.onGameEnd) window.onGameEnd(this);
    }
  }

  // ========== IMPROVED AI (Level B+) ==========
  runAITurn() {
    const ai = this.currentEntity;
    if (ai.isHuman || ai.isFallen || this.phase !== "playing") return;
    this.addLog(ai.name + " sta pensando...");

    // Priority 1: Make sure Artifact is on the field
    const hasArt = ai.hasArtifactOnField();
    if (!hasArt) {
      const artCard = ai.hand.find(c => c.id === "artifact" || c.type === "artefatto");
      if (artCard && ai.canPay(artCard.currentCost || 0)) {
        const target = this._findPlacementHex(ai);
        if (target) {
          ai.pay(artCard.currentCost || 0);
          ai.hand = ai.hand.filter(c => c.instanceId !== artCard.instanceId);
          const unit = { ...artCard, q: target[0], r: target[1], currentHp: 1, shields: 0, ownerId: ai.id };
          ai.field.push(unit);
          ai.artifactAttachedTo = unit.instanceId;
          this._revealAround(ai, target[0], target[1], 2);
          this.addLog(ai.name + " piazza l'Artefatto!");
        }
      }
    }

    // Priority 2: Play best creature
    const playable = ai.hand.filter(c =>
      c.type === "mostro" && ai.canPay(c.currentCost !== undefined ? c.currentCost : c.cost)
    );
    if (playable.length > 0 && ai.field.length < 4) {
      playable.sort((a,b) => (b.cost||0) - (a.cost||0));
      const card = playable[0];
      const cost = card.currentCost !== undefined ? card.currentCost : card.cost;
      const target = this._findPlacementHex(ai);
      if (target) {
        ai.pay(cost);
        ai.hand = ai.hand.filter(c => c.instanceId !== card.instanceId);
        const unit = { ...card, q: target[0], r: target[1], currentHp: card.hp||1, shields: 0, ownerId: ai.id };
        ai.field.push(unit);
        this._revealAround(ai, target[0], target[1], 2);
        this.addLog(ai.name + " evoca " + card.name);
      }
    }

    // Priority 3: Attack if advantageous
    for (const unit of [...ai.field]) {
      if (!ai.canPay(1)) break;
      const neighbors = this._hexesInRange(unit.q, unit.r, 1);
      for (const [q, r] of neighbors) {
        const enemy = this.getUnitAt(q, r);
        if (enemy && enemy.ownerId !== ai.id) {
          if ((unit.atk||0) >= (enemy.currentHp||1) || (unit.atk||0) >= (enemy.atk||0) + 1) {
            ai.pay(1);
            this._resolveCombat(unit, enemy);
            break;
          }
        }
      }
    }

    // Priority 4: Advance toward enemies / center
    for (const unit of [...ai.field]) {
      if (!ai.canPay(1)) break;
      const neighbors = this._hexesInRange(unit.q, unit.r, 1);
      // Prefer moving closer to human units
      let best = null, bestScore = 999;
      const human = this.entities.find(e => e.isHuman);
      if (human && human.field.length) {
        for (const [q,r] of neighbors) {
          if (CELL_TYPE.get(q+","+r) === "mountain" || this.getUnitAt(q,r)) continue;
          const d = hexDistance(q, r, human.field[0].q, human.field[0].r);
          if (d < bestScore) { bestScore = d; best = [q,r]; }
        }
      }
      if (best) {
        ai.pay(1);
        unit.q = best[0]; unit.r = best[1];
        this._revealAround(ai, best[0], best[1], 2);
        this.addLog(unit.name + " avanza");
        break;
      }
    }

    setTimeout(() => {
      this.endTurn();
      if (typeof window !== "undefined" && window.onGameUpdate) window.onGameUpdate();
      if (this.phase === "ended" && window.onGameEnd) window.onGameEnd(this);
    }, 700);
  }

  _findPlacementHex(entity) {
    // Prefer near temple, then near own units
    const candidates = [];
    if (entity.templeKey) {
      const [tq, tr] = entity.templeKey.split(",").map(Number);
      candidates.push(...this._hexesInRange(tq, tr, 2));
      candidates.unshift([tq, tr]);
    }
    for (const u of entity.field) {
      candidates.push(...this._hexesInRange(u.q, u.r, 1));
    }
    for (const [q, r] of candidates) {
      if (CELL_TYPE.get(q+","+r) !== "mountain" && !this.getUnitAt(q, r)) {
        return [q, r];
      }
    }
    return null;
  }

  _hexesInRange(cq, cr, range) {
    const res = [];
    for (let dq = -range; dq <= range; dq++) {
      for (let dr = -range; dr <= range; dr++) {
        const ds = -dq - dr;
        if (Math.abs(dq)+Math.abs(dr)+Math.abs(ds) <= range*2 && (dq!==0||dr!==0)) {
          const key = (cq+dq)+","+(cr+dr);
          if (CELL_TYPE.has(key)) res.push([cq+dq, cr+dr]);
        }
      }
    }
    return res;
  }
}

function hexDistance(q1, r1, q2, r2) {
  return (Math.abs(q1-q2) + Math.abs(q1+r1-q2-r2) + Math.abs(r1-r2)) / 2;
}
