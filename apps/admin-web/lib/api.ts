'use client';

import { getSession } from './session';

export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '');

async function handle<T = unknown>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      const m = (body as { error?: { message?: string } }).error?.message;
      if (m) message = m;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function get<T = unknown>(path: string, query?: Record<string, string | number | undefined>): Promise<T> {
  const session = getSession();
  const params = new URLSearchParams();
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.append(k, String(v));
    });
  }
  const qs = params.toString();
  const res = await fetch(`${API_BASE}${path}${qs ? `?${qs}` : ''}`, {
    headers: session ? { Authorization: `Bearer ${session.token}` } : {},
  });
  return handle<T>(res);
}

export async function post<T = unknown>(path: string, body?: unknown): Promise<T> {
  const session = getSession();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle<T>(res);
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handle<{ token: string; user: { id: string; name: string; email: string; role: string } }>(res);
}