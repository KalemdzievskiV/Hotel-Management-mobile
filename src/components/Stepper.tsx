import { Pressable, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import { makeStyles, radius, space, useTheme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

/** A label with − and + buttons, for small counts like guests or hours */
export function Stepper({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  format = String,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  format?: (value: number) => string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();

  const button = (delta: -1 | 1) => {
    const next = value + delta;
    const disabled = next < min || next > max;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${delta < 0 ? 'Fewer' : 'More'} ${label.toLowerCase()}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        hitSlop={6}
        onPress={() => {
          haptics.selection();
          onChange(next);
        }}
        style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}
      >
        <Icon
          ios={delta < 0 ? 'minus' : 'plus'}
          android={delta < 0 ? 'remove' : 'add'}
          size={18}
          color={colors.text}
        />
      </Pressable>
    );
  };

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const next = value + (e.nativeEvent.actionName === 'increment' ? 1 : -1);
        if (next >= min && next <= max) onChange(next);
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="body" weight="500">
          {label}
        </Text>
        {hint && (
          <Text variant="caption" color="subtle">
            {hint}
          </Text>
        )}
      </View>
      {button(-1)}
      <Text variant="headline" style={styles.value}>
        {format(value)}
      </Text>
      {button(1)}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  value: { minWidth: 40, textAlign: 'center', fontVariant: ['tabular-nums'] },
}));
