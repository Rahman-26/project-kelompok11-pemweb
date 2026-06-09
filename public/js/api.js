const API_BASE = '/api';

function getToken() {
  return sessionStorage.getItem('token');
}

function setToken(token) {
  sessionStorage.setItem('token', token);
}

function clearToken() {
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
}

function setUser(user) {
  sessionStorage.setItem('user', JSON.stringify(user));
}

function getUser() {
  const raw = sessionStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = { success: false, data: null, message: 'Invalid server response' };
  }

  if (!response.ok || !payload.success) {
    const message = payload.message || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

const api = {
  getToken,
  setToken,
  clearToken,
  getUser,
  setUser,
  register: (body) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => apiRequest('/auth/me'),
  getWorkspaces: () => apiRequest('/workspaces'),
  getWorkspace: (id) => apiRequest(`/workspaces/${id}`),
  createWorkspace: (body) => apiRequest('/workspaces', { method: 'POST', body: JSON.stringify(body) }),
  getTasks: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/tasks?${query}`);
  },
  createTask: (body) => apiRequest('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id, body) => apiRequest(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTask: (id) => apiRequest(`/tasks/${id}`, { method: 'DELETE' }),
};

window.api = api;
