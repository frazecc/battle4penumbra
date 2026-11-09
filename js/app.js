// =====================================================
// MAIN APPLICATION (Fasi 0-6)
// =====================================================

// OBBLIGATORIO: aggiornare a ogni consegna (deve coincidere col numero di consegna)
const APP_VERSION = "040";

let game = null;
let currentScreen = "auth";

// Aggiorna il numero versione nella home
document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("app-version");
  if (el) el.textContent = "v" + APP_VERSION;
  ensureSettingsButton();
});

// =====================================================
// IMPOSTAZIONI UTENTE (per username)
// =====================================================
const DEFAULT_SETTINGS = {
  autoHoCapito: false,
  audio: true,
  animations: true,
  antiEpilessia: false
};

function settingsKey() {
  try {
    const u = (typeof getCurrentUser === "function" && getCurrentUser()) ||
              (typeof getSession === "function" && getSession());
    const name = u && u.username ? u.username : "guest";
    return "bfp_settings_" + name;
  } catch (e) {
    return "bfp_settings_guest";
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(settingsKey());
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s) {
  try {
    localStorage.setItem(settingsKey(), JSON.stringify(s));
  } catch (e) {}
}

let userSettings = loadSettings();

function ensureSettingsButton() {
  if (document.getElementById("btn-settings-gear")) return;
  const btn = document.createElement("button");
  btn.id = "btn-settings-gear";
  btn.title = "Impostazioni";
  btn.innerHTML = "⚙️";
  btn.style.cssText = "position:fixed;top:12px;right:12px;z-index:3000;width:42px;height:42px;border-radius:50%;border:1px solid #2A3A4A;background:#0D1B2A;color:#FFD54F;font-size:1.2rem;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.4);";
  btn.onclick = () => openSettingsPanel();
  document.body.appendChild(btn);
}

function openSettingsPanel() {
  let panel = document.getElementById("settings-panel");
  if (panel) {
    panel.style.display = panel.style.display === "none" ? "block" : "none";
    return;
  }
  userSettings = loadSettings();
  panel = document.createElement("div");
  panel.id = "settings-panel";
  panel.style.cssText = "position:fixed;top:60px;right:12px;z-index:3001;width:280px;background:#0D1B2A;border:1px solid #2A3A4A;border-radius:12px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.5);font-size:0.9rem;color:#E0D6C8;";
  panel.innerHTML = `
    <div style="font-weight:700;color:#FFD54F;margin-bottom:12px;">Impostazioni</div>
    <label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;cursor:pointer;">
      <span>Auto-ho-capito</span>
      <input type="checkbox" id="set-auto-hocapito" ${userSettings.autoHoCapito ? "checked" : ""}>
    </label>
    <label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;cursor:pointer;">
      <span>Audio</span>
      <input type="checkbox" id="set-audio" ${userSettings.audio ? "checked" : ""}>
    </label>
    <label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;cursor:pointer;">
      <span>Animazioni</span>
      <input type="checkbox" id="set-animations" ${userSettings.animations ? "checked" : ""}>
    </label>
    <label style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;cursor:pointer;">
      <span>Anti-epilessia</span>
      <input type="checkbox" id="set-antiepi" ${userSettings.antiEpilessia ? "checked" : ""}>
    </label>
    <div style="font-size:0.75rem;color:#6B7A8A;margin-top:8px;">Le preferenze sono salvate per il tuo utente.</div>
    <button class="btn" style="width:100%;margin-top:12px;" id="set-close">Chiudi</button>
  `;
  document.body.appendChild(panel);
  const bind = (id, key) => {
    document.getElementById(id).onchange = (e) => {
      userSettings[key] = e.target.checked;
      saveSettings(userSettings);
      if (key === "antiEpilessia") {
        document.body.classList.toggle("anti-epilessia", userSettings.antiEpilessia);
      }
    };
  };
  bind("set-auto-hocapito", "autoHoCapito");
  bind("set-audio", "audio");
  bind("set-animations", "animations");
  bind("set-antiepi", "antiEpilessia");
  document.getElementById("set-close").onclick = () => { panel.style.display = "none"; };
  if (userSettings.antiEpilessia) document.body.classList.add("anti-epilessia");
}

// =====================================================
// SISTEMA POPUP AZIONI (coda a schermo intero)
// =====================================================
const popupQueue = [];
let popupShowing = false;
let popupMapPeek = false; // true = utente sta guardando la mappa

function enqueueGamePopup(message, opts) {
  opts = opts || {};
  // Non accodare se messaggio vuoto
  if (!message || !String(message).trim()) return;
  popupQueue.push({
    message: String(message),
    buttonLabel: opts.buttonLabel || "Ho capito",
    allowMap: opts.allowMap !== false,
    autoSkippable: opts.autoSkippable !== false,
    playerLabel: opts.playerLabel || null
  });
  processPopupQueue();
}
window.enqueueGamePopup = enqueueGamePopup;

function waitForPopups() {
  return new Promise(resolve => {
    const t = setInterval(() => {
      if (popupQueue.length === 0 && !popupShowing && !popupMapPeek) {
        clearInterval(t);
        resolve();
      }
    }, 80);
  });
}
window.waitForPopups = waitForPopups;

function processPopupQueue() {
  if (popupShowing || popupMapPeek) return;
  if (popupQueue.length === 0) return;
  const item = popupQueue.shift();
  showActionPopup(item);
}

function showActionPopup(item) {
  popupShowing = true;
  // Rimuovi overlay precedente
  let overlay = document.getElementById("action-popup-overlay");
  if (overlay) overlay.remove();

  overlay = document.createElement("div");
  overlay.id = "action-popup-overlay";
  const anim = userSettings.animations && !userSettings.antiEpilessia;
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:2500;
    background:rgba(0,0,0,0.92);
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    text-align:center;padding:28px;
    font-family:Georgia,serif;
    opacity:0;transition:opacity ${anim ? "0.35s" : "0s"} ease;
  `;

  const playerHtml = item.playerLabel
    ? `<div style="color:#FFD54F;font-size:1rem;margin-bottom:12px;letter-spacing:0.04em;">${item.playerLabel}</div>`
    : "";

  overlay.innerHTML = `
    ${playerHtml}
    <div id="action-popup-msg" style="max-width:560px;color:#E0D6C8;font-size:1.25rem;line-height:1.65;margin-bottom:28px;letter-spacing:0.02em;">
      ${item.message}
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
      <button id="action-popup-ok" class="btn btn-primary" style="padding:12px 32px;font-size:1.05rem;">
        ${item.buttonLabel}
      </button>
      ${item.allowMap ? '<button id="action-popup-map" class="btn" style="padding:12px 24px;font-size:1.05rem;">Guarda mappa</button>' : ""}
    </div>
  `;
  document.body.appendChild(overlay);
  // fade in
  requestAnimationFrame(() => { overlay.style.opacity = "1"; });

  const closePopup = () => {
    if (anim) {
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.remove();
        popupShowing = false;
        processPopupQueue();
      }, 320);
    } else {
      overlay.remove();
      popupShowing = false;
      processPopupQueue();
    }
  };

  document.getElementById("action-popup-ok").onclick = closePopup;

  const mapBtn = document.getElementById("action-popup-map");
  if (mapBtn) {
    mapBtn.onclick = () => {
      // Metti l'item in testa alla coda e chiudi temporaneamente
      popupQueue.unshift(item);
      overlay.remove();
      popupShowing = false;
      popupMapPeek = true;
      showMapPeekBar();
    };
  }

  // Auto-ho-capito: mostra ~0.8s poi chiude (solo se skippable)
  userSettings = loadSettings();
  if (userSettings.autoHoCapito && item.autoSkippable) {
    setTimeout(() => {
      if (document.getElementById("action-popup-overlay") === overlay) {
        closePopup();
      }
    }, 800);
  }
}

function showMapPeekBar() {
  let bar = document.getElementById("map-peek-bar");
  if (bar) bar.remove();
  bar = document.createElement("div");
  bar.id = "map-peek-bar";
  bar.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2600;background:#0D1B2A;border:1px solid #FFD54F;border-radius:12px;padding:12px 20px;display:flex;gap:12px;align-items:center;box-shadow:0 4px 20px rgba(0,0,0,0.5);";
  bar.innerHTML = `
    <span style="color:#E0D6C8;font-size:0.95rem;">Stai guardando la mappa</span>
    <button id="map-peek-return" class="btn btn-primary" style="padding:8px 18px;">Torna al messaggio</button>
  `;
  document.body.appendChild(bar);
  document.getElementById("map-peek-return").onclick = () => {
    bar.remove();
    popupMapPeek = false;
    processPopupQueue();
  };
}

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
    // Sempre: "riconosco questa presenza"
    showSessionConfirm(session);
  } else {
    showScreen("auth");
  }
}

function showSessionConfirm(session) {
  showScreen("auth");
  document.getElementById("auth-forms").classList.add("hidden");
  const sc = document.getElementById("session-confirm");
  sc.classList.remove("hidden");
  const nameEl = document.getElementById("session-username");
  if (nameEl) nameEl.textContent = session.username;
  const title = document.getElementById("session-confirm-title");
  if (title) title.textContent = "Riconosco questa presenza… sei tu?";
  const sub = document.getElementById("session-confirm-sub");
  if (sub) sub.innerHTML = "Presenza rilevata: <strong>" + session.username + "</strong>";
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

document.getElementById("form-login")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const res = await login(document.getElementById("login-username").value, document.getElementById("login-password").value);
  if (res.ok) enterApp(res.user);
  else showAuthError(res.error);
});

document.getElementById("form-register")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const res = await register(document.getElementById("reg-username").value, document.getElementById("reg-password").value);
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
  if (typeof offerResumeOrNew === "function") {
    offerResumeOrNew(() => {
      showScreen("setup");
      updateSetupSummary();
    });
  } else {
    showScreen("setup");
    updateSetupSummary();
  }
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
  const container = document.getElementById("packs-container");
  if (container) container.style.visibility = "hidden";
  // Usa il sistema popup unificato
  enqueueGamePopup(message, {
    buttonLabel: "Ho capito",
    allowMap: false,
    autoSkippable: true
  });
  waitForPopups().then(() => {
    if (container) container.style.visibility = "visible";
    if (typeof onContinue === "function") onContinue();
  });
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
  const MR = (typeof MapRenderer !== "undefined") ? MapRenderer : window.MapRenderer;
  if (!MR) {
    console.error("MapRenderer non caricato — controlla js/map.js");
    alert("Errore: mappa non caricata. Ricarica la pagina (Ctrl+F5).");
    gameUIStarted = false;
    return;
  }
  MR.init("gameCanvas", game);
  setTimeout(() => { MR.center(); MR.render(); }, 50);
  renderGameState();
  if (game && !game.currentEntity.isHuman) {
    setTimeout(() => game.runAITurn(), 900);
  }
}

// ---------- TRAP POPUP ----------
window.onTrapPrompt = function(pending) {
  const modal = document.getElementById("trap-modal");
  if (modal) { modal.style.zIndex = "2800"; }
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
      if (!game.currentEntity || !game.currentEntity.isHuman) return;
      if (typeof game.startMostrissimoSacrifice === "function") {
        game.startMostrissimoSacrifice(m);
      } else {
        // fallback
        game.selectedCard = { ...m, instanceId: (m.instanceId || m.id) + "_sum_" + Date.now() };
        game.playMode = true;
      }
      game.moveMode = false;
      game.selectedUnit = null;
      if (window.onGameUpdate) window.onGameUpdate();
      if (typeof MapRenderer !== "undefined") MapRenderer.render();
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
      div.oncontextmenu = (e) => { e.preventDefault(); showCardDetail(c, { readOnly: true }); };
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
  // Sempre in primo piano a schermo intero
  modal.style.zIndex = "3000";
  modal.style.display = "flex";
  modal.classList.remove("hidden");
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
    "<p style=\"margin-top:12px;line-height:1.55;white-space:pre-wrap\"><strong>Descrizione:</strong><br>" + String(card.effect || "Nessuna").replace(/\n/g, "<br>") + (card.type === "mostrissimo" ? " <em>(Entra in campo avvizzito)</em>" : "") + "</p>";

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
window.onGameUpdate = function(){ renderGameState(); if (typeof persistGame==='function') persistGame(); };

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
    btnCancel.style.display = (game.playMode || game.moveMode || game.sacrificeMode || game.attachMode) ? "inline-block" : "none";
  }

  // Contatore sacrifici Mostrissimo (v023)
  let sacBar = document.getElementById("sacrifice-counter");
  if (game.sacrificeMode && game.sacrificeCard) {
    if (!sacBar) {
      sacBar = document.createElement("div");
      sacBar.id = "sacrifice-counter";
      sacBar.style.cssText = "position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:50;background:rgba(20,12,8,0.92);border:1px solid #FF7043;color:#FFCCBC;padding:8px 18px;border-radius:10px;font-weight:700;font-size:0.95rem;pointer-events:none;box-shadow:0 4px 16px rgba(0,0,0,0.5);";
      const topbar = document.querySelector(".game-topbar") || document.getElementById("screen-game");
      if (topbar) topbar.appendChild(sacBar);
    }
    sacBar.style.display = "block";
    sacBar.textContent = "Sacrificati: " + game.sacrificeCount + " / " + game.sacrificeNeeded + "  —  " + (game.sacrificeCard.name || "Mostrissimo");
  } else if (sacBar) {
    sacBar.style.display = "none";
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
        const isArt = (card.type || "").toLowerCase() === "artefatto" || card.id === "artifact";

        el.className = "hand-card" + (playable ? " playable" : " unplayable") + (isArt ? " hand-card-artifact" : "");
        if (game.selectedCard && game.selectedCard.instanceId === card.instanceId) {
          el.classList.add("selected");
        }
        if (isArt) {
          el.style.cssText = "clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);background:radial-gradient(circle at 50% 40%,#FFE082,#FF8F00 55%,#E65100);border:none;min-width:100px;min-height:110px;box-shadow:0 0 18px rgba(255,193,7,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px 8px 12px;";
          el.innerHTML =
            "<div style=\"font-size:0.65rem;font-weight:800;letter-spacing:0.06em;color:#3E2723;\">ARTEFATTO</div>" +
            "<div style=\"font-size:0.85rem;font-weight:800;color:#1A0A00;text-align:center;line-height:1.15;\">" + (card.name || "Artefatto") + "</div>" +
            "<div style=\"font-size:0.7rem;color:#3E2723;\">Costo " + cost + "</div>";
        } else {
          el.innerHTML =
            "<div class=\"name\"><span class=\"color-dot color-" + card.color + "\"></span>" + card.name + "</div>" +
            "<div class=\"meta\">" + card.type + " • Costo " + cost + "</div>" +
            "<div class=\"meta\" style=\"font-size:0.72rem;\">" + (card.effect || "").substring(0, 55) + "...</div>";
        }

        el.addEventListener("click", () => {
          showCardDetail(card, { fromHand: true });
        });
        el.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          showCardDetail(card, { fromHand: true, readOnly: false });
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
  // L'IA parte da game._scheduleNextActor() a fine _finishEndTurn (sync o async).
});

document.getElementById("btn-cancel-action")?.addEventListener("click", () => {
  if (!game) return;
  if (game.sacrificeMode || (game.playMode && game.selectedCard && game.selectedCard.type === "mostrissimo")) {
    if (typeof game.cancelSacrificeMode === "function") game.cancelSacrificeMode();
  }
  game.selectedCard = null;
  game.selectedUnit = null;
  game.playMode = false;
  game.moveMode = false;
  game.attachMode = false;
  game.targetMode = null;
  game.sacrificeMode = false;
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
  // Disabilita interazioni
  if (g) {
    g.selectedCard = null;
    g.selectedUnit = null;
    g.moveMode = false;
    g.playMode = false;
    g.attachMode = false;
    g.targetMode = null;
  }

  let endTitle = "Hai perso";
  let endMsg = (g && g.loseReason) || "Il tuo Artefatto non era più sul campo a fine turno.";
  if (g && g.winner) {
    if (g.winner.isHuman) {
      endTitle = "Vittoria!";
      endMsg = "Hai sconfitto tutte le altre entità e hai mantenuto l'Artefatto!";
    } else {
      endTitle = "Sconfitta";
      endMsg = (g.winner.name || "Un avversario") + " ha vinto la partita." + (g.loseReason ? " (" + g.loseReason + ")" : "");
    }
  }

  // Popup unificato — NON auto-skippabile
  enqueueGamePopup("<strong style='font-size:1.5rem;color:#FFD54F;'>" + endTitle + "</strong><br><br>" + endMsg, {
    buttonLabel: "Accetto il giudizio",
    allowMap: true,
    autoSkippable: false
  });

  // Dopo il giudizio, mostra le opzioni home / mappa
  waitForPopups().then(() => {
    const modal = document.getElementById("endgame-modal");
    const title = document.getElementById("endgame-title");
    const msg = document.getElementById("endgame-msg");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.style.display = "flex";
    if (title) title.textContent = endTitle;
    if (msg) msg.textContent = endMsg;

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
        if (typeof renderGameState === "function") renderGameState();
      };
    }
  });
};


window.onEventChoicePrompt = function(pending) {
  const modal = document.getElementById("event-choice-modal");
  const box = document.getElementById("event-choice-options");
  if (!modal || !box || !pending) return;
  box.innerHTML = "";
  pending.options.forEach(opt => {
    const btn = document.createElement("button");
    btn.className = "btn btn-primary";
    btn.style.width = "100%";
    btn.textContent = opt.label || opt.type;
    btn.onclick = () => {
      modal.style.display = "none";
      modal.classList.add("hidden");
      if (game && typeof game.resolvePendingEventChoice === "function") {
        game.resolvePendingEventChoice(opt.type);
      }
      if (typeof renderGameState === "function") renderGameState();
      if (typeof MapRenderer !== "undefined") MapRenderer.render();
      if (game && !game.currentEntity.isHuman && game.phase === "playing") {
        setTimeout(() => game.runAITurn(), 700);
      }
    };
    box.appendChild(btn);
  });
  modal.classList.remove("hidden");
  modal.style.display = "flex";
};



window.onTeleportStepPrompt = function(step) {
  const modal = document.getElementById("teleport-step-modal");
  if (!modal) return;
  const nameEl = document.getElementById("teleport-step-unit");
  if (nameEl && game) {
    const ent = game.getEntityById(step.entityId);
    const unit = ent && ent.field.find(u => u.instanceId === step.unitInstanceId);
    nameEl.textContent = unit ? unit.name : "la creatura";
  }
  modal.classList.remove("hidden");
  modal.style.display = "flex";
  if (typeof MapRenderer !== "undefined") MapRenderer.render();
};
window.onTeleportStepDone = function() {
  const modal = document.getElementById("teleport-step-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.style.display = "none";
  }
};



window.onTempleOverwritePrompt = function(p) {
  const modal = document.getElementById("temple-overwrite-modal");
  if (!modal) return;
  const body = document.getElementById("temple-overwrite-body");
  if (body) {
    body.innerHTML = "Il Tempio è occupato da <strong>" + (p.victimName || "una creatura") + "</strong>.<br>Vuoi distruggerla per evocare la nuova carta?";
  }
  modal.classList.remove("hidden");
  modal.style.display = "flex";
};
window.onEnemyTempleWarning = function(info) {
  const modal = document.getElementById("enemy-temple-modal");
  if (!modal) return;
  const body = document.getElementById("enemy-temple-body");
  if (body) {
    body.innerHTML = "Attenzione! Stai per entrare nel Tempio di <strong>" + (info.templeOwner || "un nemico") + "</strong>.<br><br>È molto pericoloso: la tua creatura potrebbe scomparire da un momento all\'altro se resti qui dentro.";
  }
  modal.classList.remove("hidden");
  modal.style.display = "flex";
};
window.onCardPickPrompt = function(pending) {
  const modal = document.getElementById("card-pick-modal");
  const box = document.getElementById("card-pick-options");
  if (!modal || !box || !pending) return;
  box.innerHTML = "";
  const title = document.getElementById("card-pick-title");
  if (title) title.textContent = "Scegli una carta (" + ((typeof COLOR_NAMES !== "undefined" && COLOR_NAMES[pending.color]) || pending.color || "?") + ")";
  box.style.cssText = "display:flex;flex-wrap:wrap;gap:14px;justify-content:center;";
  pending.options.forEach(card => {
    const atk = card.atk != null ? card.atk : "–";
    const hp = card.hp != null ? card.hp : "–";
    const el = document.createElement("div");
    el.style.cssText = "flex:1 1 180px;max-width:220px;min-height:260px;background:linear-gradient(160deg,#1B2838,#0D1B2A);border:2px solid var(--accent,#FFD54F);border-radius:14px;padding:16px;cursor:pointer;display:flex;flex-direction:column;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,0.4);";
    el.innerHTML =
      "<div style=\"font-size:0.75rem;opacity:0.7;text-transform:uppercase;letter-spacing:0.04em;\">" + (card.type || "") + " · " + (card.color || "") + "</div>" +
      "<div style=\"font-size:1.25rem;font-weight:700;line-height:1.2;color:#FFD54F;\">" + (card.name || "?") + "</div>" +
      "<div style=\"font-size:1.1rem;margin-top:4px;\">⚡ " + (card.cost || 0) + "</div>" +
      (card.atk != null ? "<div style=\"font-size:1.35rem;font-weight:700;margin-top:auto;\">⚔ " + atk + " / ❤ " + hp + "</div>" : "<div style=\"margin-top:auto\"></div>") +
      (card.effect ? "<div style=\"font-size:0.85rem;opacity:0.85;line-height:1.35;margin-top:8px;\">" + card.effect + "</div>" : "") +
      "<div style=\"font-size:0.75rem;opacity:0.5;margin-top:6px;\">Clic = scegli · Tasto destro = ingrandisci</div>";
    el.onclick = () => {
      modal.style.display = "none";
      modal.classList.add("hidden");
      if (game) game.resolveCardPick(card.instanceId);
      if (typeof renderGameState === "function") renderGameState();
      if (typeof MapRenderer !== "undefined") MapRenderer.render();
    };
    el.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof showCardDetail === "function") showCardDetail(card, { fromHand: false, readOnly: true });
    };
    box.appendChild(el);
  });
  modal.style.zIndex = "2500";
  modal.classList.remove("hidden");
  modal.style.display = "flex";
};



// =====================================================
// SALVATAGGIO PARTITA (localStorage + codice esportabile)
// Nota: localStorage è per dispositivo. Per altro device usa Esporta/Importa codice.
// =====================================================
const SAVE_PREFIX = "penumbra_gamesave_";

function saveGameKey() {
  const s = (typeof getSession === "function") ? getSession() : null;
  const user = (s && s.username) || "guest";
  return SAVE_PREFIX + user;
}

function persistGame() {
  if (!game || game.phase === "ended" || game.phase === "setup" || game.phase === "draft") return;
  try {
    const data = game.toSaveData();
    if (typeof getSession === "function" && getSession()) {
      data.participants = data.participants || [getSession().username];
      data.owner = getSession().username;
    }
    localStorage.setItem(saveGameKey(), JSON.stringify(data));
    if (typeof cloudSaveGame === "function") {
      cloudSaveGame(data).catch(err => console.warn("Cloud save", err));
    }
  } catch (err) {
    console.warn("Salvataggio fallito", err);
  }
}

function loadPersistedGame() {
  try {
    const raw = localStorage.getItem(saveGameKey());
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearPersistedGame() {
  localStorage.removeItem(saveGameKey());
}

async function resumeSavedGame(dataOpt) {
  let data = dataOpt || null;
  if (!data && typeof cloudLoadGame === "function") {
    try { data = await cloudLoadGame(); } catch (e) { console.warn(e); }
  }
  if (!data) data = (typeof loadPersistedGame === "function") ? loadPersistedGame() : null;
  if (!data) {
    alert("Nessuna partita salvata per questo account.");
    return false;
  }
  try {
    game = GameState.fromSaveData(data);
  } catch (err) {
    console.error(err);
    alert("Salvataggio non leggibile: " + err.message);
    return false;
  }
  window.game = game;
  // Pulisci stati UI / async bloccanti
  game.selectedCard = null;
  game.selectedUnit = null;
  game.moveMode = false;
  game.playMode = false;
  game.attachMode = false;
  game.targetMode = null;
  game.sacrificeMode = false;
  game.pendingMovePath = null;
  game.pendingCardPick = null;
  game.pendingEventDetail = null;
  game.pendingEventChoice = null;
  game.pendingTeleportStep = null;
  game.pendingTeleportSteps = [];
  game.pendingTempleOverwrite = null;
  game.pendingEnemyTempleMove = null;
  game.pendingSpellTarget = null;
  game._aiTurnLock = false;
  game._endTurnEntityId = null;
  if (game.phase === "draft") {
    // non supportiamo resume a metà draft in modo affidabile
    alert("Il salvataggio è ancora in draft. Avvia una nuova partita.");
    return false;
  }
  if (!game.phase || game.phase === "setup") game.phase = "playing";

  gameUIStarted = true;
  showScreen("game");
  if (typeof MapRenderer !== "undefined") {
    MapRenderer.init("gameCanvas", game);
    setTimeout(() => { MapRenderer.center(); MapRenderer.render(); }, 50);
  }
  if (typeof renderGameState === "function") renderGameState();
  game.addLog("Partita ripresa dal salvataggio (v" + (typeof APP_VERSION !== "undefined" ? APP_VERSION : "?") + ").", true);
  persistGame();

  // Se tocca all'IA / caduto, fai ripartire il turno
  if (game.phase === "playing" && game.currentEntity && !game.currentEntity.isHuman) {
    setTimeout(() => {
      if (game && game.phase === "playing" && game.currentEntity && !game.currentEntity.isHuman) {
        game.runAITurn();
      }
    }, 600);
  }
  return true;
}

function exportSaveCode() {
  if (!game) { alert("Nessuna partita attiva."); return; }
  persistGame();
  const data = game.toSaveData();
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  const ta = document.createElement("textarea");
  ta.value = code;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch(e) {}
  document.body.removeChild(ta);
  prompt("Codice partita (copialo e usalo su un altro dispositivo con Importa):", code);
}

function importSaveCode() {
  const code = prompt("Incolla il codice partita esportato:");
  if (!code) return;
  try {
    const json = decodeURIComponent(escape(atob(code.trim())));
    const data = JSON.parse(json);
    game = GameState.fromSaveData(data);
    window.game = game;
    localStorage.setItem(saveGameKey(), JSON.stringify(data));
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const screen = document.getElementById("screen-game");
    if (screen) screen.classList.add("active");
    if (typeof MapRenderer !== "undefined") MapRenderer.init("gameCanvas", game);
    if (typeof renderGameState === "function") renderGameState();
    game.addLog("Partita importata da codice.", true);
  } catch (err) {
    alert("Codice non valido: " + err.message);
  }
}

// Auto-save agganciato a onGameUpdate


document.getElementById("btn-resume-game")?.addEventListener("click", () => resumeSavedGame());
document.getElementById("btn-import-save")?.addEventListener("click", () => importSaveCode());
document.getElementById("btn-export-save")?.addEventListener("click", () => exportSaveCode());


window.onEventDetailPrompt = function(pending) {
  const modal = document.getElementById("event-detail-modal");
  if (!modal || !pending || !pending.event) return;
  const ev = pending.event;
  const title = document.getElementById("event-detail-title");
  const narr = document.getElementById("event-detail-narrative");
  const box = document.getElementById("event-detail-choices");
  if (title) title.textContent = ev.name || "Evento";
  if (narr) narr.textContent = ev.narrative || ev.text || "";
  if (box) {
    box.innerHTML = "";
    (ev.choices || []).forEach((ch, idx) => {
      const btn = document.createElement("button");
      btn.className = "btn btn-primary";
      btn.style.cssText = "width:100%;text-align:left;margin-bottom:8px;white-space:normal;";
      btn.textContent = ch.text;
      btn.onclick = () => {
        modal.style.display = "none";
        modal.classList.add("hidden");
        if (game) game.resolveEventChoice(idx);
        if (typeof renderGameState === "function") renderGameState();
        if (typeof MapRenderer !== "undefined") MapRenderer.render();
        if (game && game.currentEntity && !game.currentEntity.isHuman && game.phase === "playing") {
          setTimeout(() => game.runAITurn(), 700);
        }
      };
      box.appendChild(btn);
    });
  }
  modal.classList.remove("hidden");
  modal.style.display = "flex";
};


window.onMovePathPrompt = function(pending, unit) {
  let panel = document.getElementById("move-path-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "move-path-panel";
    panel.style.cssText = "position:fixed;bottom:120px;left:50%;transform:translateX(-50%);z-index:2600;background:rgba(13,27,42,0.95);border:1px solid #FFD54F;border-radius:12px;padding:14px 18px;display:flex;flex-direction:column;gap:10px;min-width:280px;box-shadow:0 8px 28px rgba(0,0,0,0.5);";
    document.body.appendChild(panel);
  }
  const dest = pending.path[pending.path.length - 1];
  panel.innerHTML =
    "<div style='color:#FFD54F;font-weight:700;'>Movimento: " + (unit && unit.name ? unit.name : "creatura") + "</div>" +
    "<div style='color:#aaa;font-size:0.9rem;'>Destinazione (" + dest[0] + "," + dest[1] + ") · " + pending.path.length + " passi · <strong style='color:#fff'>costo " + (pending.cost||0) + " mana</strong></div>" +
    "<div style='display:flex;gap:8px;flex-wrap:wrap;'>" +
    "<button class='btn btn-primary' id='btn-move-yes'>Conferma</button>" +
    "<button class='btn' id='btn-move-no'>Annulla</button></div>";
  panel.style.display = "flex";
  document.getElementById("btn-move-yes").onclick = function() {
    panel.style.display = "none";
    if (game) game.confirmMovePath(true);
    if (typeof renderGameState === "function") renderGameState();
    if (typeof MapRenderer !== "undefined") MapRenderer.render();
  };
  document.getElementById("btn-move-no").onclick = function() {
    panel.style.display = "none";
    if (game) game.confirmMovePath(false);
    if (typeof renderGameState === "function") renderGameState();
    if (typeof MapRenderer !== "undefined") MapRenderer.render();
  };
};

window.onDiscoveryPrompt = function(names) {
  const list = (names || []).join(", ");
  if (typeof enqueueGamePopup === "function") {
    enqueueGamePopup("Esplorazione<br><br>Hai scoperto: <strong>" + list + "</strong>", {
      buttonLabel: "Ho capito",
      allowMap: true,
      autoSkippable: true
    });
  }
};

window.onSpellTargetPrompt = function(pending) {
  let panel = document.getElementById("spell-target-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "spell-target-panel";
    panel.style.cssText = "position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:2600;background:rgba(13,27,42,0.95);border:1px solid #b39ddb;border-radius:12px;padding:12px 16px;display:flex;flex-direction:column;gap:8px;min-width:260px;";
    document.body.appendChild(panel);
  }
  const names = (pending.targets || []).map(function(t) { return t.name; }).join(", ");
  var canConfirm = pending.selected >= 1 && pending.selected <= pending.need;
  panel.innerHTML =
    "<div style='font-weight:700;color:#b39ddb;'>" + (pending.card && pending.card.name) + "</div>" +
    "<div>Bersagli: <strong>" + pending.selected + " / fino a " + pending.need + "</strong> — " + names + "</div>" +
    "<div style='display:flex;gap:8px;'>" +
    "<button class='btn btn-primary' id='btn-spell-ok'" + (canConfirm ? "" : " disabled style='opacity:0.5'") + ">Conferma</button>" +
    "<button class='btn' id='btn-spell-cancel'>Annulla</button></div>";
  panel.style.display = "flex";
  document.getElementById("btn-spell-ok").onclick = function() {
    if (!canConfirm) return;
    panel.style.display = "none";
    if (game) game.confirmSpellCast(true);
    if (typeof renderGameState === "function") renderGameState();
    if (typeof MapRenderer !== "undefined") MapRenderer.render();
  };
  document.getElementById("btn-spell-cancel").onclick = function() {
    panel.style.display = "none";
    if (game) game.confirmSpellCast(false);
    if (typeof renderGameState === "function") renderGameState();
    if (typeof MapRenderer !== "undefined") MapRenderer.render();
  };
};



async function offerResumeOrNew(startNewFn) {
  let data = null;
  if (typeof cloudLoadGame === "function") data = await cloudLoadGame();
  if (!data && typeof loadPersistedGame === "function") data = loadPersistedGame();
  if (!data || data.phase === "ended") {
    startNewFn();
    return;
  }
  const modal = document.getElementById("resume-modal");
  if (!modal) { startNewFn(); return; }
  modal.classList.remove("hidden");
  modal.style.display = "flex";
  const ok = document.getElementById("btn-resume-spoglie");
  const no = document.getElementById("btn-abandon-frammento");
  const close = () => { modal.style.display = "none"; modal.classList.add("hidden"); };
  ok.onclick = async () => {
    close();
    await resumeSavedGame(data);
  };
  no.onclick = async () => {
    close();
    if (typeof cloudAbandonGame === "function") await cloudAbandonGame();
    if (typeof clearPersistedGame === "function") clearPersistedGame();
    startNewFn();
  };
}




window.onHexInspect = function(q, r, unit) {
  const g = window.game;
  if (!g) return;
  const key = q + "," + r;
  const type = (typeof CELL_TYPE !== "undefined" && CELL_TYPE.get(key)) || "plain";
  const human = g.entities.find(e => e.isHuman);
  const discovered = g.isCellDiscovered(q, r, human);
  let placeName, placeDesc;
  if (!discovered && type !== "mountain" && type !== "temple" && key !== "0,0") {
    placeName = "? Terreno inesplorato";
    placeDesc = "Non ancora scoperto. Il tipo si rivela a fine turno se una creatura termina qui.";
  } else {
    placeName = (g.tileDisplayName && g.tileDisplayName(type)) || type;
    placeDesc = "";
    if (typeof TILE_TYPE_DEFS !== "undefined" && TILE_TYPE_DEFS[type]) {
      placeName = (TILE_TYPE_DEFS[type].icon ? TILE_TYPE_DEFS[type].icon + " " : "") + (TILE_TYPE_DEFS[type].name || placeName);
      placeDesc = TILE_TYPE_DEFS[type].desc || "";
    }
    if (type === "temple" && typeof TEMPLES !== "undefined" && TEMPLES[key]) {
      placeName = (TEMPLES[key].icon || "") + " " + (TEMPLES[key].name || placeName);
      placeDesc = (TILE_TYPE_DEFS.temple && TILE_TYPE_DEFS.temple.desc) || placeDesc;
    }
  }

  let panel = document.getElementById("hex-inspect-panel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "hex-inspect-panel";
    panel.style.cssText = "position:fixed;inset:0;z-index:2700;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;padding:16px;";
    document.body.appendChild(panel);
  }
  const left = "<div style='flex:1;min-width:200px;background:#1B2838;border:1px solid #64FFDA;border-radius:12px;padding:16px;'>" +
    "<div style='color:#64FFDA;font-weight:700;font-size:1.1rem;margin-bottom:8px;'>Luogo</div>" +
    "<div style='font-size:1.05rem;margin-bottom:8px;'>" + placeName + "</div>" +
    "<div style='opacity:0.75;font-size:0.85rem;margin-bottom:8px;'>(" + q + "," + r + ")</div>" +
    "<div style='line-height:1.5;color:#E0D6C8;'>" + (placeDesc || "Nessuna descrizione.") + "</div></div>";

  let right = "<div style='flex:1;min-width:200px;background:#1B2838;border:1px solid #FFD54F;border-radius:12px;padding:16px;'>" +
    "<div style='color:#FFD54F;font-weight:700;font-size:1.1rem;margin-bottom:8px;'>Creatura</div>";
  if (unit) {
    const owner = g.getEntityById(unit.ownerId);
    const atk = (unit.atk || 0) + (unit.permanentAtkBonus || 0);
    const hp = unit.currentHp !== undefined ? unit.currentHp : unit.hp;
    right += "<div style='font-size:1.1rem;font-weight:700;'>" + unit.name + "</div>" +
      "<div style='margin:8px 0;'>⚔ " + atk + " / ❤ " + hp + (unit.shields ? " · scudi " + unit.shields : "") + "</div>" +
      "<div style='opacity:0.8;'>Proprietario: " + (owner ? owner.name : "?") + (owner && owner.isFallen ? " [CADUTO]" : "") + "</div>" +
      (unit.isWithered ? "<div style='color:#FF8A65;margin-top:6px;'>AVVIZZITA</div>" : "") +
      "<div id='hex-inspect-actions' style='display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;'></div>";
  } else {
    right += "<div style='opacity:0.7;'>Nessuna creatura su questa cella.</div>";
  }
  right += "</div>";

  panel.innerHTML = "<div style='display:flex;gap:16px;flex-wrap:wrap;max-width:820px;width:100%;'>" + left + right +
    "<div style='width:100%;text-align:center;margin-top:8px;'><button class='btn' id='hex-inspect-close'>Chiudi</button></div></div>";
  panel.style.display = "flex";
  document.getElementById("hex-inspect-close").onclick = function() {
    panel.style.display = "none";
  };

  const actions = document.getElementById("hex-inspect-actions");
  if (actions && unit && g.currentEntity && g.currentEntity.isHuman && unit.ownerId === g.currentEntity.id && g.phase === "playing") {
    const btnM = document.createElement("button");
    btnM.className = "btn btn-primary";
    btnM.textContent = "Muovi";
    btnM.onclick = function() {
      panel.style.display = "none";
      if (unit && unit.instanceId) {
        g.selectUnit(unit.instanceId);
      }
      if (typeof renderGameState === "function") renderGameState();
      if (typeof MapRenderer !== "undefined") MapRenderer.render();
    };
    if (unit.isWithered) {
      btnM.disabled = true;
      btnM.style.opacity = "0.5";
      btnM.title = "Avvizzita";
    }
    actions.appendChild(btnM);
  }
};

