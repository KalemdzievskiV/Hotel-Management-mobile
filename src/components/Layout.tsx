import { ReactNode } from 'react';
import { View } from 'react-native';
import { makeStyles, space, useTheme } from '@/theme';
import { Text } from './Text';

/** Screen background and list padding, shared by every screen */
export const useScreenStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.bg },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
}));

/** A small uppercase heading above a group of cards, with an optional count or action on the right */
export function SectionHeader({ title, count, right }: { title: string; count?: number; right?: ReactNode }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.md }}
      accessibilityRole="header"
    >
      <Text variant="overline" color="muted">
        {title}
        {count !== undefined ? `  ·  ${count}` : ''}
      </Text>
      {right}
    </View>
  );
}

/** Label on the left, value on the right; renders nothing without a value */
export function KeyValue({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value?: string | number | null;
  emphasis?: boolean;
  tone?: 'success' | 'danger';
}) {
  const { colors } = useTheme();
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: space.xs }}>
      <Text variant="body" color="muted">
        {label}
      </Text>
      <Text
        variant="body"
        weight={emphasis ? '700' : '500'}
        style={{ flexShrink: 1, textAlign: 'right', color: tone ? colors.tones[tone].fg : colors.text }}
      >
        {value}
      </Text>
    </View>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space.sm }} />;
}
