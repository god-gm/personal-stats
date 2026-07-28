const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function getToken() {
  return localStorage.getItem('jwt_token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json();
  if (!response.ok) {
    throw { status: response.status, message: body?.message || 'Errore di rete' };
  }
  return body;
}

export async function login(discordName) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ discordName }),
  });
}

export async function discordCallback(code) {
  return request('/api/auth/discord/callback', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function getCurrentSeason() {
  return request('/api/raid/current-season');
}

export async function getCurrentSeasonGuildBest() {
  return request('/api/raid/current-season/guild-best');
}

export async function getPlayerInfo() {
  return request('/api/player/info');
}

// ── Admin ───────────────────────────────────────────────────────────────────

export async function getTokenUsage() {
  return request('/api/admin/token-usage');
}

export async function getGuildStats() {
  return request('/api/admin/guild-stats');
}

export async function getTargetConsigliato(unitId, rarity) {
  return request(`/api/admin/target-consigliato?unitId=${encodeURIComponent(unitId)}&rarity=${encodeURIComponent(rarity)}`);
}

export async function getTargetAttacks(unitId, rarity) {
  return request(`/api/admin/target-attacks?unitId=${encodeURIComponent(unitId)}&rarity=${encodeURIComponent(rarity)}`);
}

// ── Anag ────────────────────────────────────────────────────────────────────

export async function getLevels() {
  return request('/api/anag/levels');
}

export async function getBosses() {
  return request('/api/anag/bosses');
}

// ── Assignments ─────────────────────────────────────────────────────────────

export async function computeAssignmentStats(levels) {
  return request('/api/assignments/stats', {
    method: 'POST',
    body: JSON.stringify({ levels }),
  });
}

export async function listSavedAssignments() {
  return request('/api/assignments/list');
}

export async function saveAssignment(name, seasonNumber, assignmentData, hiddenSides = []) {
  return request('/api/assignments/save', {
    method: 'POST',
    body: JSON.stringify({ name, seasonNumber, assignmentData, hiddenSides }),
  });
}

export async function loadHiddenSides(name) {
  return request(`/api/assignments/hidden-sides?name=${encodeURIComponent(name)}`);
}

export async function loadAssignment(name, seasonNumber) {
  return request(`/api/assignments/load?name=${encodeURIComponent(name)}&seasonNumber=${seasonNumber}`);
}

export async function checkAssignmentExists(name, seasonNumber) {
  return request(`/api/assignments/exists?name=${encodeURIComponent(name)}&seasonNumber=${seasonNumber}`);
}
