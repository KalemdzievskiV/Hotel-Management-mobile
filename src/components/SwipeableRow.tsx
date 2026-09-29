import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, View } from 'react-native';
import { haptics } from '@/lib/haptics';
import { radius, space, useTheme, type ToneName } from '@/theme';
import { Icon, type AndroidSymbol, type IosSymbol } from './Icon';
import { Text } from './Text';

// How far to drag before letting go triggers the action
const THRESHOLD = 96;

/**
 * Drag the row to the right to run `action` (e.g. start or finish a task). The action shows
 * underneath as the row moves; a light tap of haptics marks the point where letting go counts.
 * Rows keep their buttons too: swiping is a shortcut, not the only way.
 */
export function SwipeableRow({
  children,
  action,
  disabled,
}: {
  children: ReactNode;
  action?: { label: string; tone: ToneName; icon: { ios: IosSymbol; android: AndroidSymbol }; onSwipe: () => void };
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const [x] = useState(() => new Animated.Value(0));
  const [armed, setArmed] = useState(false);
  // The gesture handler is made once; it reads the latest action and state through this
  const latest = useRef({ action, disabled });
  useEffect(() => {
    latest.current = { action, disabled };
  });

  // The handlers only run on touches, never while rendering, so reading the ref in them is fine
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => {
    // Whether the drag is past the threshold, to buzz once when it crosses
    const drag = { passed: false };
    const settle = () => {
      Animated.spring(x, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      drag.passed = false;
      setArmed(false);
    };
    return PanResponder.create({
      // Only clearly sideways drags; vertical ones scroll the list
      onMoveShouldSetPanResponder: (_, g) =>
        !latest.current.disabled && !!latest.current.action && g.dx > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
      onPanResponderMove: (_, g) => {
        const dx = Math.max(0, g.dx);
        x.setValue(dx);
        if (dx > THRESHOLD !== drag.passed) {
          drag.passed = dx > THRESHOLD;
          setArmed(drag.passed);
          if (drag.passed) haptics.selection();
        }
      },
      onPanResponderRelease: (_, g) => {
        settle();
        if (g.dx > THRESHOLD) latest.current.action?.onSwipe();
      },
      onPanResponderTerminate: settle,
    });
  });

  if (!action) return <>{children}</>;
  const tone = colors.tones[action.tone];

  return (
    <View>
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          borderRadius: radius.lg,
          backgroundColor: armed ? tone.fg : tone.bg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.sm,
          paddingLeft: space.lg,
        }}
        importantForAccessibility="no-hide-descendants"
      >
        <Icon ios={action.icon.ios} android={action.icon.android} size={20} color={armed ? colors.surface : tone.fg} />
        <Text variant="callout" weight="700" style={{ color: armed ? colors.surface : tone.fg }}>
          {action.label}
        </Text>
      </View>
      <Animated.View {...responder.panHandlers} style={{ transform: [{ translateX: x }] }}>
        {children}
      </Animated.View>
    </View>
  );
}
