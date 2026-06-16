'use client';

const TOKEN_KEY = 'movsikel_admin_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Calls the backend API with the admin bearer token and unwraps the envelope. */
export async function adminFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined)
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...init, headers });
  let body: ApiResult<T>;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Server error (${res.status}).`);
  }

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/admin/login';
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok || !body.ok) {
    throw new Error((body as { error?: string }).error || `Request failed (${res.status}).`);
  }
  return (body as { data: T }).data;
}
