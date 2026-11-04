// =====================================================
// MAIN APPLICATION (Fasi 0-6)
// =====================================================

let game = null;
let currentScreen = "auth";

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const el = document.getElementById("screen-" + id);
  if (el) {
    el.classList.add("active");
    currentScreen = id;
  }
}

// ---------- AUTH ----------
function initAuth() {
  const session = getSession();
  if (session) {
    if (needsSessionConfirm()) showSessionConfirm(session);
    else enterApp(session);
  } else {
    showScreen("auth");
  }
}

function showSessionConfirm(session) {
  showScreen("auth");
  document.getElementById("auth-forms").classList.add("hidden");
  document.getElementById("session-confirm").classList.remove("hidden");
  document.getElementById("session-username").textContent = session.username;
}

function enterApp(user) {
  document.getElementById("display-username").textContent = user.username;
  showScreen("home");
}

document.getElementById("btn-show-login")?.addEventListener("click", () => {
  document.getElementById("form-login").classList.remove("hidden");
  document.getElementById("form-register").classList.add("hidden");
  document.getElementById("btn-show-login").classList.add("active");
  document.getElementById("btn-show-register").classList.remove("active");
  hideAuthError();
});

document.getElementById("btn-show-register")?.addEventListener("click", () => {
  document.getElementById("form-register").classList.remove("hidden");
  document.getElementById("form-login").classList.add("hidden");
  document.getElementById("btn-show-register").classList.add("active");
  document.getElementById("btn-show-login").classList.remove("active");
  hideAuthError();
});

document.getElementById("form-login")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const res = login(document.getElementById("login-username").value, document.getElementById("login-password").value);
  if (res.ok) enterApp(res.user);
  else showAuthError(res.error);
});

document.getElementById("form-register")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const res = register(document.getElementById("reg-username").value, document.getElementById("reg-password").value);
  if (res.ok) enterApp(res.user);
  else showAuthError(res.error);
});

document.getElementById("btn-sono-io")?.addEventListener("click", () => {
  const session = getSession();
  if (session) {
    session.loginAt = Date.now();
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    enterApp(session);
  }
});

document.getElementById("btn-non-sono-io")?.addEventListener("click", () => {
  logout();
  document.getElementById("session-confirm").classList.add("hidden");
  document.getElementById("auth-forms").classList.remove("hidden");
});

document.getElementById("btn-logout")?.addEventListener("click", () => {
  logout();
  showScreen("auth");
  document.getElementById("session-confirm").classList.add("hidden");
  document.getElementById("auth-forms").classList.remove("hidden");
});

function showAuthError(msg) {
  const el = document.getElementById("auth-error");
  el.textContent = msg;
  el.classList.add("show");
}
function hideAuthError() {
  document.getElementById("auth-error")?.classList.remove("show");
}

// ---------- HOME & SETUP ----------
document.getElementById("btn-partita-base")?.addEventListener("click", () => {
  showScreen("setup");
  updateSetupSummary();
});

let setupFallen = 0;

function updateSetupSummary() {
  const ai = 3 - setupFallen;
  const el = document.getElementById("setup-summary");
  if (el) {
    el.innerHTML = "<strong>Composizione:</strong> 1 Umano + " + ai + " IA + " + setupFallen + " Templi Caduti<br><span style=\"color:var(--accent2)\">Totale entità: 4 (sempre)</span>";
  }
  const valFallen = document.getElementById("val-fallen");
  if (valFallen) valFallen.textContent = setupFallen;
}

document.getElementById("fallen-minus")?.addEventListener("click", () => { setupFallen = Math.max(0, setupFallen-1); updateSetupSummary(); });
document.getElementById("fallen-plus")?.addEventListener("click", () => { setupFallen = Math.min(2, setupFallen+1); updateSetupSummary(); });

document.getElementById("btn-start-draft")?.addEventListener("click", () => {
  const user = getCurrentUser();
  const numAI = 3 - setupFallen;
  game = new GameState({
    humanName: user?.username || "Giocatore",
    numAI: numAI,
    numFallenTemples: setupFallen
  });
  game.startDraft();
  renderDraft();
  showScreen("draft");
});

document.getElementById("btn-back-home")?.addEventListener("click", () => showScreen("home"));

// ---------- DRAFT ----------
function renderDraft() {
  if (!game || !game.draft) return;
  const picker = game.getDraftCurrentPicker();
  const statusEl = document.getElementById("draft-status");
  const turnEl = document.getElementById("draft-turn-info");

  if (!picker || game.draft.currentPick >= game.draft.totalPicksNeeded) {
    statusEl.textContent = "Draft completato!";
    turnEl.textContent = "Avvio partita...";
    return;
  }

  statusEl.textContent = "Scelta di: " + picker.name;
  turnEl.textContent = "Bustina " + (game.draft.currentPick + 1) + " di " + game.draft.totalPicksNeeded +
    " — Scegli una bustina (colore). Le carte restano nascoste.";

  const container = document.getElementById("packs-container");
  container.innerHTML = "";
  game.draft.packs.forEach((pack, pi) => {
    const packEl = document.createElement("div");
    packEl.className = "pack pack-sealed" + (picker.isHuman ? " active-pack" : "");
    packEl.style.cursor = picker.isHuman ? "pointer" : "default";

    // Solo colore della bustina, niente carte visibili
    packEl.innerHTML =
      '<div class="pack-sealed-inner color-bg-' + pack.color + '">' +
        '<div class="pack-sealed-label">BUSTINA</div>' +
        '<div class="pack-sealed-color">' + (COLOR_NAMES[pack.color] || pack.color) + '</div>' +
        '<div class="pack-sealed-hint">3 carte nascoste</div>' +
      '</div>' +
      (picker.isHuman ? '<button class="btn btn-primary" style="width:100%;margin-top:12px;">Scegli questa bustina</button>' : '');

    if (picker.isHuman) {
      packEl.addEventListener("click", () => {
        game.draftPickPack(pi);
        renderDraft();
        if (game.phase === "playing") startGameUI();
      });
    }
    container.appendChild(packEl);
  });

  // Durante il draft NON si vedono le carte di nessuno
  const picksEl = document.getElementById("player-picks");
  if (picksEl) {
    picksEl.innerHTML = "";
    picksEl.style.display = "none";
  }

  // AI auto
  if (picker && !picker.isHuman && game.draft.currentPick < game.draft.totalPicksNeeded) {
    setTimeout(() => {
      game._processAIDraftPacks();
      renderDraft();
      if (game.phase === "playing") startGameUI();
    }, 700);
  }
}


// ---------- GAME UI ----------
function startGameUI() {
  showScreen("game");
  MapRenderer.init("gameCanvas", game);
  setTimeout(() => { MapRenderer.center(); MapRenderer.render(); }, 50);
  renderGameState();
  if (game && !game.currentEntity.isHuman) {
    setTimeout(() => game.runAITurn(), 900);
  }
}

// ---------- TRAP POPUP ----------
window.onTrapPrompt = function(pending) {
  const modal = document.getElementById("trap-modal");
  const list = document.getElementById("trap-options");
  const title = document.getElementById("trap-title");
  if (!modal || !list) return;
  title.textContent = "Trappola disponibile! (" + pending.trigger + ")";
  list.innerHTML = "";
  pending.options.forEach(t => {
    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.style.width = "100%";
    btn.style.marginBottom = "8px";
    btn.textContent = t.name + " (costo " + t.cost + ") – " + (t.effect || "").substring(0, 50);
    btn.onclick = () => {
      if (game) {
        game.activatePendingTrap(t.instanceId);
        modal.classList.add("hidden");
        modal.style.display = "none";
        if (window.onGameUpdate) window.onGameUpdate();
      }
    };
    list.appendChild(btn);
  });
  const skip = document.createElement("button");
  skip.className = "btn";
  skip.style.width = "100%";
  skip.textContent = "Ignora";
  skip.onclick = () => {
    if (game) game.declinePendingTrap();
    modal.classList.add("hidden");
    modal.style.display = "none";
  };
  list.appendChild(skip);
  modal.classList.remove("hidden");
  modal.style.display = "flex";
};

// ---------- MOSTRISSIMI PANEL ----------
function renderMostrissimi() {
  const el = document.getElementById("mostrissimi-panel");
  if (!el || !game) return;
  el.innerHTML = "<div style=\"font-weight:700;color:var(--accent);margin-bottom:8px;\">Mostrissimi (Pool)</div>";
  (game.mostrissimiPool || []).forEach(m => {
    const div = document.createElement("div");
    div.className = "hand-card";
    div.style.marginBottom = "8px";
    div.innerHTML =
      "<div class=\"name\"><span class=\"color-dot color-" + m.color + "\"></span>" + m.name + "</div>" +
      "<div class=\"meta\">Sac " + m.sacrifice + " • " + m.atk + "/" + m.hp + "</div>" +
      "<div class=\"meta\" style=\"font-size:0.7rem;\">" + (m.effect||"").substring(0,40) + "...</div>";
    div.onclick = () => {
      if (!game.currentEntity.isHuman) return;
      game.addLog("Selezionato Mostrissimo: " + m.name + ". Clicca Altare/Tempio/Circolo (servono " + m.sacrifice + " sacrifici).");
      game.selectedCard = { ...m, instanceId: m.instanceId + "_sum_" + Date.now() };
      game.playMode = true;
      game.moveMode = false;
      game.selectedUnit = null;
      if (window.onGameUpdate) window.onGameUpdate();
    };
    el.appendChild(div);
  });
}

function openGraveyard(entityId) {
  if (!game) return;
  const e = game.entities.find(x => x.id === entityId);
  if (!e) return;
  const modal = document.getElementById("grave-modal");
  const list = document.getElementById("grave-list");
  const title = document.getElementById("grave-title");
  if (!modal || !list) return;
  title.textContent = "Cimitero di " + e.name + " (" + e.graveyard.length + " carte)";
  list.innerHTML = "";
  if (!e.graveyard.length) {
    list.innerHTML = "<p style=\"color:var(--text-dim)\">Nessuna carta al cimitero.</p>";
  } else {
    e.graveyard.forEach((c) => {
      const div = document.createElement("div");
      div.className = "grave-card";
      div.innerHTML = "<span class=\"color-dot color-" + (c.color||"yellow") + "\"></span> <strong>" + c.name + "</strong> <span style=\"color:var(--text-dim);font-size:0.8rem\">" + (c.type||"") + " · costo " + (c.cost||0) + "</span>";
      div.onclick = () => showCardDetail(c);
      list.appendChild(div);
    });
  }
  modal.classList.remove("hidden");
  modal.style.display = "flex";
}

function closeCardDetail() {
  const modal = document.getElementById("card-detail-modal");
  if (modal) { modal.classList.add("hidden"); modal.style.display = "none"; }
}

function showCardDetail(card, opts) {
  if (!card) return;
  opts = opts || {};
  const modal = document.getElementById("card-detail-modal");
  if (!modal) return;
  const nameEl = document.getElementById("card-detail-name");
  const bodyEl = document.getElementById("card-detail-body");
  nameEl.textContent = card.name || "Carta";
  const atk = (card.atk !== undefined) ? ((card.atk||0) + (card.permanentAtkBonus||0)) : null;
  const hp = card.currentHp !== undefined ? card.currentHp : card.hp;
  const isFieldUnit = !!(opts.fromField && card.q !== undefined && card.r !== undefined);
  const fromHand = !!opts.fromHand;
  const t = (card.type || "").toLowerCase();

  bodyEl.innerHTML =
    "<p><strong>Tipo:</strong> " + (card.type || "-") + "</p>" +
    "<p><strong>Colore:</strong> " + (card.color || "-") + "</p>" +
    "<p><strong>Costo:</strong> " + (card.currentCost !== undefined ? card.currentCost : (card.cost||0)) + "</p>" +
    (atk !== null ? "<p><strong>ATK / PV:</strong> " + atk + " / " + (hp||0) + (card.shields ? " · Scudi " + card.shields : "") + "</p>" : "") +
    (card.sacrifice ? "<p><strong>Sacrifici:</strong> " + card.sacrifice + "</p>" : "") +
    (isFieldUnit ? "<p><strong>Posizione:</strong> (" + card.q + "," + card.r + ")</p>" : "") +
    "<p style=\"margin-top:12px;line-height:1.6\"><strong>Effetto:</strong><br>" + (card.effect || "Nessuno") + "</p>";

  let actions = document.getElementById("card-detail-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.id = "card-detail-actions";
    actions.style.cssText = "display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;";
    bodyEl.parentNode.appendChild(actions);
  }
  actions.innerHTML = "";

  const canAct = !!(game && game.currentEntity && game.currentEntity.isHuman && game.phase === "playing");

  function addBtn(label, primary, fn, disabled, title) {
    const b = document.createElement("button");
    b.className = "btn" + (primary ? " btn-primary" : "");
    b.style.flex = "1";
    b.style.minWidth = "120px";
    b.textContent = label;
    if (disabled) {
      b.disabled = true;
      b.style.opacity = "0.5";
      b.style.cursor = "not-allowed";
      if (title) b.title = title;
    } else {
      b.onclick = fn;
    }
    actions.appendChild(b);
  }

  if (isFieldUnit && canAct) {
    // Spiegazione se non può muoversi
    let moveBlocked = false;
    let moveReason = "";
    if (game && typeof game.isCellDiscovered === "function") {
      if (!game.isCellDiscovered(card.q, card.r, game.currentEntity)) {
        moveBlocked = true;
        moveReason = "Cella non ancora scoperta: non puoi muoverti oltre in questo turno (si scopre a fine turno).";
      }
    }
    if (moveBlocked) {
      const note = document.createElement("p");
      note.style.cssText = "width:100%;color:#FFB74D;font-size:0.9rem;margin:0 0 8px 0;";
      note.textContent = moveReason;
      actions.appendChild(note);
    }
    addBtn("Annulla", false, () => {
      game.selectedUnit = null;
      game.moveMode = false;
      closeCardDetail();
      renderGameState();
      if (typeof MapRenderer !== "undefined") MapRenderer.render();
    });
    addBtn("Muovi", true, () => {
      if (card.instanceId) game.selectUnit(card.instanceId);
      closeCardDetail();
      renderGameState();
      if (typeof MapRenderer !== "undefined") MapRenderer.render();
    }, moveBlocked, moveReason);
  } else if (fromHand && canAct) {
    addBtn("Annulla", false, () => {
      game.selectedCard = null;
      game.playMode = false;
      game.attachMode = false;
      closeCardDetail();
      renderGameState();
    });
    if (t === "mostro" || t === "mostrissimo") {
      addBtn("Evoca", true, () => {
        game.selectCardFromHand(card.instanceId);
        closeCardDetail();
        renderGameState();
        if (typeof MapRenderer !== "undefined") MapRenderer.render();
      });
    } else if (t === "maledizione") {
      addBtn("Lancia magia", true, () => {
        game.selectCardFromHand(card.instanceId);
        closeCardDetail();
        renderGameState();
        if (typeof MapRenderer !== "undefined") MapRenderer.render();
      });
    } else if (t === "artefatto") {
      addBtn("Lega artefatto", true, () => {
        game.selectCardFromHand(card.instanceId);
        closeCardDetail();
        renderGameState();
        if (typeof MapRenderer !== "undefined") MapRenderer.render();
      });
    } else if (t === "trappola") {
      addBtn("Ok (si attiva nel turno avversario)", true, () => {
        closeCardDetail();
        if (game) game.addLog("Le Trappole restano in mano e si attivano nel turno avversario.");
        renderGameState();
      });
    } else {
      addBtn("Seleziona", true, () => {
        game.selectCardFromHand(card.instanceId);
        closeCardDetail();
        renderGameState();
      });
    }
  } else {
    addBtn("Chiudi", true, () => closeCardDetail());
  }

  modal.classList.remove("hidden");
  modal.style.display = "flex";
}

window.showCardDetail = showCardDetail;
window.openGraveyard = openGraveyard;
window.onGameUpdate = renderGameState;

function renderGameState() {
  if (!game) return;

  const left = document.getElementById("entities-panel");
  if (left) {
    left.innerHTML = "";
    game.entities.forEach((e, idx) => {
      const div = document.createElement("div");
      div.className = "entity-panel" + (idx === game.turnIndex ? " active-turn" : "");
      const nameClass = e.isFallen ? "fallen" : (e.isHuman ? "human" : "ai");
      const icon = e.templeIcon || "";
      const passives = (e.passives && e.passives.length)
        ? e.passives.slice(-3).map(p => "<div class=\"passive-line\">" + p + "</div>").join("")
        : "";
      div.innerHTML =
        "<div class=\"entity-name " + nameClass + "\">" + icon + " " + e.name + (e.isFallen?" (Caduto)":"") + "</div>" +
        "<div class=\"entity-stats\"><span>💧 " + e.mana + "/" + e.manaMax + "</span><span>🃏 " + (e.isFallen?0:e.hand.length) + "</span><span>⚔️ " + e.field.length + "</span></div>" +
        "<div class=\"entity-power\">" + (e.factionPower || "Potere fazione (placeholder)") + "</div>" +
        (passives ? "<div class=\"entity-passives\">" + passives + "</div>" : "") +
        (e.isHuman ? "<button class=\"btn btn-grave\" data-eid=\"" + e.id + "\" style=\"margin-top:6px;padding:4px 8px;font-size:0.75rem;\">Cimitero (" + e.graveyard.length + ")</button>" : "");
      left.appendChild(div);
    });
    left.querySelectorAll(".btn-grave").forEach(btn => {
      btn.onclick = () => openGraveyard(btn.getAttribute("data-eid"));
    });
  }

  const turnInfo = document.getElementById("turn-info");
  if (turnInfo) turnInfo.textContent = "Turno " + game.turnNumber + " — " + game.currentEntity.name;
  const manaInfo = document.getElementById("mana-info");
  if (manaInfo) manaInfo.innerHTML = "Mana: <strong>" + game.currentEntity.mana + "</strong> / " + game.currentEntity.manaMax;

  const btnCancel = document.getElementById("btn-cancel-action");
  if (btnCancel) {
    btnCancel.style.display = (game.playMode || game.moveMode) ? "inline-block" : "none";
  }

  const handEl = document.getElementById("game-hand");
  if (handEl) {
    handEl.innerHTML = "";
    const human = game.entities.find(e => e.isHuman);
    if (human) {
      human.hand.forEach(card => {
        const el = document.createElement("div");
        el.className = "hand-card";
        if (game.selectedCard && game.selectedCard.instanceId === card.instanceId) {
          el.style.borderColor = "var(--accent)";
          el.style.boxShadow = "0 0 10px rgba(255,213,79,0.4)";
        }
        const cost = card.currentCost !== undefined ? card.currentCost : card.cost;
        el.innerHTML = "<div class=\"name\"><span class=\"color-dot color-" + card.color + "\"></span>" + card.name + "</div><div class=\"meta\">" + card.type + " • Costo " + cost + "</div><div class=\"meta\" style=\"font-size:0.72rem;\">" + (card.effect||"").substring(0,55) + "...</div>";
        el.addEventListener("click", () => {
          showCardDetail(card, { fromHand: true });
        });
        handEl.appendChild(el);
      });
    }
  }

  const logEl = document.getElementById("game-log");
  if (logEl) {
    logEl.innerHTML = game.log.slice(-40).reverse().map(l =>
      "<div class=\"log-entry" + (l.important?" important":"") + "\">" + l.msg + "</div>"
    ).join("");
  }

  const btnEnd = document.getElementById("btn-end-turn");
  if (btnEnd) btnEnd.disabled = !game.currentEntity.isHuman || game.phase === "ended";

  if (typeof MapRenderer !== "undefined" && MapRenderer.game) {
    MapRenderer.setGame(game);
    MapRenderer.render();
  }
  renderMostrissimi();
}

document.getElementById("btn-end-turn")?.addEventListener("click", () => {
  if (!game || !game.currentEntity.isHuman) return;
  game.endTurn();
  renderGameState();
  if (typeof MapRenderer !== "undefined") MapRenderer.render();
  if (!game.currentEntity.isHuman && game.phase === "playing") {
    setTimeout(() => game.runAITurn(), 700);
  }
});

document.getElementById("btn-cancel-action")?.addEventListener("click", () => {
  if (!game) return;
  game.selectedCard = null;
  game.selectedUnit = null;
  game.playMode = false;
  game.moveMode = false;
  game.attachMode = false;
  game.targetMode = null;
  renderGameState();
  if (typeof MapRenderer !== "undefined") MapRenderer.render();
});

// ---------- VIEWPORT / RESIZE ----------
function fitToScreen() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  document.documentElement.style.setProperty("--vw", w + "px");
  document.documentElement.style.setProperty("--vh", h + "px");
  if (typeof MapRenderer !== "undefined" && MapRenderer.canvas && MapRenderer.game) {
    MapRenderer.center();
    MapRenderer.render();
  }
}
window.addEventListener("resize", fitToScreen);
window.addEventListener("orientationchange", () => setTimeout(fitToScreen, 100));

document.addEventListener("DOMContentLoaded", () => {
  fitToScreen();
  initAuth();
});

window.onGameEnd = function(g) {
  const modal = document.getElementById("endgame-modal");
  const title = document.getElementById("endgame-title");
  const msg = document.getElementById("endgame-msg");
  if (!modal) {
    console.error("endgame-modal non trovato");
    return;
  }
  modal.classList.remove("hidden");
  modal.style.display = "flex";

  if (g.winner) {
    if (g.winner.isHuman) {
      title.textContent = "Vittoria!";
      title.style.color = "var(--accent)";
      msg.textContent = "Hai sconfitto tutte le altre entità e hai mantenuto l'Artefatto!";
    } else {
      title.textContent = "Sconfitta";
      title.style.color = "var(--danger)";
      msg.textContent = (g.winner.name || "Un avversario") + " ha vinto la partita." + (g.loseReason ? " (" + g.loseReason + ")" : "");
    }
  } else {
    title.textContent = "Fine Partita";
    msg.textContent = g.loseReason || "La partita è terminata.";
  }

  // Collega i bottoni ORA (quando il modal è visibile) – evita listener persi
  const btnHome = document.getElementById("btn-back-to-home");
  const btnMap = document.getElementById("btn-view-map");
  if (btnHome) {
    btnHome.onclick = function() {
      modal.classList.add("hidden");
      modal.style.display = "none";
      const bar = document.getElementById("postgame-bar");
      if (bar) bar.remove();
      game = null;
      showScreen("home");
    };
  }
  if (btnMap) {
    btnMap.onclick = function() {
      modal.classList.add("hidden");
      modal.style.display = "none";
      if (typeof renderGameState === "function") renderGameState();
      if (typeof MapRenderer !== "undefined") MapRenderer.render();
      let bar = document.getElementById("postgame-bar");
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "postgame-bar";
        bar.style.cssText = "position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:998;display:flex;gap:10px;background:rgba(13,27,42,0.95);border:1px solid #2A3A4A;border-radius:12px;padding:10px 16px;";
        bar.innerHTML = '<button id="btn-postgame-home" class="btn btn-primary">Torna alla Home</button>';
        document.body.appendChild(bar);
        document.getElementById("btn-postgame-home").onclick = function() {
          bar.remove();
          game = null;
          showScreen("home");
        };
      }
      if (game) game.addLog("Scorri il log a destra per capire cosa è successo.");
      if (typeof renderGameState === "function") renderGameState();
    };
  }
};
