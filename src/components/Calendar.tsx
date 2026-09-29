import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import { toDateParam } from '@/lib/format';
import { makeStyles, radius, space, useTheme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

// Weeks start on Monday, as in most of Europe
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function parse(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

/** The days of a month laid out in weeks; null for the blanks before the 1st and after the last */
function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const blanks = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: blanks }, () => null);
  for (let day = 1; day <= days; day++) cells.push(toDateParam(new Date(year, month, day)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * A month calendar. In `range` mode the first tap picks the start and the second the end
 * (tapping on or before the start starts over); in `single` mode a tap picks the day.
 * Days are YYYY-MM-DD strings; days before `min` can't be picked.
 */
export function Calendar({
  mode,
  start,
  end,
  min,
  onChange,
}: {
  mode: 'range' | 'single';
  start: string;
  end?: string | null;
  min: string;
  onChange: (start: string, end: string | null) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [shown, setShown] = useState(() => {
    const date = parse(start);
    return { year: date.getFullYear(), month: date.getMonth() };
  });
  const cells = useMemo(() => monthGrid(shown.year, shown.month), [shown]);
  const minDate = parse(min);
  const canGoBack = shown.year > minDate.getFullYear() || shown.month > minDate.getMonth();

  const move = (delta: number) => {
    haptics.selection();
    setShown(({ year, month }) => {
      const date = new Date(year, month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };

  const pick = (day: string) => {
    haptics.selection();
    if (mode === 'single') return onChange(day, null);
    if (!end && day > start) return onChange(start, day);
    onChange(day, null);
  };

  const title = new Date(shown.year, shown.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.header}>
        <Pressable
          onPress={() => move(-1)}
          disabled={!canGoBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={[styles.arrow, !canGoBack && { opacity: 0.3 }]}
        >
          <Icon ios="chevron.left" android="chevron_left" size={18} color={colors.text} />
        </Pressable>
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
        <Pressable
          onPress={() => move(1)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={styles.arrow}
        >
          <Icon ios="chevron.right" android="chevron_right" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAYS.map((day) => (
          <Text key={day} variant="caption" color="subtle" align="center" style={styles.cell}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, index) => {
          if (!day) return <View key={`blank-${index}`} style={styles.cell} />;
          const disabled = day < min;
          const isStart = day === start;
          const isEnd = !!end && day === end;
          const inside = !!end && day > start && day < end;
          const selected = isStart || isEnd;
          // The band behind a range runs from the middle of the start day to the middle of the end day
          const band = mode === 'range' && !!end && (inside || (isStart && end > start) || isEnd);
          return (
            <View key={day} style={styles.cell}>
              {band && (
                <View
                  style={[
                    styles.band,
                    { backgroundColor: colors.tones.primary.bg },
                    isStart && { left: '50%' },
                    isEnd && { right: '50%' },
                  ]}
                />
              )}
              <Pressable
                onPress={() => pick(day)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={parse(day).toLocaleDateString(undefined, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
                accessibilityState={{ selected, disabled }}
                style={({ pressed }) => [
                  styles.day,
                  selected && { backgroundColor: colors.primary },
                  pressed && !selected && { backgroundColor: colors.surfaceAlt },
                ]}
              >
                <Text
                  variant="callout"
                  weight={selected ? '700' : '500'}
                  style={{
                    color: selected ? colors.onPrimary : disabled ? colors.textSubtle : colors.text,
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  {Number(day.slice(8))}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  band: { position: 'absolute', top: 4, bottom: 4, left: 0, right: 0 },
  day: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
}));
