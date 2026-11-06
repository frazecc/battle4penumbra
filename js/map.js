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
    // Bind eventi una sola volta (evita listener multipli tra una partita e l'altra)
    if (!this._eventsBound) {
      this._bindEvents();
      this._eventsBound = true;
    }
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
    // px/py in coordinate CSS del canvas (clientX - rect.left)
    const x = (px - this.offsetX) / this.scale;
    const y = (py - this.offsetY) / this.scale;
    const q = (Math.sqrt(3)/3 * x - 1/3 * y) / this.size;
    const r = (2/3 * y) / this.size;
    return this._hexRound(q, r);
  },

  /** Coordinate del mouse relative al canvas in spazio CSS */
  _eventToCanvasXY(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { mx: e.clientX - rect.left, my: e.clientY - rect.top };
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

    // Highlight selected unit
    if (this.game?.selectedUnit) {
      this._highlightHex(this.game.selectedUnit.q, this.game.selectedUnit.r, "#FFD54F");
    }

    // Pulse per caselle legali (0.2–0.45)
    const pulse = 0.22 + 0.18 * (0.5 + 0.5 * Math.sin(Date.now() / 280));

    // In modalità Muovi: tutte le celle raggiungibili (pathfinding)
    if (this.game?.moveMode && this.game.selectedUnit && !this.game.selectedUnit.isWithered) {
      const u = this.game.selectedUnit;
      const ent = this.game.currentEntity;
      if (typeof this.game.getReachableCells === "function" && ent) {
        const { cells, attackTargets } = this.game.getReachableCells(u, ent);
        for (const [key, info] of cells) {
          const [nq, nr] = key.split(",").map(Number);
          this._highlightHex(nq, nr, "#69F0AE");
          this._fillHexSoft(nq, nr, "rgba(105, 240, 174, " + pulse + ")");
        }
        for (const at of (attackTargets || [])) {
          this._highlightHex(at.q, at.r, "#EF5350");
          this._fillHexSoft(at.q, at.r, "rgba(239, 83, 80, " + pulse + ")");
        }
      }
      // Path in attesa / proposto
      const path = this.game.pendingMovePath && this.game.pendingMovePath.path;
      if (path && path.length) {
        this._drawMovePath(u.q, u.r, path);
      }
      if (!this._pulseScheduled) {
        this._pulseScheduled = true;
        requestAnimationFrame(() => {
          this._pulseScheduled = false;
          if (this.game?.moveMode || this.game?.pendingMovePath) this.render();
        });
      }
    }

    // In modalità Evoca / Play: evidenzia le caselle legali di piazzamento
    if (this.game?.playMode && this.game.selectedCard) {
      const card = this.game.selectedCard;
      const e = this.game.currentEntity;
      const t = (card.type || "").toLowerCase();
      let legal = [];

      if (t === "mostro" && e && e.templeKey) {
        const [tq, tr] = e.templeKey.split(",").map(Number);
        if (!this.game.getUnitAt(tq, tr) && CELL_TYPE.get(e.templeKey) !== "mountain") {
          legal.push([tq, tr]);
        }
      } else if (t === "mostrissimo") {
        // v023: usa la funzione dedicata (Tempio + celle sbloccate dai sacrifici)
        if (typeof this.game.getMostrissimoLegalCells === "function") {
          legal = this.game.getMostrissimoLegalCells();
        }
      }

      for (const [q, r] of legal) {
        this._highlightHex(q, r, "#FFD54F");
        this._fillHexSoft(q, r, "rgba(255, 213, 79, " + pulse + ")");
      }

      // Richiedi un nuovo frame per il lampeggio
      if (legal.length && !this._pulseScheduled) {
        this._pulseScheduled = true;
        requestAnimationFrame(() => {
          this._pulseScheduled = false;
          if (this.game?.playMode || this.game?.moveMode || this.game?.sacrificeMode) this.render();
        });
      }
    }

    // In modalità Sacrificio Mostrissimo: evidenzia le proprie creature sacrificabili (rosso/arancio)
    if (this.game?.sacrificeMode && this.game.currentEntity) {
      for (const u of this.game.currentEntity.field) {
        if (u.type === "mostro" || u.type === "mostrissimo") {
          this._highlightHex(u.q, u.r, "#FF7043");
          this._fillHexSoft(u.q, u.r, "rgba(255, 112, 67, " + pulse + ")");
        }
      }
      if (!this._pulseScheduled) {
        this._pulseScheduled = true;
        requestAnimationFrame(() => {
          this._pulseScheduled = false;
          if (this.game?.sacrificeMode) this.render();
        });
      }
    }

    
    // Passo obbligatorio post-teletrasporto: caselle di uscita legali (verde acqua)
    if (this.game?.pendingTeleportStep && this.game.pendingTeleportStep.legal) {
      for (const [q, r] of this.game.pendingTeleportStep.legal) {
        this._highlightHex(q, r, "#64FFDA");
        this._fillHexSoft(q, r, "rgba(100, 255, 218, " + pulse + ")");
      }
      // evidenzia anche l'unità bloccata sul TP
      const st = this.game.pendingTeleportStep;
      this._highlightHex(st.q, st.r, "#FFD54F");
      if (!this._pulseScheduled) {
        this._pulseScheduled = true;
        requestAnimationFrame(() => {
          this._pulseScheduled = false;
          if (this.game?.pendingTeleportStep) this.render();
        });
      }
    }

// Attach Artefatto: evidenzia le proprie creature
    if (this.game?.attachMode && this.game.currentEntity) {
      for (const u of this.game.currentEntity.field) {
        if (u.type === "mostro" || u.type === "mostrissimo" || u.id === "token_free") {
          this._highlightHex(u.q, u.r, "#CE93D8");
          this._fillHexSoft(u.q, u.r, "rgba(206, 147, 216, " + pulse + ")");
        }
      }
      if (!this._pulseScheduled) {
        this._pulseScheduled = true;
        requestAnimationFrame(() => {
          this._pulseScheduled = false;
          if (this.game?.attachMode) this.render();
        });
      }
    }

    if (this.hoverHex) {
      this._highlightHex(this.hoverHex.q, this.hoverHex.r, "#4FC3F7");
    }
  },


  _drawMovePath(sq, sr, path) {
    if (!path || !path.length || !this.ctx) return;
    const ctx = this.ctx;
    const pts = [];
    const p0 = this.axialToPixel(sq, sr);
    pts.push({ x: p0.x * this.scale + this.offsetX, y: p0.y * this.scale + this.offsetY });
    for (const [q, r] of path) {
      const p = this.axialToPixel(q, r);
      pts.push({ x: p.x * this.scale + this.offsetX, y: p.y * this.scale + this.offsetY });
      this._highlightHex(q, r, "#FFD54F");
      this._fillHexSoft(q, r, "rgba(255, 213, 79, 0.4)");
    }
    ctx.save();
    ctx.strokeStyle = "#FFD54F";
    ctx.lineWidth = Math.max(5, 6 * this.scale);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    // Numeri
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(10, 11 * this.scale), 0, Math.PI * 2);
      ctx.fillStyle = "#FFD54F";
      ctx.fill();
      ctx.fillStyle = "#1A1200";
      ctx.font = "bold " + Math.max(11, 13 * this.scale) + "px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i), p.x, p.y);
    }
    // Freccia
    if (pts.length >= 2) {
      const a = pts[pts.length - 2], b = pts[pts.length - 1];
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const size = Math.max(16, 18 * this.scale);
      ctx.fillStyle = "#FF6F00";
      ctx.beginPath();
      ctx.moveTo(b.x + 4 * Math.cos(ang), b.y + 4 * Math.sin(ang));
      ctx.lineTo(b.x - size * Math.cos(ang - 0.45), b.y - size * Math.sin(ang - 0.45));
      ctx.lineTo(b.x - size * Math.cos(ang + 0.45), b.y - size * Math.sin(ang + 0.45));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  },

  _fillHexSoft(q, r, color) {
    const { x, y } = this.axialToPixel(q, r);
    const cx = x * this.scale + this.offsetX;
    const cy = y * this.scale + this.offsetY;
    const s = this.size * this.scale;
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
    ctx.fillStyle = color;
    ctx.fill();
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
    if (unit.isWithered) {
      ctx.fillStyle = "#78909C"; // grigio per avvizzita
      ctx.strokeStyle = "#546E7A";
    } else {
      ctx.fillStyle = owner.isHuman ? "#FFD54F" : "#42A5F5";
      ctx.strokeStyle = owner.isHuman ? "#FF8F00" : "#1565C0";
    }
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();

    // Simbolo avvizzita
    if (unit.isWithered) {
      ctx.fillStyle = "#FFCCBC";
      ctx.font = `bold ${Math.max(10, 12 * this.scale)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Z", cx, cy);
    }

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

    c.addEventListener("contextmenu", e => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.game || this.game.phase !== "playing") return;
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { q, r } = this.pixelToAxial(mx, my);
      const unit = this.game.getUnitAt(q, r);
      if (unit && typeof showCardDetail === "function") {
        const owner = this.game.getEntityById(unit.ownerId);
        const isOwn = owner && owner.isHuman;
        showCardDetail(unit, { fromField: !!isOwn, readOnly: !isOwn });
        return;
      }
      const type = CELL_TYPE.get(q + "," + r);
      if (type && typeof showCardDetail === "function") {
        const name = (this.game.tileDisplayName && this.game.tileDisplayName(type)) || type;
        showCardDetail({
          name: name,
          type: "tessera",
          color: "-",
          cost: "-",
          effect: "Tipo di cella: " + name + " (" + q + "," + r + ")"
        }, { readOnly: true });
      }
    });

    c.addEventListener("click", e => {
      if (!this.game) return;
      if (this.game.phase !== "playing" && this.game.phase !== "ended") return;
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { q, r } = this.pixelToAxial(mx, my);
      if (!CELL_TYPE.has(`${q},${r}`)) return;

      // Flag: questo click non deve MAI aprire l'anteprima (dopo attach/move)
      let suppressPreview = false;

      if (this.game.phase === "playing") {
        // 0a) Passo obbligatorio post-teletrasporto
        if (this.game.pendingTeleportStep) {
          this.game.completeTeleportStep(q, r);
          if (typeof closeCardDetail === "function") closeCardDetail();
          if (window.onGameUpdate) window.onGameUpdate();
          this.render();
          return;
        }

        // 0) Modalità Sacrificio Mostrissimo: clic su creatura propria → sacrifica
        if (this.game.sacrificeMode) {
          const human = this.game.entities.find(e => e.isHuman);
          if (human && this.game.currentEntity && this.game.currentEntity.isHuman) {
            const unit = human.field.find(u => u.q === q && u.r === r);
            if (unit) {
              this.game.sacrificeUnitForMostrissimo(unit);
              if (typeof closeCardDetail === "function") closeCardDetail();
              if (window.onGameUpdate) window.onGameUpdate();
              this.render();
              return;
            }
          }
        }

        // 1) Giocare una carta sulla cella
        if (this.game.playMode && this.game.selectedCard) {
          this.game.playCardOnHex(q, r);
          if (typeof closeCardDetail === "function") closeCardDetail();
          if (window.onGameUpdate) window.onGameUpdate();
          this.render();
          return;
        }

        // 2) Modalità Muovi / Attacca
        if (this.game.moveMode && this.game.selectedUnit) {
          const ok = this.game.tryMoveOrAttack(q, r);
          if (typeof closeCardDetail === "function") closeCardDetail();
          // Esci da moveMode solo se il movimento/attacco è andato a buon fine
          if (ok) {
            this.game.selectedUnit = null;
            this.game.moveMode = false;
            suppressPreview = true;
          }
          if (window.onGameUpdate) window.onGameUpdate();
          this.render();
          return;
        }

        // 3) Bersaglio maledizione
        if (this.game.targetMode) {
          const anyUnit = this.game.getUnitAt(q, r);
          if (anyUnit) {
            this.game.selectTargetUnit(anyUnit);
            if (typeof closeCardDetail === "function") closeCardDetail();
            if (window.onGameUpdate) window.onGameUpdate();
            this.render();
            return;
          }
        }

        // 4) Lega Artefatto — SOLO attach, niente anteprima
        if (this.game.attachMode && this.game.selectedCard && this.game.selectedCard.type === "artefatto") {
          const human = this.game.entities.find(e => e.isHuman);
          if (human) {
            const unit = human.field.find(u => u.q === q && u.r === r);
            if (unit) {
              this.game.attachArtifactToUnit(unit.instanceId);
              this.game.selectedUnit = null;
              this.game.moveMode = false;
              this.game.attachMode = false;
              this.game.selectedCard = null;
              if (typeof closeCardDetail === "function") closeCardDetail();
              suppressPreview = true;
              if (window.onGameUpdate) window.onGameUpdate();
              this.render();
              return;
            }
          }
        }

        // 5) Click su creatura propria → SOLO anteprima (mai moveMode)
        if (!suppressPreview) {
          const human = this.game.entities.find(e => e.isHuman);
          if (human && this.game.currentEntity && this.game.currentEntity.isHuman &&
              !this.game.moveMode && !this.game.playMode && !this.game.attachMode && !this.game.targetMode && !this.game.sacrificeMode) {
            const unit = human.field.find(u => u.q === q && u.r === r);
            if (unit) {
              this.game.selectedUnit = unit;
              this.game.selectedCard = null;
              this.game.moveMode = false;
              if (typeof showCardDetail === "function") showCardDetail(unit, { fromField: true });
              if (window.onGameUpdate) window.onGameUpdate();
              this.render();
              return;
            }
          }
        }
      }

      // 6) Dettagli creatura (alleata o nemica visibile) — mai durante un'azione
      if (suppressPreview) return;
      const inActionMode = this.game.moveMode || this.game.playMode || this.game.attachMode || this.game.targetMode || this.game.sacrificeMode || this.game.pendingTeleportStep;
      if (!inActionMode) {
        const anyUnit = this.game.getUnitAt(q, r);
        if (anyUnit) {
          const human = this.game.entities.find(e => e.isHuman);
          const isOwn = human && anyUnit.ownerId === human.id;
          const visible = isOwn || (human ? this.game.isVisibleTo(human, anyUnit.q, anyUnit.r) : true);
          if (visible && typeof showCardDetail === "function") {
            const readOnly = this.game.phase === "ended" || !isOwn;
            showCardDetail(anyUnit, { fromField: true, readOnly: readOnly });
          }
        }
      }
    });

    c.addEventListener("wheel", e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale = Math.min(Math.max(this.scale * delta, 0.25), 3.0);
      this.render();
    }, { passive: false });
  }
};
