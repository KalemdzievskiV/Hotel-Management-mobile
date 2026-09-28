import { useEffect, useState } from 'react';
import { Animated, DimensionValue, StyleProp, View, ViewStyle } from 'react-native';
import { radius, space, useTheme } from '@/theme';
import { Card } from './Card';

/** A softly pulsing placeholder shaped like the content that's loading */
export function Skeleton({
  width = '100%',
  height = 14,
  round = radius.sm,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  round?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: round, backgroundColor: colors.surfaceAlt, opacity }, style]}
    />
  );
}

/** Placeholder cards for a list that's loading for the first time */
export function SkeletonList({ count = 5, header = true }: { count?: number; header?: boolean }) {
  return (
    <View style={{ padding: space.lg, gap: space.md }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {header && <Skeleton height={44} round={radius.md} style={{ marginBottom: space.xs }} />}
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Skeleton width="55%" height={18} />
            <Skeleton width={72} height={20} round={radius.pill} />
          </View>
          <Skeleton width="40%" />
          <Skeleton width="70%" />
        </Card>
      ))}
    </View>
  );
}
