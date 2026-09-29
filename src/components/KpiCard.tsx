import { View } from 'react-native';
import { makeStyles, radius, space, useTheme, type ToneName } from '@/theme';
import { Card } from './Card';
import { Icon, type AndroidSymbol, type IosSymbol } from './Icon';
import { Text } from './Text';

/**
 * One number on a dashboard: a label, the value (tabular figures), and an optional line under it
 * such as "3 of 5 checked in". Pressable when given `onPress`.
 */
export function KpiCard({
  label,
  value,
  detail,
  icon,
  tone = 'primary',
  progress,
  onPress,
}: {
  label: string;
  value: string;
  detail?: string;
  /** Left out on narrow tiles, where the label needs the room */
  icon?: { ios: IosSymbol; android: AndroidSymbol };
  tone?: ToneName;
  /** 0–1: draws a thin bar under the value */
  progress?: number;
  onPress?: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const accent = colors.tones[tone];
  return (
    <Card
      onPress={onPress}
      style={styles.card}
      accessibilityLabel={[label, value, detail].filter(Boolean).join(', ')}
    >
      <View style={styles.top}>
        <Text variant="caption" color="muted" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
        {icon && (
          <View style={[styles.icon, { backgroundColor: accent.bg }]}>
            <Icon ios={icon.ios} android={icon.android} size={14} color={accent.fg} />
          </View>
        )}
      </View>
      <Text variant="display" style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {progress !== undefined && (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(1, Math.max(0, progress)) * 100}%`, backgroundColor: accent.fg }]} />
        </View>
      )}
      {detail && (
        <Text variant="caption" color="subtle" numberOfLines={1}>
          {detail}
        </Text>
      )}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  card: { flex: 1, gap: space.xs, minHeight: 112 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  icon: { width: 24, height: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  value: { fontVariant: ['tabular-nums'], marginTop: space.xs },
  track: { height: 4, borderRadius: radius.pill, backgroundColor: t.colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
}));
