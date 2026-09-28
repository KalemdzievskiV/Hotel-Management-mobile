import { isTokenExpired } from './jwt';
import type { AuthResponse } from './types';

// A phone can't reach "localhost" on your computer: set EXPO_PUBLIC_API_URL to the
// computer's LAN address, e.g. http://192.168.1.20:5001/api (see README)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5001/api';

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface Tokens {
  token: string;
  /** Missing in sessions saved before the API issued refresh tokens */
  refreshToken?: string;
}

interface SessionHandlers {
  /** New tokens were issued; save them */
  onRefreshed: (auth: AuthResponse) => void;
  /** The session can't be renewed (expired, revoked, deactivated, roles changed) */
  onEnded: () => void;
}

let tokens: Tokens | null = null;
let handlers: SessionHandlers | null = null;
let refreshing: Promise<boolean> | null = null;

export function setTokens(value: Tokens | null) {
  tokens = value;
}

export function setSessionHandlers(value: SessionHandlers | null) {
  handlers = value;
}

function endSession() {
  tokens = null;
  handlers?.onEnded();
}

/**
 * Swaps the refresh token for new tokens. Concurrent callers share one request: each refresh
 * token works only once, and using one twice makes the API end every session of the user.
 * Resolves false when the session is over; throws when the server can't be reached.
 */
function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    const refreshToken = tokens?.refreshToken;
    if (!refreshToken) return false;
    try {
      const auth = await send<AuthResponse>('POST', '/Auth/refresh', { refreshToken }, null);
      tokens = { token: auth.token, refreshToken: auth.refreshToken };
      handlers?.onRefreshed(auth);
      return true;
    } catch (e) {
      if (e instanceof ApiError && e.status !== 0 && e.status < 500) return false;
      throw e;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function send<T>(method: string, path: string, body: unknown, token: string | null): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`Can't reach the server. Check your connection.`, 0);
  }

  const text = await response.text();
  const data = text ? safeJson(text) : undefined;
  if (!response.ok) throw new ApiError(errorMessage(data, response.status), response.status);
  return data as T;
}

/** An authenticated API call; renews the session when the access token has expired */
export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  // Sign-in calls don't use a session, and a 401 there is just a wrong password
  if (path.startsWith('/Auth/')) return send<T>(method, path, body, null);

  // Renew ahead of time rather than waiting for a 401
  if (tokens?.refreshToken && isTokenExpired(tokens.token, 30)) {
    if (!(await refreshTokens())) {
      endSession();
      throw new ApiError('Your session has ended. Please sign in again.', 401);
    }
  }

  const usedToken = tokens?.token ?? null;
  try {
    return await send<T>(method, path, body, usedToken);
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;

    // Another call may have renewed the session while this one was in flight
    const renewed = tokens !== null && tokens.token !== usedToken;
    if (renewed || (await refreshTokens())) return send<T>(method, path, body, tokens?.token ?? null);

    endSession();
    throw e;
  }
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

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}
