import { useNetInfo } from '@react-native-community/netinfo';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space, useTheme } from '@/theme';
import { Icon } from './Icon';
import { Text } from './Text';

/** A pill at the bottom while there's no connection; lists keep showing what was loaded last */
export function OfflineBanner() {
  const { isConnected } = useNetInfo();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  // null means "not known yet": say nothing until it's known
  if (isConnected !== false || Platform.OS === 'web') return null;

  const { fg, bg } = colors.tones.warning;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 64, alignItems: 'center' }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.xs + 2,
          backgroundColor: bg,
          borderColor: fg,
          borderWidth: 1,
          borderRadius: radius.pill,
          paddingVertical: space.xs + 2,
          paddingHorizontal: space.md,
        }}
      >
        <Icon ios="wifi.slash" android="wifi_off" size={16} color={fg} />
        <Text variant="caption" weight="600" style={{ color: fg }}>
          Offline · showing saved data
        </Text>
      </View>
    </View>
  );
}
