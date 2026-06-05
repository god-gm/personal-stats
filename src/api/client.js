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

export async function getCurrentSeason() {
  return request('/api/raid/current-season');
}
