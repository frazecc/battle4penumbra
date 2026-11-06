// =====================================================
// AUTH – Supabase (preferito) + fallback localStorage
// Username digitato: "fra" → email fra@test.local
// =====================================================

const AUTH_KEY = "penumbra_users";
const SESSION_KEY = "penumbra_session";
const SAVE_CLOUD_PREFIX = "penumbra_gamesave_";

function _cfg() {
  return (typeof window !== "undefined" && window.PENUMBRA_CONFIG) ? window.PENUMBRA_CONFIG : {};
}

function usernameToEmail(username) {
  const u = String(username || "").trim().toLowerCase();
  const domain = _cfg().EMAIL_DOMAIN || "test.local";
  if (u.includes("@")) return u;
  return u + "@" + domain;
}

function emailToUsername(email) {
  if (!email) return "";
  return String(email).split("@")[0].toLowerCase();
}

function hasSupabase() {
  const c = _cfg();
  return !!(c.SUPABASE_URL && c.SUPABASE_ANON_KEY && typeof supabase !== "undefined");
}

let _sb = null;
function getSupabase() {
  if (!hasSupabase()) return null;
  if (_sb) return _sb;
  _sb = supabase.createClient(_cfg().SUPABASE_URL, _cfg().SUPABASE_ANON_KEY);
  return _sb;
}

// ----- localStorage helpers (fallback) -----
function getUsers() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)) || {}; } catch { return {}; }
}
function saveUsers(users) { localStorage.setItem(AUTH_KEY, JSON.stringify(users)); }

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    username: user.username,
    email: user.email || usernameToEmail(user.username),
    createdAt: user.createdAt || Date.now(),
    loginAt: Date.now(),
    backend: user.backend || "local"
  }));
}
function clearSession() { localStorage.removeItem(SESSION_KEY); }

async function register(username, password) {
  username = String(username || "").trim().toLowerCase();
  const minP = _cfg().MIN_PASSWORD_LEN || 4;
  if (!username || username.length < 2) return { ok: false, error: "Username troppo corto." };
  if (!password || password.length < minP) return { ok: false, error: "Password troppo corta." };
  const email = usernameToEmail(username);

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return { ok: false, error: error.message };
    setSession({ username, email, backend: "supabase", createdAt: Date.now() });
    return { ok: true, user: { username, email }, backend: "supabase" };
  }

  const users = getUsers();
  if (users[username]) return { ok: false, error: "Username già in uso." };
  users[username] = { username, email, password, createdAt: Date.now() };
  saveUsers(users);
  setSession({ username, email, backend: "local", createdAt: users[username].createdAt });
  return { ok: true, user: users[username], backend: "local" };
}

async function login(username, password) {
  username = String(username || "").trim().toLowerCase();
  const email = usernameToEmail(username);
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    setSession({ username, email, backend: "supabase", createdAt: Date.now() });
    return { ok: true, user: { username, email }, backend: "supabase" };
  }

  const users = getUsers();
  const user = users[username];
  if (!user) return { ok: false, error: "Utente non trovato." };
  if (user.password !== password) return { ok: false, error: "Password errata." };
  setSession({ username, email: user.email || email, backend: "local", createdAt: user.createdAt });
  return { ok: true, user, backend: "local" };
}

function logout() {
  const sb = getSupabase();
  if (sb) sb.auth.signOut().catch(() => {});
  clearSession();
}

function isLoggedIn() { return !!getSession(); }
function getCurrentUser() { return getSession(); }

// ----- Game save (cloud + local) -----
function localSaveKey() {
  const s = getSession();
  return SAVE_CLOUD_PREFIX + ((s && s.username) || "guest");
}

async function cloudSaveGame(saveData) {
  const session = getSession();
  if (!session) return { ok: false, error: "Non loggato" };
  const payload = {
    ...saveData,
    owner: session.username,
    participants: saveData.participants || [session.username],
    updatedAt: Date.now()
  };
  // Always local mirror
  try { localStorage.setItem(localSaveKey(), JSON.stringify(payload)); } catch (e) {}

  const sb = getSupabase();
  if (!sb) return { ok: true, backend: "local" };

  const row = {
    owner: session.username,
    participants: payload.participants,
    status: payload.phase === "ended" ? "ended" : "active",
    state: payload,
    updated_at: new Date().toISOString()
  };
  // Upsert by owner active game (simple: one active game per owner for now)
  const { data: existing } = await sb.from("games").select("id").eq("owner", session.username).eq("status", "active").limit(1);
  if (existing && existing.length) {
    const { error } = await sb.from("games").update(row).eq("id", existing[0].id);
    if (error) return { ok: false, error: error.message, backend: "supabase" };
  } else {
    const { error } = await sb.from("games").insert(row);
    if (error) return { ok: false, error: error.message, backend: "supabase" };
  }
  return { ok: true, backend: "supabase" };
}

async function cloudLoadGame() {
  const session = getSession();
  if (!session) return null;
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from("games")
      .select("state, status, id")
      .contains("participants", [session.username])
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (!error && data && data.length) return data[0].state;
  }
  try {
    const raw = localStorage.getItem(localSaveKey());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function cloudAbandonGame() {
  const session = getSession();
  if (!session) return;
  localStorage.removeItem(localSaveKey());
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("games").update({ status: "abandoned" }).eq("owner", session.username).eq("status", "active");
}

// Export globals
if (typeof window !== "undefined") {
  window.usernameToEmail = usernameToEmail;
  window.register = register;
  window.login = login;
  window.logout = logout;
  window.isLoggedIn = isLoggedIn;
  window.getCurrentUser = getCurrentUser;
  window.getSession = getSession;
  window.cloudSaveGame = cloudSaveGame;
  window.cloudLoadGame = cloudLoadGame;
  window.cloudAbandonGame = cloudAbandonGame;
  window.hasSupabase = hasSupabase;
}
