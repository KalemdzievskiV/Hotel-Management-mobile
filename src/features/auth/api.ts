import { request } from '@/lib/http';
import type { AuthResponse } from '@/lib/types';

export interface Registration {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export const authApi = {
  login: (email: string, password: string) => request<AuthResponse>('POST', '/Auth/login', { email, password }),
  /** Creates a guest account and signs it in */
  register: (registration: Registration) =>
    request<AuthResponse>('POST', '/Auth/register', { ...registration, role: 'Guest' }),
  /** Ends this device's session on the server; the refresh token stops working */
  logout: (refreshToken: string) => request<void>('POST', '/Auth/logout', { refreshToken }),
  /** Other devices are signed out; this one gets new tokens */
  changePassword: (currentPassword: string, newPassword: string) =>
    request<AuthResponse>('POST', '/Auth/change-password', { currentPassword, newPassword }),
};

/** The API's sign-up rules, checked on the phone so mistakes show while typing */
export const PASSWORD_RULES: { label: string; test: (password: string) => boolean }[] = [
  { label: 'At least 6 characters', test: (p) => p.length >= 6 },
  { label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'A number', test: (p) => /[0-9]/.test(p) },
];

export const NAME_PATTERN = /^[\p{L}\p{M}\s\-'.]+$/u;

/** Null when the name is fine, otherwise what's wrong with it */
export function nameError(value: string, field: string): string | null {
  const name = value.trim();
  if (name.length < 2) return `${field} must be at least 2 characters`;
  if (!NAME_PATTERN.test(name)) return `${field} can only contain letters, spaces, hyphens and apostrophes`;
  return null;
}
