import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useHotel } from '@/lib/hotel';
import type { Hotel } from '@/lib/types';
import { colors, EmptyState, ErrorMessage, Loading, styles } from './ui';

/**
 * Renders `children` with the selected hotel, or the loading / error / "no hotel yet"
 * state that staff screens share.
 */
export function WithHotel({ children }: { children: (hotel: Hotel) => ReactNode }) {
  const { canManage } = useAuth();
  const { hotel, loading, error, reload } = useHotel();

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={reload} />;
  if (!hotel) {
    return canManage ? (
      <EmptyState title="No hotels yet" message="Add your hotel on the website first, then pull to refresh here." />
    ) : (
      <EmptyState title="You're not assigned to a hotel" message="Ask your manager to add you to their hotel's staff." />
    );
  }
  return <>{children(hotel)}</>;
}

/** Which hotel a staff list shows, with a shortcut to switch when there's more than one */
export function HotelLine() {
  const { hotel, hotels } = useHotel();
  if (!hotel) return null;
  return (
    <View style={[styles.rowTop, { marginBottom: 2 }]}>
      <Text style={styles.muted} numberOfLines={1}>
        {hotel.name}
      </Text>
      {hotels.length > 1 && (
        <Pressable onPress={() => router.navigate('/account')} hitSlop={10}>
          <Text style={{ color: colors.primary, fontSize: 14 }}>Change hotel</Text>
        </Pressable>
      )}
    </View>
  );
}
