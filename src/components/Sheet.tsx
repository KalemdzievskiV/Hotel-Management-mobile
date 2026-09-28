import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '@/lib/haptics';
import { makeStyles, radius, space, useTheme } from '@/theme';
import { Icon, type AndroidSymbol, type IosSymbol } from './Icon';
import { Text } from './Text';

/**
 * A panel that slides up from the bottom. Close it by tapping outside, dragging it down, or the
 * back button on Android.
 */
export function Sheet({
  visible,
  onClose,
  title,
  message,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  children: ReactNode;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));

  // Stay on screen while the closing animation plays
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      drag.setValue(0);
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, damping: 22, stiffness: 220, mass: 0.9 }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [visible, mounted, progress, drag]);

  // Drag down to close
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_, g) => drag.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_, g) => {
          if (g.dy > 90 || g.vy > 1) onClose();
          else Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [drag, onClose]
  );

  if (!mounted) return null;

  const translateY = Animated.add(
    progress.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }),
    drag
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.panel, { paddingBottom: space.lg + insets.bottom, transform: [{ translateY }] }]}
      >
        <View style={styles.grabber} />
        {(title || message) && (
          <View style={styles.header}>
            {title && <Text variant="title">{title}</Text>}
            {message && (
              <Text variant="callout" color="muted">
                {message}
              </Text>
            )}
          </View>
        )}
        {children}
      </Animated.View>
    </Modal>
  );
}

export interface SheetAction {
  label: string;
  onPress: () => void;
  icon?: { ios: IosSymbol; android: AndroidSymbol };
  destructive?: boolean;
}

/** A list of choices in a sheet; Android alerts can only show three */
export function ActionSheet({
  visible,
  title,
  message,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  actions: SheetAction[];
  onClose: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title} message={message}>
      <View style={styles.actions}>
        {actions.map((action) => {
          const color = action.destructive ? colors.tones.danger.fg : colors.text;
          return (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              onPress={() => {
                if (action.destructive) haptics.warning();
                else haptics.tap();
                onClose();
                action.onPress();
              }}
              style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.surfaceAlt }]}
            >
              {action.icon && <Icon ios={action.icon.ios} android={action.icon.android} size={20} color={color} />}
              <Text variant="body" weight="500" style={{ color }}>
                {action.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.colors.overlay },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.md,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: t.colors.border,
    marginBottom: space.xs,
  },
  header: { gap: space.xs },
  actions: { gap: 2 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
}));
