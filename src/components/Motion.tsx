import { ReactNode, useEffect, useState } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import { motion, useReducedMotion } from '@/lib/motion';
import { radius, useTheme } from '@/theme';
import { Icon } from './Icon';

/**
 * Fades its content in while it rises a few points, once, when it first appears. Pass `index`
 * for rows in a list or sections of a screen, so they arrive one after another.
 */
export function FadeIn({
  children,
  index = 0,
  style,
}: {
  children: ReactNode;
  index?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const delay = index < motion.maxStaggered ? index * motion.stagger : 0;
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.enter,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
    // Only on first appearance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: reduced ? [] : [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * A check mark that pops into a soft circle, with a ring spreading out behind it: the "done"
 * moment after booking, checking in or out, or taking a payment.
 */
export function SuccessMark({ size = 72 }: { size?: number }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [circle] = useState(() => new Animated.Value(0));
  const [check] = useState(() => new Animated.Value(0));
  const [ring] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) {
      circle.setValue(1);
      check.setValue(1);
      return;
    }
    const animation = Animated.parallel([
      Animated.spring(circle, { toValue: 1, useNativeDriver: true, ...motion.spring }),
      Animated.sequence([
        Animated.delay(120),
        Animated.spring(check, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 220 }),
      ]),
      Animated.timing(ring, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [reduced, circle, check, ring]);

  const tone = colors.tones.success;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible={false}>
      {!reduced && (
        <Animated.View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: radius.pill,
            borderWidth: 2,
            borderColor: tone.fg,
            opacity: ring.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.5, 0] }),
            transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.6] }) }],
          }}
        />
      )}
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: tone.bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: circle,
          transform: [{ scale: circle.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        }}
      >
        <Animated.View
          style={{
            opacity: check,
            transform: [
              { scale: check.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              { rotate: check.interpolate({ inputRange: [0, 1], outputRange: ['-20deg', '0deg'] }) },
            ],
          }}
        >
          <Icon ios="checkmark" android="check" size={size / 2} color={tone.fg} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
