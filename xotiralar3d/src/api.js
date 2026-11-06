const BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function request(path, { method = 'GET', body, initData } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (initData) headers.Authorization = `Bearer ${initData}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.detail || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function health() {
  return request('/api/health');
}

export async function getSongs() {
  return request('/api/songs');
}

export async function createWish(body, initData) {
  return request('/api/wishes', { method: 'POST', body: { body }, initData });
}

// helper with loading state
export async function withLoading(fn, setLoading) {
  setLoading?.(true);
  try { return await fn(); }
  finally { setLoading?.(false); }
}
