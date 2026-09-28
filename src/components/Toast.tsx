import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/lib/haptics';
import { radius, space, useTheme } from '@/theme';
import { palettes } from '@/theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

type ToastKind = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  text: string;
  kind: ToastKind;
}

interface ToastContextValue {
  show: (text: string, kind?: ToastKind) => void;
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
  const nextId = useRef(1);

  const show = useCallback((text: string, kind: ToastKind = 'success') => {
    if (kind === 'success') haptics.success();
    else if (kind === 'error') haptics.error();
    setMessage({ id: nextId.current++, text, kind });
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message && <ToastView key={message.id} message={message} onDone={() => setMessage(null)} />}
    </ToastContext.Provider>
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
