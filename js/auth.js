// =====================================================
// AUTH SYSTEM (localStorage based - ready for Supabase upgrade)
// =====================================================

const AUTH_KEY = "penumbra_users";
const SESSION_KEY = "penumbra_session";

function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY)) || {};
  } catch {
    return {};
  }
}

function saveUsers(users) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(users));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function setSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    username: user.username,
    createdAt: user.createdAt,
    loginAt: Date.now()
  }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function register(username, password) {
  username = username.trim().toLowerCase();
  if (!username || username.length < 3) {
    return { ok: false, error: "Username deve avere almeno 3 caratteri." };
  }
  if (!password || password.length < 4) {
    return { ok: false, error: "Password deve avere almeno 4 caratteri." };
  }

  const users = getUsers();
  if (users[username]) {
    return { ok: false, error: "Username già in uso." };
  }

  users[username] = {
    username,
    password, // In produzione: hash!
    createdAt: Date.now()
  };
  saveUsers(users);
  setSession(users[username]);
  return { ok: true, user: users[username] };
}

function login(username, password) {
  username = username.trim().toLowerCase();
  const users = getUsers();
  const user = users[username];

  if (!user) {
    return { ok: false, error: "Utente non trovato." };
  }
  if (user.password !== password) {
    return { ok: false, error: "Password errata." };
  }

  setSession(user);
  return { ok: true, user };
}

function logout() {
  clearSession();
}

function isLoggedIn() {
  return !!getSession();
}

function getCurrentUser() {
  return getSession();
}

// Session confirmation ("Sono io / Non sono io")
function needsSessionConfirm() {
  const session = getSession();
  if (!session) return false;// =====================================================
  // AUTH SYSTEM (localStorage based - ready for Supabase upgrade)
  // =====================================================
  
  const AUTH_KEY = "penumbra_users";
  const SESSION_KEY = "penumbra_session";
  
  function getUsers() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_KEY)) || {};
    } catch {
      return {};
    }
  }
  
  function saveUsers(users) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(users));
  }
  
  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch {
      return null;
    }
  }
  
  function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      username: user.username,
      createdAt: user.createdAt,
      loginAt: Date.now()
    }));
  }
  
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }
  
  function register(username, password) {
    username = username.trim().toLowerCase();
    if (!username || username.length < 3) {
      return { ok: false, error: "Username deve avere almeno 3 caratteri." };
    }
    if (!password || password.length < 4) {
      return { ok: false, error: "Password deve avere almeno 4 caratteri." };
    }
  
    const users = getUsers();
    if (users[username]) {
      return { ok: false, error: "Username già in uso." };
    }
  
    users[username] = {
      username,
      password, // In produzione: hash!
      createdAt: Date.now()
    };
    saveUsers(users);
    setSession(users[username]);
    return { ok: true, user: users[username] };
  }
  
  function login(username, password) {
    username = username.trim().toLowerCase();
    const users = getUsers();
    const user = users[username];
  
    if (!user) {
      return { ok: false, error: "Utente non trovato." };
    }
    if (user.password !== password) {
      return { ok: false, error: "Password errata." };
    }
  
    setSession(user);
    return { ok: true, user };
  }
  
  function logout() {
    clearSession();
  }
  
  function isLoggedIn() {
    return !!getSession();
  }
  
  function getCurrentUser() {
    return getSession();
  }
  
  // Session confirmation ("Sono io / Non sono io")
  function needsSessionConfirm() {
    const session = getSession();
    if (!session) return false;
    // If last login > 12 hours ago, ask confirmation
    const hours = (Date.now() - (session.loginAt || 0)) / (1000 * 60 * 60);
    return hours > 12;
  }
  
  // If last login > 12 hours ago, ask confirmation
  const hours = (Date.now() - (session.loginAt || 0)) / (1000 * 60 * 60);
  return hours > 12;
}
