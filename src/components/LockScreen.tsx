import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth';
import { useAppLock } from '@/lib/appLock';
import { haptics } from '@/lib/haptics';
import { radius, space, useTheme } from '@/theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Covers the app while it's locked (and, blank, while the lock setting loads), above every
 * screen and sheet. Asks for the fingerprint / face straight away.
 */
export function LockScreen() {
  const { colors } = useTheme();
  const { user, logout } = useAuth();
  const { status, biometrics, unlock } = useAppLock();
  const prompted = useRef(false);

  useEffect(() => {
    if (status !== 'locked') {
      prompted.current = false;
      return;
    }
    if (prompted.current) return;
    prompted.current = true;
    void unlock().then((ok) => ok && haptics.success());
  }, [status, unlock]);

  if (status === 'unlocked') return null;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} accessibilityViewIsModal>
      {status === 'locked' && (
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: space.xl, gap: space.xl }}>
          <View style={{ alignItems: 'center', gap: space.md }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: radius.pill,
                backgroundColor: colors.tones.primary.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon ios={biometrics.icon.ios} android={biometrics.icon.android} size={36} color={colors.tones.primary.fg} />
            </View>
            <Text variant="title" align="center" accessibilityRole="header">
              Hotel Management is locked
            </Text>
            <Text variant="callout" color="muted" align="center">
              {user?.email}
            </Text>
          </View>
          <View style={{ gap: space.sm }}>
            <Button
              title={`Unlock with ${biometrics.label}`}
              icon={biometrics.icon}
              onPress={() => void unlock().then((ok) => ok && haptics.success())}
            />
            <Button title="Sign out" variant="ghost" onPress={() => void logout()} />
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}
