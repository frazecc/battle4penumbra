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
    " — Scegli una delle 3 bustine (prendi tutte e 3 le carte)";

  const container = document.getElementById("packs-container");
  container.innerHTML = "";
  game.draft.packs.forEach((pack, pi) => {
    const packEl = document.createElement("div");
    packEl.className = "pack" + (picker.isHuman ? " active-pack" : "");
    packEl.style.cursor = picker.isHuman ? "pointer" : "default";

    let cardsHtml = "";
    pack.cards.forEach((card) => {
      const stats = (card.atk !== undefined) ? (card.atk + "/" + card.hp) : "";
      cardsHtml += '<div class="draft-card">' +
        '<div class="card-name"><span class="color-dot color-' + card.color + '"></span>' + card.name + '</div>' +
        '<div class="card-meta"><span>' + card.type + ' • Costo ' + card.cost + '</span><span>' + stats + '</span></div>' +
        '<div class="card-meta" style="font-size:0.72rem;margin-top:4px;">' + (card.effect || "").substring(0, 60) + '</div>' +
        '</div>';
    });

    packEl.innerHTML = '<div class="pack-header"><span class="color-dot color-' + pack.color + '"></span>Bustina ' +
      (COLOR_NAMES[pack.color] || pack.color) + '</div><div class="pack-cards">' + cardsHtml + '</div>' +
      (picker.isHuman ? '<button class="btn btn-primary" style="width:100%;margin-top:10px;">Scegli questa bustina</button>' : '');

    if (picker.isHuman) {
      packEl.addEventListener("click", () => {
        game.draftPickPack(pi);
        renderDraft();
        if (game.phase === "playing") startGameUI();
      });
    }
    container.appendChild(packEl);
  });

  // Picks so far
  const picksEl = document.getElementById("player-picks");
  picksEl.innerHTML = "";
  game.activePlayers.forEach(e => {
    const col = document.createElement("div");
    col.className = "pick-column " + (e.isHuman ? "human" : "ai");
    col.innerHTML = "<h4>" + e.name + " (" + (game.draft.picks[e.id] || []).length + " carte)</h4>";
    (game.draft.picks[e.id] || []).forEach(c => {
      const p = document.createElement("div");
      p.className = "picked-card";
      p.innerHTML = '<span class="color-dot color-' + c.color + '"></span>' + c.name;
      col.appendChild(p);
    });
    picksEl.appendChild(col);
  });

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
  game.mostrissimiPool.forEach((m, i) => {
    const div = document.createElement("div");
    div.className = "hand-card";
    div.style.cursor = "pointer";
    div.innerHTML = "<div class=\"name\"><span class=\"color-dot color-" + m.color + "\"></span>" + m.name + "</div>" +
      "<div class=\"meta\">Sac " + m.sacrifice + " • " + m.atk + "/" + m.hp + "</div>" +
      "<div class=\"meta\" style=\"font-size:0.7rem;\">" + (m.effect||"").substring(0,40) + "...</div>";
    div.onclick = () => {
      if (!game.currentEntity.isHuman) return;
      game.addLog("Selezionato Mostrissimo: " + m.name + ". Clicca Altare o Tempio per evocarlo (servono " + m.sacrifice + " sacrifici).");
      game.selectedCard = { ...m, instanceId: m.instanceId + "_sum_" + Date.now() };
      game.playMode = true;
      game.moveMode = false;
      game.selectedUnit = null;
      if (window.onGameUpdate) window.onGameUpdate();
    };
    el.appendChild(div);
  });
}

window.onGameUpdate = renderGameState;
  renderGameState();
  if (!game.currentEntity.isHuman) {
    setTimeout(() => game.runAITurn(), 900);
  }
}

function renderGameState() {
  if (!game) return;

  // Entities
  const left = document.getElementById("entities-panel");
  left.innerHTML = "";
  game.entities.forEach((e, idx) => {
    const div = document.createElement("div");
    div.className = "entity-panel" + (idx === game.turnIndex ? " active-turn" : "");
    const nameClass = e.isFallen ? "fallen" : (e.isHuman ? "human" : "ai");
    div.innerHTML = "<div class=\"entity-name " + nameClass + "\">" + e.name + (e.isFallen?" (Caduto)":"") + "</div><div class=\"entity-stats\"><span>💧 " + e.mana + "/" + e.manaMax + "</span><span>🃏 " + e.hand.length + "</span><span>⚔️ " + e.field.length + "</span></div>";
    left.appendChild(div);
  });

  // Top bar
  document.getElementById("turn-info").textContent = "Turno " + game.turnNumber + " — " + game.currentEntity.name;
  document.getElementById("mana-info").innerHTML = "Mana: <strong>" + game.currentEntity.mana + "</strong> / " + game.currentEntity.manaMax;

  // Cancel button
  const btnCancel = document.getElementById("btn-cancel-action");
  if (btnCancel) {
    btnCancel.style.display = (game.playMode || game.moveMode) ? "inline-block" : "none";
  }

  // Hand
  const handEl = document.getElementById("game-hand");
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
      if (game.currentEntity.isHuman && game.phase === "playing") {
        el.addEventListener("click", () => {
          game.selectCardFromHand(card.instanceId);
          renderGameState();
          MapRenderer.render();
        });
      }
      handEl.appendChild(el);
    });
  }

  // Log
  const logEl = document.getElementById("game-log");
  logEl.innerHTML = game.log.slice(-40).reverse().map(l =>
    "<div class=\"log-entry" + (l.important?" important":"") + "\">" + l.msg + "</div>"
  ).join("");

  // End turn
  const btnEnd = document.getElementById("btn-end-turn");
  if (btnEnd) btnEnd.disabled = !game.currentEntity.isHuman || game.phase === "ended";

  // Map
  if (MapRenderer.game) {
    MapRenderer.setGame(game);
    MapRenderer.render();
  }
  renderMostrissimi();
}

document.getElementById("btn-end-turn")?.addEventListener("click", () => {
  if (!game || !game.currentEntity.isHuman) return;
  game.endTurn();
  renderGameState();
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
  game.addLog("Azione annullata.");
  renderGameState();
});


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
  game.mostrissimiPool.forEach((m, i) => {
    const div = document.createElement("div");
    div.className = "hand-card";
    div.style.cursor = "pointer";
    div.innerHTML = "<div class=\"name\"><span class=\"color-dot color-" + m.color + "\"></span>" + m.name + "</div>" +
      "<div class=\"meta\">Sac " + m.sacrifice + " • " + m.atk + "/" + m.hp + "</div>" +
      "<div class=\"meta\" style=\"font-size:0.7rem;\">" + (m.effect||"").substring(0,40) + "...</div>";
    div.onclick = () => {
      if (!game.currentEntity.isHuman) return;
      game.addLog("Selezionato Mostrissimo: " + m.name + ". Clicca Altare o Tempio per evocarlo (servono " + m.sacrifice + " sacrifici).");
      game.selectedCard = { ...m, instanceId: m.instanceId + "_sum_" + Date.now() };
      game.playMode = true;
      game.moveMode = false;
      game.selectedUnit = null;
      if (window.onGameUpdate) window.onGameUpdate();
    };
    el.appendChild(div);
  });
}

window.onGameUpdate = renderGameState;

document.addEventListener("DOMContentLoaded", () => {
  initAuth();
});

// ---------- END GAME ----------
window.onGameEnd = function(g) {
  const modal = document.getElementById("endgame-modal");
  const title = document.getElementById("endgame-title");
  const msg = document.getElementById("endgame-msg");
  if (!modal) return;

  modal.classList.remove("hidden");
  modal.style.display = "flex";

  if (g.winner) {
    if (g.winner.isHuman) {
      title.textContent = "🏆 Vittoria!";
      title.style.color = "var(--accent)";
      msg.textContent = "Hai sconfitto tutte le altre entità e hai mantenuto l'Artefatto!";
    } else {
      title.textContent = "Sconfitta";
      title.style.color = "var(--danger)";
      msg.textContent = g.winner.name + " ha vinto la partita.";
    }
  } else {
    title.textContent = "Fine Partita";
    msg.textContent = g.loseReason || "La partita è terminata.";
  }
};

document.getElementById("btn-back-to-home")?.addEventListener("click", () => {
  const modal = document.getElementById("endgame-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
  game = null;
  showScreen("home");
});
