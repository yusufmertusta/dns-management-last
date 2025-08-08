// Centralized API utility for backend communication and JWT management

const API_BASE = 'http://localhost:4000'; // Backend server URL

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  requireAuth = true
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (requireAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.error || error.message || 'API Error');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export async function login(email: string, password: string) {
  const data = await apiFetch<{ token: string }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    false
  );
  setToken(data.token);
  return data;
}

export async function register(email: string, password: string) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, false);
}

export function logout() {
  clearToken();
}

// User info (decode from JWT or fetch from backend if needed)
export function getUserFromToken(): { id: string; email: string; isAdmin: boolean } | null {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { id: payload.id, email: payload.email, isAdmin: payload.isAdmin };
  } catch {
    return null;
  }
}

// Domains
export async function getDomains() {
  return apiFetch('/domains', { method: 'GET' });
}
export async function createDomain(name: string, userId?: string) {
  return apiFetch('/domains', {
    method: 'POST',
    body: JSON.stringify(userId ? { name, userId } : { name }),
  });
}
export async function deleteDomain(id: string) {
  return apiFetch(`/domains/${id}`, { method: 'DELETE' });
}

// DNS Records
export async function getDNSRecords(domainId: string) {
  return apiFetch(`/domains/${domainId}/records`, { method: 'GET' });
}
export async function createDNSRecord(domainId: string, data: any) {
  return apiFetch(`/records/${domainId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
export async function updateDNSRecord(id: string, data: any) {
  return apiFetch(`/records/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
export async function deleteDNSRecord(id: string) {
  return apiFetch(`/records/${id}`, { method: 'DELETE' });
}

