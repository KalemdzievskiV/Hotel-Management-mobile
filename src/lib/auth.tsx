import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '@/features/auth/api';
import { setSessionHandlers, setTokens } from './http';
import { isTokenExpired, userIdFromToken } from './jwt';
import { clearQueryCache } from './query';
import { storage } from './storage';
import type { AuthResponse, AuthUser } from './types';

const SESSION_KEY = 'hotel-mgmt-session';
const MANAGEMENT_ROLES = ['SuperAdmin', 'Admin', 'Manager'];

interface Session {
  token: string;
  /** Missing in sessions saved by app versions before refresh tokens */
  refreshToken?: string;
  refreshTokenExpiresAt?: string;
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

function toSession(auth: AuthResponse): Session {
  return {
    token: auth.token,
    refreshToken: auth.refreshToken,
    refreshTokenExpiresAt: auth.refreshTokenExpiresAt,
    user: { id: userIdFromToken(auth.token), email: auth.email, fullName: auth.fullName, roles: auth.roles },
  };
}

/** Whether a saved session can still be used, directly or by renewing it */
function isUsable(session: Session): boolean {
  if (session.refreshToken) {
    return !session.refreshTokenExpiresAt || new Date(session.refreshTokenExpiresAt).getTime() > Date.now();
  }
  return !isTokenExpired(session.token);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const sessionRef = useRef<Session | null>(null);

  const save = useCallback(async (session: Session | null) => {
    sessionRef.current = session;
    setTokens(session ? { token: session.token, refreshToken: session.refreshToken } : null);
    setUser(session?.user ?? null);
    if (session) await storage.set(SESSION_KEY, JSON.stringify(session));
    else await storage.remove(SESSION_KEY);
  }, []);

  const endSession = useCallback(async () => {
    await save(null);
    await clearQueryCache();
  }, [save]);

  const logout = useCallback(async () => {
    const refreshToken = sessionRef.current?.refreshToken;
    await endSession();
    // Best effort: the device has forgotten the session either way
    if (refreshToken) authApi.logout(refreshToken).catch(() => undefined);
  }, [endSession]);

  useEffect(() => {
    setSessionHandlers({
      onRefreshed: (auth) => void save(toSession(auth)),
      onEnded: () => void endSession(),
    });

    storage
      .get(SESSION_KEY)
      .then(async (saved) => {
        if (!saved) return;
        const session = JSON.parse(saved) as Session;
        if (!isUsable(session)) return storage.remove(SESSION_KEY);
        // Sessions saved by the first app version have no user id
        const id = session.user.id || userIdFromToken(session.token);
        await save({ ...session, user: { ...session.user, id } });
      })
      .catch(() => undefined)
      .finally(() => setReady(true));

    return () => setSessionHandlers(null);
  }, [save, endSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await authApi.login(email, password);
      await clearQueryCache();
      await save(toSession(auth));
    },
    [save]
  );

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
