import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useHotel } from '@/lib/hotel';
import type { Hotel } from '@/lib/types';
import { space, useTheme } from '@/theme';
import { Icon } from './Icon';
import { SkeletonList } from './Skeleton';
import { EmptyState, ErrorState } from './States';
import { Text } from './Text';

/**
 * Renders `children` with the selected hotel, or the loading / error / "no hotel yet"
 * state that staff screens share.
 */
export function WithHotel({ children }: { children: (hotel: Hotel) => ReactNode }) {
  const { canManage } = useAuth();
  const { hotel, loading, error, reload } = useHotel();

  if (loading) return <SkeletonList />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!hotel) {
    return canManage ? (
      <EmptyState
        icon={{ ios: 'building.2', android: 'apartment' }}
        title="No hotels yet"
        message="Add your hotel on the website first, then come back here."
        action={{ title: 'Check again', onPress: reload }}
      />
    ) : (
      <EmptyState
        icon={{ ios: 'person.badge.clock', android: 'badge' }}
        title="You're not assigned to a hotel"
        message="Ask your manager to add you to their hotel's staff."
        action={{ title: 'Check again', onPress: reload }}
      />
    );
  }
  return <>{children(hotel)}</>;
}

/** Which hotel a staff list shows, with a shortcut to switch when there's more than one */
export function HotelLine() {
  const { hotel, hotels } = useHotel();
  const { colors } = useTheme();
  if (!hotel) return null;
  const canSwitch = hotels.length > 1;
  return (
    <Pressable
      disabled={!canSwitch}
      onPress={() => router.navigate('/account')}
      hitSlop={8}
      accessibilityRole={canSwitch ? 'button' : undefined}
      accessibilityHint={canSwitch ? 'Opens Account to switch hotel' : undefined}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
        <Icon ios="building.2" android="apartment" size={16} color={colors.textMuted} />
        <Text variant="callout" weight="500" color="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
          {hotel.name}
        </Text>
        {canSwitch && <Icon ios="chevron.down" android="expand_more" size={14} color={colors.textMuted} />}
      </View>
    </Pressable>
  );
}
