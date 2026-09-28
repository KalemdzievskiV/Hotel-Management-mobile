import { ActivityIndicator, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import { haptics } from '@/lib/haptics';
import { makeStyles, radius, space, useTheme } from '@/theme';
import { Icon, type AndroidSymbol, type IosSymbol } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  /** `sm` is compact and only as wide as its label, for buttons inside cards */
  size?: 'md' | 'sm';
  icon?: { ios: IosSymbol; android: AndroidSymbol };
  /** Shows a spinner and blocks presses */
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const foreground =
    variant === 'primary'
      ? colors.onPrimary
      : variant === 'danger'
        ? '#FFFFFF'
        : variant === 'ghost'
          ? colors.primary
          : colors.text;
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        size === 'sm' && styles.sm,
        pressed && styles.pressed,
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={foreground} />
        ) : (
          icon && <Icon ios={icon.ios} android={icon.android} size={size === 'sm' ? 16 : 18} color={foreground} />
        )}
        <Text variant={size === 'sm' ? 'callout' : 'headline'} weight="600" style={{ color: foreground }}>
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: { minHeight: 36, paddingHorizontal: space.md, borderRadius: radius.sm, alignSelf: 'flex-start' },
  content: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  primary: { backgroundColor: t.colors.primary },
  secondary: { backgroundColor: t.colors.surfaceAlt },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: t.colors.tones.danger.fg },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
}));
