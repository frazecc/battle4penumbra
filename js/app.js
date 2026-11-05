// =====================================================
// MAIN APPLICATION (Fasi 0-6)
// =====================================================

// OBBLIGATORIO: aggiornare a ogni consegna (deve coincidere col numero di consegna)
const APP_VERSION = "019";

let game = null;
let currentScreen = "auth";

// Aggiorna il numero versione nella home
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("app-version");
  if (el) el.textContent = "v" + APP_VERSION;
});

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
  humanDraftPicksDone = 0;
  gameUIStarted = false;
  game.startDraft();

  // Pulisci subito le buste per evitare il flash
  const container = document.getElementById("packs-container");
  if (container) {
    container.innerHTML = "";
    container.style.visibility = "hidden";
  }
  const statusEl = document.getElementById("draft-status");
  const turnEl = document.getElementById("draft-turn-info");
  if (statusEl) statusEl.textContent = "";
  if (turnEl) turnEl.textContent = "";

  showScreen("draft");

  // Messaggio iniziale subito all'avvio del draft
  showDraftAtmosphere(
    "Abbraccia l'eternità.<br>Assaggia il potere.",
    () => {
      renderDraft();
    }
  );
});

document.getElementById("btn-back-home")?.addEventListener("click", () => showScreen("home"));

// ---------- DRAFT ----------
let humanDraftPicksDone = 0; // 0, 1, 2, 3

function showDraftAtmosphere(message, onContinue) {
  let overlay = document.getElementById("draft-atmosphere-overlay");
  if (overlay) overlay.remove();

  overlay = document.createElement("div");
  overlay.id = "draft-atmosphere-overlay";
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 2000;
    background: rgba(0,0,0,0.93);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; padding: 24px;
    font-family: Georgia, serif;
  `;

  overlay.innerHTML = `
    <div style="max-width:520px; color:#E0D6C8; font-size:1.4rem; line-height:1.65; margin-bottom:36px; letter-spacing:0.03em;">
      ${message}
    </div>
    <button id="draft-ho-capito" class="btn btn-primary" style="padding:12px 36px; font-size:1.1rem;">
      Ho capito
    </button>
  `;

  document.body.appendChild(overlay);

  const container = document.getElementById("packs-container");
  if (container) container.style.visibility = "hidden";

  document.getElementById("draft-ho-capito").onclick = () => {
    overlay.remove();
    if (container) container.style.visibility = "visible";
    if (typeof onContinue === "function") onContinue();
  };
}

function renderDraft() {
  if (!game || !game.draft) return;
  const picker = game.getDraftCurrentPicker();
  const statusEl = document.getElementById("draft-status");
  const turnEl = document.getElementById("draft-turn-info");

  // Draft finito → messaggio finale poi avvio partita
  if (!picker || game.draft.currentPick >= game.draft.totalPicksNeeded) {
    statusEl.textContent = "Draft completato!";
    turnEl.textContent = "";
    const container = document.getElementById("packs-container");
    if (container) container.innerHTML = "";

    showDraftAtmosphere(
      "…e così, nuovamente, comincia!",
      () => {
        if (game.phase === "playing") startGameUI();
        else {
          // sicurezza
          if (typeof startGameUI === "function") startGameUI();
        }
      }
    );
    return;
  }

  const container = document.getElementById("packs-container");
  container.innerHTML = "";

  // Se non è il turno dell'umano → non mostrare buste, lascia fare le IA in background
  if (!picker.isHuman) {
    statusEl.textContent = "Le altre entità stanno scegliendo...";
    turnEl.textContent = "";
    container.style.visibility = "hidden";

    setTimeout(() => {
      game._processAIDraftPacks();
      renderDraft();
      if (game.phase === "playing") startGameUI();
    }, 600);
    return;
  }

  // È il turno dell'umano → mostra SOLO le 3 buste selezionabili
  statusEl.textContent = "Scelta di: " + picker.name;
  turnEl.textContent = "Bustina " + (game.draft.currentPick + 1) + " di " + game.draft.totalPicksNeeded +
    " — Scegli una bustina (colore). Le carte restano nascoste.";
  container.style.visibility = "visible";

  game.draft.packs.forEach((pack, pi) => {
    const packEl = document.createElement("div");
    packEl.className = "pack pack-sealed active-pack";
    packEl.style.cursor = "pointer";

    packEl.innerHTML =
      '<div class="pack-sealed-inner color-bg-' + pack.color + '">' +
        '<div class="pack-sealed-label">BUSTINA</div>' +
        '<div class="pack-sealed-color">' + (COLOR_NAMES[pack.color] || pack.color) + '</div>' +
        '<div class="pack-sealed-hint">3 carte nascoste</div>' +
      '</div>' +
      '<button class="btn btn-primary" style="width:100%;margin-top:12px;">Scegli questa bustina</button>';

    packEl.addEventListener("click", () => {
      game.draftPickPack(pi);
      humanDraftPicksDone++;

      let nextMessage = null;
      if (humanDraftPicksDone === 1) {
        nextMessage = "Le altre entità stanno ancora valutando quale destino percorrere.";
      } else if (humanDraftPicksDone === 2) {
        nextMessage = "Sei pronto?";
      }

      if (nextMessage) {
        // Nascondi subito le buste mentre c'è il messaggio
        container.innerHTML = "";
        container.style.visibility = "hidden";
        showDraftAtmosphere(nextMessage, () => {
          renderDraft();
          if (game.phase === "playing") startGameUI();
        });
      } else {
        container.innerHTML = "";
        container.style.visibility = "hidden";
        renderDraft();
        if (game.phase === "playing") startGameUI();
      }
    });
    container.appendChild(packEl);
  });

  const picksEl = document.getElementById("player-picks");
  if (picksEl) {
    picksEl.innerHTML = "";
    picksEl.style.display = "none";
  }
}


// ---------- GAME UI ----------
let gameUIStarted = false;
function startGameUI() {
  // Evita avvio multiplo (causava timeout IA doppi e chiusura automatica del turno umano)
  if (gameUIStarted && game && game.phase === "playing") {
    console.log("startGameUI ignorato: già avviato");
    return;
  }
  gameUIStarted = true;
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

// ---------- LOG COMPLETO ----------
function showFullLog() {
  if (!game) return;
  let modal = document.getElementById("full-log-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "full-log-modal";
    modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;z-index:1500;";
    modal.innerHTML = `
      <div style="background:#0D1B2A;border:1px solid #2A3A4A;border-radius:14px;width:90%;max-width:520px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">
        <div style="padding:14px 18px;border-bottom:1px solid #2A3A4A;display:flex;justify-content:space-between;align-items:center;">
          <strong style="color:var(--accent);font-size:1.1rem;">Log completo della partita</strong>
          <button id="close-full-log" class="btn" style="padding:6px 14px;">Chiudi</button>
        </div>
        <div id="full-log-content" style="padding:14px 18px;overflow-y:auto;flex:1;font-size:0.9rem;line-height:1.5;"></div>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById("close-full-log").onclick = () => {
      modal.style.display = "none";
    };
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });
  }
  const content = document.getElementById("full-log-content");
  content.innerHTML = game.log.slice().reverse().map(l =>
    "<div class=\"log-entry" + (l.important ? " important" : "") + "\" style=\"padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.06);\">" + l.msg + "</div>"
  ).join("");
  modal.style.display = "flex";
}

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

  const witheredStr = (isFieldUnit && card.isWithered) ? "<p style=\"color:#FF8A65;\"><strong>Stato:</strong> AVVIZZITA (non può muoversi né attaccare)</p>" : "";
  const movedStr = (isFieldUnit && card.movedThisTurn) ? "<p><strong>Movimento:</strong> ha già mosso questo turno</p>" : (isFieldUnit ? "<p><strong>Movimento:</strong> primo passo ancora gratuito</p>" : "");

  bodyEl.innerHTML =
    "<p><strong>Tipo:</strong> " + (card.type || "-") + "</p>" +
    "<p><strong>Colore:</strong> " + (card.color || "-") + "</p>" +
    "<p><strong>Costo:</strong> " + (card.currentCost !== undefined ? card.currentCost : (card.cost||0)) + "</p>" +
    (atk !== null ? "<p><strong>ATK / PV:</strong> " + atk + " / " + (hp||0) + (card.shields ? " · Scudi " + card.shields : "") + "</p>" : "") +
    (card.sacrifice ? "<p><strong>Sacrifici:</strong> " + card.sacrifice + "</p>" : "") +
    (isFieldUnit ? "<p><strong>Posizione:</strong> (" + card.q + "," + card.r + ")</p>" : "") +
    witheredStr +
    movedStr +
    "<p style=\"margin-top:12px;line-height:1.6\"><strong>Effetto:</strong><br>" + (card.effect || "Nessuno") + (card.type === "mostrissimo" ? " <em>(Entra in campo avvizzito)</em>" : "") + "</p>";

  let actions = document.getElementById("card-detail-actions");
  if (!actions) {
    actions = document.createElement("div");
    actions.id = "card-detail-actions";
    actions.style.cssText = "display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;";
    bodyEl.parentNode.appendChild(actions);
  }
  actions.innerHTML = "";

  const canAct = !!(game && game.currentEntity && game.currentEntity.isHuman && game.phase === "playing" && !opts.readOnly);

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
    if (card.isWithered) {
      moveBlocked = true;
      moveReason = "Creatura avvizzita: non può muoversi né attaccare (si sveglia a inizio del tuo prossimo turno).";
    } else if (game && typeof game.isCellDiscovered === "function") {
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
      // Ordine: costo crescente → tipo (artefatto, mostro, mostrissimo, maledizione, trappola, altro) → alfabetico
      const typeOrder = { "artefatto": 0, "mostro": 1, "mostrissimo": 2, "maledizione": 3, "trappola": 4 };
      const sortedHand = [...human.hand].sort((a, b) => {
        const ca = a.currentCost !== undefined ? a.currentCost : (a.cost || 0);
        const cb = b.currentCost !== undefined ? b.currentCost : (b.cost || 0);
        if (ca !== cb) return ca - cb;
        const ta = typeOrder[(a.type || "").toLowerCase()] ?? 99;
        const tb = typeOrder[(b.type || "").toLowerCase()] ?? 99;
        if (ta !== tb) return ta - tb;
        return (a.name || "").localeCompare(b.name || "", "it");
      });

      sortedHand.forEach(card => {
        const el = document.createElement("div");
        const cost = card.currentCost !== undefined ? card.currentCost : (card.cost || 0);
        const playable = game.isCardPlayable ? game.isCardPlayable(card, human) : false;

        el.className = "hand-card" + (playable ? " playable" : " unplayable");
        if (game.selectedCard && game.selectedCard.instanceId === card.instanceId) {
          el.classList.add("selected");
        }

        el.innerHTML =
          "<div class=\"name\"><span class=\"color-dot color-" + card.color + "\"></span>" + card.name + "</div>" +
          "<div class=\"meta\">" + card.type + " • Costo " + cost + "</div>" +
          "<div class=\"meta\" style=\"font-size:0.72rem;\">" + (card.effect || "").substring(0, 55) + "...</div>";

        el.addEventListener("click", () => {
          showCardDetail(card, { fromHand: true });
        });
        handEl.appendChild(el);
      });
    }
  }

  const logEl = document.getElementById("game-log");
  if (logEl) {
    // Mostra solo gli ultimi 6 messaggi (il log completo resta disponibile col click)
    const lastFew = game.log.slice(-6).reverse();
    logEl.innerHTML = lastFew.map(l =>
      "<div class=\"log-entry" + (l.important ? " important" : "") + "\">" + l.msg + "</div>"
    ).join("");

    // Click sul log → apre il log completo
    logEl.onclick = function() {
      showFullLog();
    };
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

  // Disabilita subito qualsiasi interazione di gioco
  if (g) {
    g.selectedCard = null;
    g.selectedUnit = null;
    g.moveMode = false;
    g.playMode = false;
    g.attachMode = false;
    g.targetMode = null;
  }

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
    // Caso tipico: l'umano è diventato Caduto
    title.textContent = "Hai perso";
    title.style.color = "var(--danger)";
    msg.textContent = g.loseReason || "Il tuo Artefatto non era più sul campo a fine turno.";
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
      // Ridisegna con la fog congelata (frozenVisibility già impostata in game.js)
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
      if (game) game.addLog("Mappa congelata al momento della sconfitta. Nessuna informazione extra.");
      if (typeof renderGameState === "function") renderGameState();
    };
  }
};
