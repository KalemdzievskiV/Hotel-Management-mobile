import { Pressable, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import { makeStyles, radius, space } from '@/theme';
import { Text } from './Text';

/** Two to four mutually exclusive views of the same list, e.g. "My tasks | All tasks" */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const styles = useStyles();
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(option.value);
            }}
            style={[styles.segment, selected && styles.selected]}
          >
            <Text variant="callout" weight={selected ? '600' : '500'} color={selected ? 'text' : 'muted'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  track: {
    flexDirection: 'row',
    backgroundColor: t.colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.sm,
    borderRadius: radius.md - 3,
  },
  selected: {
    backgroundColor: t.dark ? t.colors.border : t.colors.surface,
    shadowColor: '#000',
    shadowOpacity: t.dark ? 0 : 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: t.dark ? 0 : 1,
  },
}));
