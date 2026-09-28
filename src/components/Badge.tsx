import { View } from 'react-native';
import { radius, space, useTheme, type ToneName } from '@/theme';
import { Text } from './Text';

/** A small tinted pill for a status or a flag, e.g. "Checked in" or "Urgent" */
export function Badge({ label, tone = 'neutral', dot }: { label: string; tone?: ToneName; dot?: boolean }) {
  const { colors } = useTheme();
  const { fg, bg } = colors.tones[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.xs,
        backgroundColor: bg,
        borderRadius: radius.pill,
        paddingHorizontal: space.sm,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      {dot && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }} />}
      <Text variant="caption" weight="600" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}
