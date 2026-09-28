import { View } from 'react-native';
import { radius, useTheme } from '@/theme';
import { Text } from './Text';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

/** A circle with someone's initials */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: radius.pill,
        backgroundColor: colors.tones.primary.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="callout" weight="700" style={{ color: colors.tones.primary.fg, fontSize: size * 0.36 }}>
        {initials(name) || '?'}
      </Text>
    </View>
  );
}
