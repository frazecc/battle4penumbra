// =====================================================
// MAP RENDERER + INTERACTION (Fog of War, click, etc.)
// =====================================================

var MapRenderer = {
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


  _isMountain(q, r) {
    return CELL_TYPE.get(q + "," + r) === "mountain";
  },

  _mountainNeighborDirs(q, r) {
    const dirs = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
    return dirs.filter(([dq, dr]) => this._isMountain(q + dq, r + dr));
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

    // Montagne: ombreggiatura + picchi
    if (type === "mountain" && (visible || true)) {
      const grd = ctx.createLinearGradient(cx, cy - s, cx, cy + s);
      grd.addColorStop(0, "#8D6E63");
      grd.addColorStop(0.45, "#5D4037");
      grd.addColorStop(1, "#3E2723");
      ctx.fillStyle = visible ? grd : "#2A1C18";
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(verts[i].x, verts[i].y);
      ctx.closePath();
      ctx.fill();
      // Picchi
      if (visible) {
        const nCount = this._mountainNeighborDirs(q, r).length;
        ctx.fillStyle = nCount >= 3 ? "#BCAAA4" : "#D7CCC8";
        ctx.strokeStyle = "#4E342E";
        ctx.lineWidth = Math.max(1, 1.2 * this.scale);
        // Meno picchi isolati se è in mezzo alla catena
        const peaks = nCount >= 4
          ? [[cx, cy - s * 0.22]]
          : [[cx, cy - s * 0.35], [cx - s * 0.28, cy + s * 0.05], [cx + s * 0.3, cy + s * 0.02]];
        peaks.forEach(([px, py], i) => {
          const h = s * (0.28 - i * 0.04);
          const w = s * 0.16;
          ctx.beginPath();
          ctx.moveTo(px, py - h);
          ctx.lineTo(px - w, py + h * 0.35);
          ctx.lineTo(px + w, py + h * 0.35);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
      }
    }

    // Catena montuosa: tratti interni tra montagne adiacenti quasi invisibili
    if (type === "mountain") {
      const dirs = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
      // vertici hex flat-top: i=0..5 corrispondono ai lati verso dirs in ordine pointy-top offset
      // Usiamo approssimazione: per ogni vicino montagna, non ridisegnare bordo condiviso
      ctx.lineWidth = Math.max(1.2, 1.8 * this.scale);
      for (let i = 0; i < 6; i++) {
        const [dq, dr] = dirs[i];
        const nq = q + dq, nr = r + dr;
        const shared = this._isMountain(nq, nr);
        const a = verts[i];
        const b = verts[(i + 1) % 6];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        if (shared) {
          ctx.strokeStyle = "rgba(62, 39, 35, 0.15)";
          ctx.lineWidth = Math.max(0.5, 0.7 * this.scale);
        } else {
          ctx.strokeStyle = "#2C1810";
          ctx.lineWidth = Math.max(1.5, 2.2 * this.scale);
        }
        ctx.stroke();
      }
      // Cresta continua verso i vicini montagna
      if (visible) {
        const neigh = this._mountainNeighborDirs(q, r);
        ctx.strokeStyle = "rgba(215, 204, 200, 0.55)";
        ctx.lineWidth = Math.max(1.2, 1.6 * this.scale);
        neigh.forEach(([dq, dr]) => {
          const p2 = this.axialToPixel(q + dq, r + dr);
          const x2 = p2.x * this.scale + this.offsetX;
          const y2 = p2.y * this.scale + this.offsetY;
          ctx.beginPath();
          ctx.moveTo(cx, cy - s * 0.15);
          ctx.lineTo(x2, y2 - s * 0.15);
          ctx.stroke();
        });
      }
    }


    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(0.7, 1 * this.scale);
    ctx.stroke();

    // "?" sulle celle da scoprire (visibili ma non flippate)
    if (visible && !discovered && type !== "mountain" && type !== "city") {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `bold ${Math.max(14, 18 * this.scale)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("?", cx, cy);
    }
    // Overlay fumoso sulla fog (l'Altare tiene il bordo dorato sopra)
    if (!visible) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(verts[i].x, verts[i].y);
      ctx.closePath();
      ctx.fill();
    }

    // Altare: bordo dorato SEMPRE (anche in fog)
    if (type === "city" || (q === 0 && r === 0)) {
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < 6; i++) ctx.lineTo(verts[i].x, verts[i].y);
      ctx.closePath();
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = Math.max(2.5, 3.2 * this.scale);
      ctx.stroke();
      ctx.strokeStyle = "#FFF8E1";
      ctx.lineWidth = Math.max(1, 1.2 * this.scale);
      ctx.stroke();
      if (!visible) {
        // piccola stella affievolita
        ctx.fillStyle = "rgba(255, 215, 0, 0.55)";
        ctx.font = `bold ${Math.max(11, 14 * this.scale)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★", cx, cy);
      }
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
          // Alone colorato sotto l'icona per visibilità
          ctx.beginPath();
          ctx.arc(cx, cy, this.size * this.scale * 0.42, 0, Math.PI * 2);
          ctx.fillStyle = (t.color || "#FFD54F") + "55";
          ctx.fill();
          ctx.strokeStyle = t.color || "#FFD54F";
          ctx.lineWidth = Math.max(2, 2.5 * this.scale);
          ctx.stroke();
          ctx.fillStyle = "#FFF";
          ctx.font = `${Math.max(22, 28 * this.scale)}px "Segoe UI Emoji","Apple Color Emoji",Arial`;
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
    const s = this.size * this.scale;
    const ctx = this.ctx;
    // Carta in miniatura (rettangolo)
    const w = s * 1.15;
    const h = s * 1.35;
    const left = cx - w / 2;
    const top = cy - h / 2;
    const isHumanOwner = owner && owner.isHuman;
    const isFallen = owner && owner.isFallen;
    const border = isFallen ? "#78909C" : (isHumanOwner ? "#FFD54F" : "#EF5350");
    const fill = isFallen ? "#37474F" : (isHumanOwner ? "#1B3A4B" : "#3E1F1F");

    // Ombra
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(left + 2, top + 2, w, h);

    // Corpo carta
    ctx.fillStyle = fill;
    ctx.strokeStyle = border;
    ctx.lineWidth = Math.max(2, 2.2 * this.scale);
    const r = Math.max(4, 5 * this.scale);
    ctx.beginPath();
    ctx.moveTo(left + r, top);
    ctx.arcTo(left + w, top, left + w, top + h, r);
    ctx.arcTo(left + w, top + h, left, top + h, r);
    ctx.arcTo(left, top + h, left, top, r);
    ctx.arcTo(left, top, left + w, top, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Striscia colore in alto
    let col = "#90A4AE";
    if (unit.color === "white") col = "#ECEFF1";
    else if (unit.color === "red") col = "#EF5350";
    else if (unit.color === "black") col = "#7E57C2";
    else if (unit.color === "blue") col = "#42A5F5";
    else if (unit.color === "green") col = "#66BB6A";
    else if (unit.color === "yellow") col = "#FFD54F";
    ctx.fillStyle = col;
    ctx.fillRect(left + 2, top + 2, w - 4, h * 0.18);

    // Icona tempio proprietario
    let tIcon = owner.templeIcon;
    if (!tIcon && owner.templeKey && typeof TEMPLES !== "undefined") {
      const t = TEMPLES[owner.templeKey];
      if (t) tIcon = t.icon || t.label;
    }
    if (tIcon) {
      ctx.font = Math.max(14, 16 * this.scale) + "px \"Segoe UI Emoji\",\"Apple Color Emoji\",Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tIcon, cx, top + h * 0.42);
    }

    // (v037: niente nome sulla mini-carta — troppo congestionato)

    // ATK basso sx, PV basso dx
    const atk = (unit.atk || 0) + (unit.permanentAtkBonus || 0);
    const hp = unit.currentHp !== undefined ? unit.currentHp : (unit.hp || 0);
    const pad = Math.max(4, 5 * this.scale);
    ctx.font = "bold " + Math.max(10, 12 * this.scale) + "px Arial";
    ctx.textBaseline = "bottom";
    ctx.fillStyle = "#FFAB91";
    ctx.textAlign = "left";
    ctx.fillText(String(atk), left + pad, top + h - pad + 1);
    ctx.fillStyle = "#A5D6A7";
    ctx.textAlign = "right";
    ctx.fillText(String(hp), left + w - pad, top + h - pad + 1);

    // Scudi
    if (unit.shields > 0) {
      ctx.fillStyle = "#42A5F5";
      ctx.beginPath();
      ctx.arc(left + w - pad, top + h * 0.28, Math.max(7, 8 * this.scale), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold " + Math.max(8, 9 * this.scale) + "px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(unit.shields), left + w - pad, top + h * 0.28);
    }

    // Avvizzita
    if (unit.isWithered) {
      ctx.fillStyle = "rgba(255,138,101,0.35)";
      ctx.fillRect(left, top, w, h);
      ctx.fillStyle = "#FFCCBC";
      ctx.font = "bold " + Math.max(9, 10 * this.scale) + "px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Z", cx, cy);
    }

    // Artefatto
    if (owner.artifactAttachedTo === unit.instanceId || unit.hasArtifact) {
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(left - 1, top - 1, w + 2, h + 2);
      ctx.font = Math.max(12, 14 * this.scale) + "px \"Segoe UI Emoji\",Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("👑", cx, top - 1);
    }
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
    if (!c) return;

    if (this._boundHandlers) {
      const h = this._boundHandlers;
      c.removeEventListener("mousedown", h.down);
      window.removeEventListener("mouseup", h.up);
      c.removeEventListener("mousemove", h.move);
      c.removeEventListener("click", h.click);
      c.removeEventListener("contextmenu", h.ctx);
      c.removeEventListener("wheel", h.wheel);
    }

    const self = this;
    const handlers = {};
    handlers.down = (e) => {
      if (e.button !== 0) return;
      self.isDragging = true;
      self._dragMoved = false;
      self.lastX = e.clientX;
      self.lastY = e.clientY;
    };
    handlers.up = () => { self.isDragging = false; };
    handlers.move = (e) => {
      if (self.isDragging) {
        const dx = e.clientX - self.lastX;
        const dy = e.clientY - self.lastY;
        if (Math.abs(dx) + Math.abs(dy) > 4) self._dragMoved = true;
        self.offsetX += dx;
        self.offsetY += dy;
        self.lastX = e.clientX;
        self.lastY = e.clientY;
        self.render();
        return;
      }
      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      self.hoverHex = self.pixelToAxial(mx, my);
      self.render();
    };
    handlers.ctx = (e) => { e.preventDefault(); e.stopPropagation(); };
    handlers.wheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      self.scale = Math.min(Math.max(self.scale * delta, 0.78), 2.8);
      self.render();
    };
    handlers.click = (e) => {
      if (e.button !== 0) return;
      if (self._dragMoved) return;
      const g = self.game || (typeof window !== "undefined" ? window.game : null);
      if (!g) return;
      if (g.phase !== "playing" && g.phase !== "ended") return;

      const rect = c.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { q, r } = self.pixelToAxial(mx, my);
      if (!CELL_TYPE.has(q + "," + r)) return;

      if (g.phase !== "playing") return;

      if (g.pendingTeleportStep) {
        g.completeTeleportStep(q, r);
        if (window.onGameUpdate) window.onGameUpdate();
        self.render();
        return;
      }
      if (g.sacrificeMode) {
        const human = g.entities.find(en => en.isHuman);
        if (human && g.currentEntity && g.currentEntity.isHuman) {
          const unit = human.field.find(u => u.q === q && u.r === r);
          if (unit) {
            g.sacrificeUnitForMostrissimo(unit);
            if (window.onGameUpdate) window.onGameUpdate();
            self.render();
            return;
          }
        }
      }
      if (g.playMode && g.selectedCard) {
        g.playCardOnHex(q, r);
        if (typeof closeCardDetail === "function") closeCardDetail();
        if (window.onGameUpdate) window.onGameUpdate();
        self.render();
        return;
      }
      if (g.moveMode && g.selectedUnit) {
        const ok = g.tryMoveOrAttack(q, r);
        if (typeof closeCardDetail === "function") closeCardDetail();
        if (ok && !g.pendingMovePath) {
          g.selectedUnit = null;
          g.moveMode = false;
        }
        if (window.onGameUpdate) window.onGameUpdate();
        self.render();
        return;
      }
      if (g.targetMode) {
        const anyUnit = g.getUnitAt(q, r);
        if (anyUnit) {
          g.selectTargetUnit(anyUnit);
          if (typeof closeCardDetail === "function") closeCardDetail();
          if (window.onGameUpdate) window.onGameUpdate();
          self.render();
          return;
        }
      }
      if (g.attachMode && g.selectedCard && g.selectedCard.type === "artefatto") {
        const human = g.entities.find(en => en.isHuman);
        if (human) {
          const unit = human.field.find(u => u.q === q && u.r === r);
          if (unit) {
            g.attachArtifactToUnit(unit.instanceId);
            g.selectedUnit = null;
            g.moveMode = false;
            g.attachMode = false;
            g.selectedCard = null;
            if (typeof closeCardDetail === "function") closeCardDetail();
            if (window.onGameUpdate) window.onGameUpdate();
            self.render();
            return;
          }
        }
      }

      // Ispezione: fog = nulla (eccezione Altare)
      if (g.moveMode || g.playMode || g.attachMode || g.targetMode || g.sacrificeMode || g.pendingTeleportStep) return;
      const human = g.entities.find(en => en.isHuman);
      if (!human) return;
      const anyUnit = g.getUnitAt(q, r);
      const cellType = CELL_TYPE.get(q + "," + r);
      const isAltar = cellType === "city" || (q === 0 && r === 0);
      const isMountain = cellType === "mountain";
      const onOwnUnit = !!(anyUnit && anyUnit.ownerId === human.id);
      const visible = isMountain ? true : !!g.isVisibleTo(human, q, r);
      // Fog: nulla, eccezioni Altare + Montagne (sempre ispezionabili)
      if (!visible && !isAltar && !onOwnUnit && !isMountain) return;
      if (typeof window.onHexInspect === "function") {
        try {
          if (isAltar && !g.isVisibleTo(human, q, r) && !onOwnUnit) {
            window.onHexInspect(q, r, null, { altarFog: true });
          } else if (isMountain) {
            window.onHexInspect(q, r, null, { mountain: true });
          } else {
            const showUnit = anyUnit && (onOwnUnit || g.isVisibleTo(human, q, r)) ? anyUnit : null;
            window.onHexInspect(q, r, showUnit);
          }
        } catch (err) {
          console.error("onHexInspect error", err);
        }
      }
      self.render();
    };

    this._boundHandlers = handlers;
    c.addEventListener("mousedown", handlers.down);
    window.addEventListener("mouseup", handlers.up);
    c.addEventListener("mousemove", handlers.move);
    c.addEventListener("click", handlers.click);
    c.addEventListener("contextmenu", handlers.ctx);
    c.addEventListener("wheel", handlers.wheel, { passive: false });
  }
}


window.MapRenderer = MapRenderer;
