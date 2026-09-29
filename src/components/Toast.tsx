import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/lib/haptics';
import { radius, space, useTheme } from '@/theme';
import { palettes } from '@/theme/tokens';
import { Icon } from './Icon';
import { SuccessMark } from './Motion';
import { Text } from './Text';

type ToastKind = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  text: string;
  kind: ToastKind;
}

interface ToastContextValue {
  show: (text: string, kind?: ToastKind) => void;
  /** For the big moments (checked in, paid, booked): a check in the middle of the screen */
  celebrate: (title: string, detail?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: { ios: 'checkmark.circle.fill', android: 'check_circle', tone: 'success' },
  error: { ios: 'exclamationmark.circle.fill', android: 'error', tone: 'danger' },
  info: { ios: 'info.circle.fill', android: 'info', tone: 'info' },
} as const;

/** Short confirmations that slide in at the top: "Checked in", "Payment recorded" */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const nextId = useRef(1);

  const show = useCallback((text: string, kind: ToastKind = 'success') => {
    if (kind === 'success') haptics.success();
    else if (kind === 'error') haptics.error();
    setMessage({ id: nextId.current++, text, kind });
  }, []);

  const celebrate = useCallback((title: string, detail?: string) => {
    haptics.success();
    setCelebration({ id: nextId.current++, title, detail });
  }, []);

  const value = useMemo(() => ({ show, celebrate }), [show, celebrate]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message && <ToastView key={message.id} message={message} onDone={() => setMessage(null)} />}
      {celebration && (
        <CelebrationView key={celebration.id} celebration={celebration} onDone={() => setCelebration(null)} />
      )}
    </ToastContext.Provider>
  );
}

interface Celebration {
  id: number;
  title: string;
  detail?: string;
}

/** The big "done" moments: a check pops in the middle of the screen, then fades away by itself */
function CelebrationView({ celebration, onDone }: { celebration: Celebration; onDone: () => void }) {
  const { colors } = useTheme();
  const [visible] = useState(() => new Animated.Value(0));
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(visible, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(1100),
      Animated.timing(visible, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => finished && onDoneRef.current());
    return () => animation.stop();
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel={celebration.detail ? `${celebration.title}. ${celebration.detail}` : celebration.title}
      style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', opacity: visible }]}
    >
      <View
        style={{
          alignItems: 'center',
          gap: space.md,
          paddingVertical: space.xl,
          paddingHorizontal: space.xl,
          minWidth: 200,
          maxWidth: '80%',
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <SuccessMark size={64} />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text variant="headline" align="center">
            {celebration.title}
          </Text>
          {celebration.detail && (
            <Text variant="callout" color="muted" align="center">
              {celebration.detail}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

function ToastView({ message, onDone }: { message: ToastMessage; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors, dark } = useTheme();
  const [progress] = useState(() => new Animated.Value(0));
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 200 }),
      Animated.delay(2400),
      Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => finished && onDoneRef.current());
    return () => animation.stop();
  }, [progress]);

  const icon = ICONS[message.kind];
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        position: 'absolute',
        top: insets.top + space.sm,
        left: space.lg,
        right: space.lg,
        alignItems: 'center',
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingVertical: space.md,
          paddingHorizontal: space.lg,
          borderRadius: radius.pill,
          backgroundColor: dark ? colors.surfaceAlt : '#1A1917',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <Icon ios={icon.ios} android={icon.android} size={20} color={palettes.dark.tones[icon.tone].fg} />
        <Text variant="callout" weight="600" style={{ color: '#FFFFFF', flexShrink: 1 }}>
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
