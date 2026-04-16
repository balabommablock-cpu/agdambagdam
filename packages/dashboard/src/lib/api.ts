const API_URL = import.meta.env.VITE_API_URL || '';

const API_KEY_STORAGE_KEY = 'abacus_api_key';
const PROJECT_ID_STORAGE_KEY = 'abacus_project_id';

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function getProjectId(): string {
  return localStorage.getItem(PROJECT_ID_STORAGE_KEY) || '';
}

export function setProjectId(id: string): void {
  localStorage.setItem(PROJECT_ID_STORAGE_KEY, id);
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': getApiKey(),
      'x-project-id': getProjectId(),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }
  return res.json();
}

// Typed API helpers
export const apiGet = <T>(path: string) => api<T>(path);

export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPut = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T>(path: string) =>
  api<T>(path, { method: 'DELETE' });
