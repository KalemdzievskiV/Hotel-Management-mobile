import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { makeStyles, space, useTheme } from '@/theme';
import { Text } from './Text';

const HEIGHT = 140;
const GAP = 2;

export interface Bar {
  /** Short label under the bar, e.g. "Tue" */
  label: string;
  value: number;
  /** Read out and shown when the bar is tapped, e.g. "Tue 29 Sep: 1,240" */
  description: string;
}

/**
 * One series of bars on one axis: a quiet baseline and top gridline, bars with rounded tops,
 * and the tapped bar's value (the last bar's by default) shown above the chart.
 */
export function BarChart({
  bars,
  format,
  max,
}: {
  bars: Bar[];
  format: (value: number) => string;
  /** The top of the axis; defaults to the largest value */
  max?: number;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [selected, setSelected] = useState(bars.length - 1);
  const top = Math.max(max ?? 0, ...bars.map((b) => b.value), 1);
  const current = bars[Math.min(selected, bars.length - 1)];

  return (
    <View style={{ gap: space.xs }}>
      <Text variant="callout" color="muted" accessibilityLiveRegion="polite">
        {current ? current.description : ' '}
      </Text>
      {/* The top of the axis, labelled above its line so no bar covers it */}
      <Text variant="caption" color="subtle" align="right" importantForAccessibility="no">
        {format(top)}
      </Text>
      <View style={styles.plot}>
        <View style={[styles.grid, { top: 0 }]} />
        <View style={[styles.grid, { bottom: 0, backgroundColor: colors.textSubtle }]} />
        <View style={styles.bars}>
          {bars.map((bar, index) => {
            const active = index === selected;
            const height = bar.value > 0 ? Math.max(3, (bar.value / top) * HEIGHT) : 0;
            return (
              <Pressable
                key={`${bar.label}-${index}`}
                onPress={() => setSelected(index)}
                accessibilityRole="button"
                accessibilityLabel={bar.description}
                accessibilityState={{ selected: active }}
                // The whole column is the target, not just the bar
                style={styles.column}
              >
                <View
                  style={{
                    height,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    backgroundColor: colors.primary,
                    opacity: active ? 1 : 0.45,
                  }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.labels}>
        {bars.map((bar, index) => (
          <Text
            key={`${bar.label}-${index}`}
            variant="caption"
            color={index === selected ? 'text' : 'subtle'}
            align="center"
            numberOfLines={1}
            style={{ flex: 1 }}
            importantForAccessibility="no"
          >
            {bar.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  plot: { height: HEIGHT, justifyContent: 'flex-end' },
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: t.colors.border },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: HEIGHT, gap: GAP },
  column: { flex: 1, height: HEIGHT, justifyContent: 'flex-end' },
  labels: { flexDirection: 'row', gap: GAP },
}));
