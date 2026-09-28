import { ReactNode } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { makeStyles, radius, space } from '@/theme';

/** A rounded surface; pressable when given `onPress` */
export function Card({
  children,
  onPress,
  onLongPress,
  style,
  padded = true,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** False for cards whose rows bring their own padding */
  padded?: boolean;
  accessibilityLabel?: string;
}) {
  const styles = useStyles();
  if (!onPress && !onLongPress) return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.card, padded && styles.padded, pressed && styles.pressed, style]}
    >
      {children}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: radius.lg,
    ...(t.dark
      ? { borderWidth: 1, borderColor: t.colors.border }
      : {
          shadowColor: '#1A1917',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        }),
  },
  padded: { padding: space.lg, gap: space.xs },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
}));
