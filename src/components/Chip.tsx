import { Pressable } from 'react-native';
import { haptics } from '@/lib/haptics';
import { radius, space, useTheme, type ToneName } from '@/theme';
import { Text } from './Text';

/** Selectable pill for filters and pickers; `count` is shown after the label */
export function Chip({
  label,
  count,
  selected,
  onPress,
  tone = 'primary',
}: {
  label: string;
  count?: number;
  selected: boolean;
  onPress: () => void;
  tone?: ToneName;
}) {
  const { colors } = useTheme();
  const accent = colors.tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      hitSlop={4}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        borderRadius: radius.pill,
        paddingHorizontal: space.md,
        paddingVertical: 7,
        borderWidth: 1,
        borderColor: selected ? accent.fg : colors.border,
        backgroundColor: selected ? accent.bg : colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text variant="callout" weight="500" style={{ color: selected ? accent.fg : colors.text }}>
        {label}
      </Text>
      {count !== undefined && (
        <Text variant="callout" weight="600" style={{ color: selected ? accent.fg : colors.textSubtle }}>
          {count}
        </Text>
      )}
    </Pressable>
  );
}
