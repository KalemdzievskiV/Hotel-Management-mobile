import { storage } from './storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from './api';
import type { AuthUser } from './types';

const SESSION_KEY = 'hotel-mgmt-session';
const STAFF_ROLES = ['SuperAdmin', 'Admin', 'Manager'];

interface Session {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** False until the saved session has been read from secure storage */
  ready: boolean;
  /** SuperAdmin, Admin or Manager: can see hotel bookings and check guests in/out */
  isStaff: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Reads the JWT's exp claim; unreadable tokens count as expired
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
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
        setUser(session.user);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    const session: Session = {
      token: response.token,
      user: { email: response.email, fullName: response.fullName, roles: response.roles },
    };
    setAuthToken(session.token);
    setUser(session.user);
    await storage.set(SESSION_KEY, JSON.stringify(session));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      isStaff: !!user?.roles.some((role) => STAFF_ROLES.includes(role)),
      login,
      logout,
    }),
    [user, ready, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
