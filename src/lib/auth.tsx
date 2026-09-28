import { storage } from './storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from './api';
import type { AuthUser } from './types';

const SESSION_KEY = 'hotel-mgmt-session';
const MANAGEMENT_ROLES = ['SuperAdmin', 'Admin', 'Manager'];

interface Session {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** False until the saved session has been read from secure storage */
  ready: boolean;
  /** SuperAdmin, Admin or Manager: runs the front desk (bookings, payments, check-in/out) */
  canManage: boolean;
  /** Housekeeper without a management role: works the housekeeping tasks and rooms */
  isHousekeeper: boolean;
  /** Works at a hotel (management or housekeeper): picks a hotel and sees its rooms and tasks */
  isStaff: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function tokenPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
  } catch {
    return null;
  }
}

// Reads the JWT's exp claim; unreadable tokens count as expired
function isTokenExpired(token: string): boolean {
  const exp = tokenPayload(token)?.exp;
  return typeof exp !== 'number' || exp * 1000 <= Date.now();
}

// The API puts the user id in the NameIdentifier claim, which may be written short or long
function userIdFromToken(token: string): string {
  const payload = tokenPayload(token) ?? {};
  const id =
    payload.nameid ?? payload.sub ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
  return typeof id === 'string' ? id : '';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await storage.remove(SESSION_KEY);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void logout());
    storage.get(SESSION_KEY)
      .then((saved) => {
        if (!saved) return;
        const session = JSON.parse(saved) as Session;
        if (isTokenExpired(session.token)) return storage.remove(SESSION_KEY);
        setAuthToken(session.token);
        // Sessions saved by the first app version have no id
        setUser({ ...session.user, id: userIdFromToken(session.token) });
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    const session: Session = {
      token: response.token,
      user: {
        id: userIdFromToken(response.token),
        email: response.email,
        fullName: response.fullName,
        roles: response.roles,
      },
    };
    setAuthToken(session.token);
    setUser(session.user);
    await storage.set(SESSION_KEY, JSON.stringify(session));
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const canManage = !!user?.roles.some((role) => MANAGEMENT_ROLES.includes(role));
    const isHousekeeper = !canManage && !!user?.roles.includes('Housekeeper');
    return { user, ready, canManage, isHousekeeper, isStaff: canManage || isHousekeeper, login, logout };
  }, [user, ready, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
