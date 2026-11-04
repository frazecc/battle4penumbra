// =====================================================
// MAP RENDERER + INTERACTION (Fog of War, click, etc.)
// =====================================================

const MapRenderer = {
  canvas: null,
  ctx: null,
  size: 28,
  scale: 1.2,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
  lastX: 0,
  lastY: 0,
  game: null,
  hoverHex: null,

  init(canvasId, gameState) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.game = gameState;
    this._bindEvents();
    this.center();
    this.render();
  },

  setGame(gameState) {
    this.game = gameState;
    this.render();
  },

  axialToPixel(q, r) {
    const x = this.size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const y = this.size * (3 / 2 * r);
    return { x, y };
  },

  pixelToAxial(px, py) {
    // Inverse (approximate)
    const x = (px - this.offsetX) / this.scale;
    const y = (py - this.offsetY) / this.scale;
    const q = (Math.sqrt(3)/3 * x - 1/3 * y) / this.size;
    const r = (2/3 * y) / this.size;
    return this._hexRound(q, r);
  },

  _hexRound(q, r) {
    let s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);
    if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
    else if (rDiff > sDiff) rr = -rq - rs;
    return { q: rq, r: rr };
  },

  center() {
    const rect = this.canvas.getBoundingClientRect();
    this.offsetX = rect.width / 2;
    this.offsetY = rect.height / 2;
    // Auto-fit: mappa ~ radius 8 hex → diametro ~ 16*size*sqrt(3)
    // Vogliamo che stia nel canvas con un po' di margine
    const mapRadius = 9; // coordinate max circa
    const neededW = mapRadius * 2 * this.size * Math.sqrt(3);
    const neededH = mapRadius * 2 * this.size * 1.5;
    const fitScale = Math.min(
      (rect.width * 0.92) / Math.max(neededW, 1),
      (rect.height * 0.92) / Math.max(neededH, 1)
    );
    this.scale = Math.max(0.5, Math.min(fitScale, 2.5));
    this.size = 28;
  },

  render() {
    if (!this.canvas || !this.ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ctx = this.ctx;
    ctx.fillStyle = "#0D1B2A";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const human = this.game?.entities.find(e => e.isHuman);

    // Draw all known cells
    for (const [key, type] of CELL_TYPE) {
      const [q, r] = key.split(",").map(Number);
      // Montagne sempre visibili (sono molto alte)
      let visible = human ? this.game.isVisibleTo(human, q, r) : true;
      if (type === "mountain") visible = true;
      this._drawHex(q, r, type, visible);
    }

    // Draw units
    if (this.game) {
      for (const ent of this.game.entities) {
        for (const unit of ent.field) {
          // Sempre visibili le proprie unità; le altre solo se nella fog
          const isOwn = human && unit.ownerId === human.id;
          const visible = isOwn || (human ? this.game.isVisibleTo(human, unit.q, unit.r) : true);
          if (visible) this._drawUnit(unit, ent);
        }
      }
    }

    // Highlight selected
    if (this.game?.selectedUnit) {
      this._highlightHex(this.game.selectedUnit.q, this.game.selectedUnit.r, "#FFD54F");
    }
    if (this.hoverHex) {
      this._highlightHex(this.hoverHex.q, this.hoverHex.r, "#4FC3F7");
    }
  },

  _drawHex(q, r, type, visible) {
    const { x, y } = this.axialToPixel(q, r);
    const cx = x * this.scale + this.offsetX;
    const cy = y * this.scale + this.offsetY;
    const s = this.size * this.scale;

    const verts = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30);
      verts.push({
        x: cx + s * Math.cos(angle),
        y: cy + s * Math.sin(angle)
      });
    }

    const key = q + "," + r;
    // Scoperta = flippata (evento) OPPURE tempio proprio OPPURE montagna (sempre nota)
    let discovered = false;
    if (type === "mountain") discovered = true;
    if (this.game) {
      if (this.game.flippedCells && this.game.flippedCells.has(key)) discovered = true;
      const human = this.game.entities.find(e => e.isHuman);
      if (human && human.templeKey === key) discovered = true;
      if (key === "0,0" && visible) discovered = true;
    }

    let fill, stroke;
    if (!visible) {
      // FOG OF WAR: nera e "fumosa"
      fill = "#05070A";
      stroke = "#0A0E14";
    } else if (!discovered) {
      // Cella VISTA ma da scoprire: più chiara + "?"
      fill = "#4A6741";
      stroke = "#6B8F71";
    } else if (type === "mountain") {
      fill = "#5D4037"; stroke = "#3E2723";
    } else if (type === "plain") {
      fill = "#7CB342"; stroke = "#558B2F";
    } else if (type === "temple") {
      fill = "#5C6BC0"; stroke = "#3949AB";
    } else if (type === "city") {
      fill = "#FFD54F"; stroke = "#FF8F00";
    } else if (type === "cimitero") {
      fill = "#78909C"; stroke = "#546E7A";
    } else if (type === "rovine") {
      fill = "#A1887F"; stroke = "#6D4C41";
    } else if (type === "statua") {
      fill = "#90A4AE"; stroke = "#607D8B";
    } else if (type === "colosseo") {
      fill = "#FF8A65"; stroke = "#E64A19";
    } else if (type === "circolo") {
      fill = "#B39DDB"; stroke = "#7E57C2";
    } else if (type === "santuario") {
      fill = "#FFE082"; stroke = "#FFB300";
    } else if (type === "jungla") {
      fill = "#558B2F"; stroke = "#33691E";
    } else if (type === "villaggio") {
      fill = "#BCAAA4"; stroke = "#8D6E63";
    } else {
      fill = "#37474F"; stroke = "#263238";
    }

    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < 6; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(0.7, 1 * this.scale);
    ctx.stroke();

    // "?" sulle celle da scoprire (visibili ma non flippate)
    if (visible && !discovered && type !== "mountain") {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `bold ${Math.max(14, 18 * this.scale)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", cx, cy);
    }
    // Overlay fumoso sulla fog
    if (!visible) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(verts[i].x, verts[i].y);
      ctx.closePath();
      ctx.fill();
    }
    // Icone solo se cella scoperta (flippata) o tempio proprio
    if (visible && discovered) {
      if (type === "city") {
        ctx.fillStyle = "#D32F2F";
        ctx.font = `bold ${Math.max(12, 16 * this.scale)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★", cx, cy);
      } else if (type === "temple") {
        const t = TEMPLES[`${q},${r}`];
        if (t) {
          ctx.fillStyle = "#FFF";
          ctx.font = `bold ${Math.max(14, 18 * this.scale)}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(t.icon || t.label, cx, cy);
        }
      } else if (typeof SPECIAL_ZONES !== "undefined" && SPECIAL_ZONES[`${q},${r}`]) {
        const z = SPECIAL_ZONES[`${q},${r}`];
        ctx.fillStyle = "#FFF";
        ctx.font = `${Math.max(11, 14 * this.scale)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(z.icon || "", cx, cy);
      }
    }
  },

  _drawUnit(unit, owner) {
    const { x, y } = this.axialToPixel(unit.q, unit.r);
    const cx = x * this.scale + this.offsetX;
    const cy = y * this.scale + this.offsetY;
    const radius = this.size * this.scale * 0.45;

    const ctx = this.ctx;
    // Circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = owner.isHuman ? "#FFD54F" : "#42A5F5";
    ctx.fill();
    ctx.strokeStyle = owner.isHuman ? "#FF8F00" : "#1565C0";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Artefatto: corona dorata sopra
    if (owner.artifactAttachedTo === unit.instanceId || unit.hasArtifact || unit.type === "artefatto") {
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 3;
      ctx.stroke();
      // Corona
      ctx.font = `${Math.max(14, 18 * this.scale)}px "Segoe UI Emoji", "Apple Color Emoji", Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("👑", cx, cy - radius - 2);
    }

    // Shield badge
    if (unit.shields > 0) {
      ctx.fillStyle = "#42A5F5";
      ctx.beginPath();
      ctx.arc(cx + radius * 0.7, cy - radius * 0.7, 8 * this.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(8, 9 * this.scale)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(unit.shields), cx + radius * 0.7, cy - radius * 0.7);
    }

    // Icona tempio proprietario (sempre, con fallback)
    let tIcon = owner.templeIcon;
    if (!tIcon && owner.templeKey && typeof TEMPLES !== "undefined") {
      const t = TEMPLES[owner.templeKey];
      if (t) tIcon = t.icon || t.label;
    }
    if (tIcon) {
      ctx.font = `${Math.max(14, 18 * this.scale)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tIcon, cx, cy - radius * 0.5);
    }
    // ATK / PV in basso
    const atk = (unit.atk || 0) + (unit.permanentAtkBonus || 0);
    ctx.fillStyle = "#0D1B2A";
    ctx.font = `bold ${Math.max(11, 13 * this.scale)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${atk}/${unit.currentHp || unit.hp || 0}`, cx, cy + radius * 0.35);
  },

  _highlightHex(q, r, color) {
    const { x, y } = this.axialToPixel(q, r);
    const cx = x * this.scale + this.offsetX;
    const cy = y * this.scale + this.offsetY;
    const s = this.size * this.scale * 1.05;

    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30);
      const vx = cx + s * Math.cos(angle);
      const vy = cy + s * Math.sin(angle);
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  },

  _bindEvents() {
    const c = this.canvas;

    c.addEventListener("mousedown", e => {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    window.addEventListener("mouseup", () => this.isDragging = false);

    c.addEventListener("mousemove", e => {
      if (this.isDragging) {
        this.offsetX += e.clientX - this.lastX;
        this.offsetY += e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.render();
        return;
      }
      // Hover
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.hoverHex = this.pixelToAxial(mx, my);
      this.render();
    });

    c.addEventListener("click", e => {
      if (!this.game || this.game.phase !== "playing") return;
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { q, r } = this.pixelToAxial(mx, my);

      if (!CELL_TYPE.has(`${q},${r}`)) return;

      // Play card mode
      if (this.game.playMode && this.game.selectedCard) {
        const ok = this.game.playCardOnHex(q, r);
        if (ok && window.onGameUpdate) window.onGameUpdate();
        this.render();
        return;
      }

      // Move / Attack mode
      if (this.game.moveMode && this.game.selectedUnit) {
        const ok = this.game.tryMoveOrAttack(q, r);
        if (ok && window.onGameUpdate) window.onGameUpdate();
        this.render();
        return;
      }

      // Target mode (maledizioni)
      if (this.game.targetMode) {
        const anyUnit = this.game.getUnitAt(q, r);
        if (anyUnit) {
          this.game.selectTargetUnit(anyUnit);
          if (window.onGameUpdate) window.onGameUpdate();
          this.render();
          return;
        }
      }

      // Attach Artefatto a creatura propria
      if (this.game.attachMode && this.game.selectedCard && this.game.selectedCard.type === "artefatto") {
        const human = this.game.entities.find(e => e.isHuman);
        if (human) {
          const unit = human.field.find(u => u.q === q && u.r === r);
          if (unit) {
            this.game.attachArtifactToUnit(unit.instanceId);
            if (window.onGameUpdate) window.onGameUpdate();
            this.render();
            return;
          }
        }
      }

      // Select own unit
      const human = this.game.entities.find(e => e.isHuman);
      if (human && this.game.currentEntity.isHuman) {
        const unit = human.field.find(u => u.q === q && u.r === r);
        if (unit) {
          this.game.selectUnit(unit.instanceId);
          // Mostra dettaglio full screen
          if (typeof showCardDetail === "function") showCardDetail(unit, { fromField: true });
          if (window.onGameUpdate) window.onGameUpdate();
          this.render();
        }
      }
    });

    c.addEventListener("wheel", e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale = Math.min(Math.max(this.scale * delta, 0.4), 2.8);
      this.render();
    }, { passive: false });
  }
};
