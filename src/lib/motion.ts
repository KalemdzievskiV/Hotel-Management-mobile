import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Motion is built on React Native's own Animated API (native driver): no extra libraries, and
// Expo Go keeps working. Keep it short and quiet: it confirms and connects, never decorates.
export const motion = {
  /** Things appearing: list rows, a screen's sections */
  enter: 220,
  /** Delay between rows or sections appearing one after another */
  stagger: 40,
  /** Rows after this many appear together, so long lists don't trickle in */
  maxStaggered: 8,
  spring: { damping: 14, stiffness: 180, mass: 1 },
};

/** The phone's "reduce motion" setting: with it on, things appear without moving */
export function useReducedMotion(): boolean {
  const [value, setValue] = useState(false);
  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setValue);
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(setValue)
      .catch(() => undefined);
    return () => subscription.remove();
  }, []);
  return value;
}
