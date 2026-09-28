import type { AuthResponse, Hotel, Reservation } from './types';

// A phone can't reach "localhost" on your computer: set EXPO_PUBLIC_API_URL to the
// computer's LAN address, e.g. http://192.168.1.20:5001/api (see README)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5001/api';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Called when the API rejects the session (expired, deactivated, roles changed) */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`Can't reach the server at ${API_URL}`, 0);
  }

  const text = await response.text();
  const data = text ? safeJson(text) : undefined;

  if (!response.ok) {
    // A 401 from login is just a wrong password; anywhere else the session has ended
    if (response.status === 401 && !path.startsWith('/Auth/')) onUnauthorized?.();
    throw new ApiError(errorMessage(data, response.status), response.status);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Same rule as the web app: the API's own message when it sent one
function errorMessage(data: unknown, status: number): string {
  if (typeof data === 'string' && data) return data;
  if (data && typeof data === 'object') {
    const { message, title } = data as { message?: unknown; title?: unknown };
    if (typeof message === 'string' && message) return message;
    if (typeof title === 'string' && title) return title;
  }
  if (status === 401) return 'Invalid email or password';
  if (status === 403) return "You don't have access to this";
  return `Request failed (${status})`;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('POST', '/Auth/login', { email, password }),

  hotels: () => request<Hotel[]>('GET', '/Hotels/public'),

  // Guests get their own bookings; staff get bookings for the hotels they work at
  reservations: () => request<Reservation[]>('GET', '/Reservations'),
  reservation: (id: number) => request<Reservation>('GET', `/Reservations/${id}`),
  todaysCheckIns: () => request<Reservation[]>('GET', '/Reservations/today/check-ins'),
  todaysCheckOuts: () => request<Reservation[]>('GET', '/Reservations/today/check-outs'),

  confirm: (id: number) => request<Reservation>('POST', `/Reservations/${id}/confirm`),
  checkIn: (id: number) => request<Reservation>('POST', `/Reservations/${id}/checkin`),
  checkOut: (id: number) => request<Reservation>('POST', `/Reservations/${id}/checkout`),
  cancel: (id: number, reason: string) =>
    request<Reservation>('POST', `/Reservations/${id}/cancel`, { reason }),
};
