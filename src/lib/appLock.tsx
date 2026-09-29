import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { AndroidSymbol, IosSymbol } from '@/components/Icon';
import { useAuth } from './auth';
import { storage } from './storage';

// Holds the id of the user who turned the lock on, so it never applies to someone else who
// signs in on the same phone
const LOCK_KEY = 'hotel-mgmt-app-lock';

/** Away this long (in the background) and the app asks again; opening it fresh always asks */
const LOCK_AFTER_MS = 5 * 60 * 1000;

export interface Biometrics {
  /** The phone has a fingerprint reader or face unlock, and it's set up */
  available: boolean;
  /** "Face ID", "Fingerprint", … for labels */
  label: string;
  icon: { ios: IosSymbol; android: AndroidSymbol };
}

const NONE: Biometrics = { available: false, label: 'Biometrics', icon: { ios: 'lock', android: 'lock' } };

async function detectBiometrics(): Promise<Biometrics> {
  if (Platform.OS === 'web') return NONE;
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const fingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    return {
      available: hardware && enrolled,
      label: face && Platform.OS === 'ios' ? 'Face ID' : face && !fingerprint ? 'Face unlock' : fingerprint ? 'Fingerprint' : 'Biometrics',
      icon: face && !fingerprint ? { ios: 'faceid', android: 'face' } : { ios: 'touchid', android: 'fingerprint' },
    };
  } catch {
    return NONE;
  }
}

/** Shows the phone's fingerprint / face prompt; the phone's PIN works as a fallback */
async function authenticate(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel: 'Cancel' });
  return result.success;
}

interface AppLockContextValue {
  biometrics: Biometrics;
  /** The signed-in user turned the lock on on this phone */
  enabled: boolean;
  /** Something is covering the app: the lock screen, or a blank screen while the setting loads */
  status: 'checking' | 'locked' | 'unlocked';
  /** Asks for a fingerprint / face first, so nobody turns it on for a phone they can't unlock */
  setEnabled: (enabled: boolean) => Promise<boolean>;
  unlock: () => Promise<boolean>;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

/**
 * Optional app lock (off by default): when on, opening the app, or coming back after
 * a few minutes away, needs the phone's fingerprint / face (or its PIN).
 * The session itself stays signed in; this only covers the screen.
 */
export function AppLockProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const userId = user?.id ?? null;
  const [biometrics, setBiometrics] = useState<Biometrics>(NONE);
  // Who the saved setting is for; undefined until it has been read
  const [lockedFor, setLockedFor] = useState<string | null | undefined>(undefined);
  // Who has unlocked since the app last locked. Empty at start, so a restored session starts locked.
  const [unlockedFor, setUnlockedFor] = useState<string | null>(null);
  const backgroundedAt = useRef<number | null>(null);

  const enabled = !!userId && lockedFor === userId;
  const status: AppLockContextValue['status'] = !userId
    ? 'unlocked'
    : !ready || lockedFor === undefined
      ? 'checking'
      : !enabled || unlockedFor === userId
        ? 'unlocked'
        : 'locked';

  useEffect(() => {
    void detectBiometrics().then(setBiometrics);
    storage
      .get(LOCK_KEY)
      .then((saved) => setLockedFor(saved))
      .catch(() => setLockedFor(null));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', (state) => {
      // "inactive" is also the fingerprint prompt itself on iOS, so only a real trip away counts
      if (state === 'background') backgroundedAt.current = Date.now();
      if (state === 'active' && backgroundedAt.current !== null) {
        if (Date.now() - backgroundedAt.current > LOCK_AFTER_MS) setUnlockedFor(null);
        backgroundedAt.current = null;
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  const unlock = useCallback(async () => {
    const ok = await authenticate('Unlock Hotel Management');
    if (ok) setUnlockedFor(userId);
    return ok;
  }, [userId]);

  const setEnabled = useCallback(
    async (on: boolean) => {
      if (!userId) return false;
      if (on) {
        if (!(await authenticate(`Use ${biometrics.label} to unlock the app`))) return false;
        await storage.set(LOCK_KEY, userId);
        setLockedFor(userId);
        setUnlockedFor(userId);
      } else {
        await storage.remove(LOCK_KEY);
        setLockedFor(null);
      }
      return true;
    },
    [userId, biometrics.label]
  );

  // Signing out turns it off, so the next person on this phone isn't asked for someone else's
  // finger, and signing back in with the password doesn't lock straight away
  useEffect(() => {
    if (ready && !userId && lockedFor) {
      storage
        .remove(LOCK_KEY)
        .catch(() => undefined)
        .then(() => setLockedFor(null));
    }
  }, [ready, userId, lockedFor]);

  const value = useMemo<AppLockContextValue>(
    () => ({ biometrics, enabled, status, setEnabled, unlock }),
    [biometrics, enabled, status, setEnabled, unlock]
  );

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}

export function useAppLock(): AppLockContextValue {
  const context = useContext(AppLockContext);
  if (!context) throw new Error('useAppLock must be used inside AppLockProvider');
  return context;
}
