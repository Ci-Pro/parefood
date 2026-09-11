'use client';

export interface AdminSession {
  token: string;
  name: string;
  email: string;
  role: string;
}

const KEY = 'parefood-admin-web';

export function getSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

export function setSession(session: AdminSession) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  }
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(KEY);
  }
}

export const ADMIN_ROLES = ['admin_operations', 'super_admin'];

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role);
}