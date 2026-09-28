import { FlatList, RefreshControl, View } from 'react-native';
import { Card, EmptyState, ErrorState, Icon, SkeletonList, Text, useScreenStyles } from '@/components';
import { useHotels } from '@/features/hotels/hooks';
import { errorText } from '@/lib/http';
import { usePullToRefresh } from '@/lib/query';
import type { Hotel } from '@/lib/types';
import { radius, space, useTheme } from '@/theme';

export default function HotelsScreen() {
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const { data, error, isPending, refetch } = useHotels();
  const pull = usePullToRefresh(refetch);

  if (isPending) return <SkeletonList header={false} />;
  if (error && !data) return <ErrorState message={errorText(error)} onRetry={() => void refetch()} />;

  return (
    <FlatList
      style={screen.screen}
      contentContainerStyle={screen.content}
      data={data ?? []}
      keyExtractor={(hotel) => String(hotel.id)}
      refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
      ListEmptyComponent={
        <EmptyState fill={false} icon={{ ios: 'building.2', android: 'apartment' }} title="No hotels yet" />
      }
      renderItem={({ item }) => <HotelCard hotel={item} />}
    />
  );
}

function HotelCard({ hotel }: { hotel: Hotel }) {
  const { colors } = useTheme();
  return (
    <Card padded={false} style={{ overflow: 'hidden' }}>
      <View
        style={{
          height: 88,
          backgroundColor: colors.tones.primary.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon ios="building.2.fill" android="apartment" size={36} color={colors.tones.primary.fg} />
      </View>
      <View style={{ padding: space.lg, gap: space.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm }}>
          <Text variant="headline" style={{ flexShrink: 1 }}>
            {hotel.name}
          </Text>
          {hotel.stars > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                backgroundColor: colors.tones.warning.bg,
                borderRadius: radius.pill,
                paddingHorizontal: space.sm,
                paddingVertical: 2,
              }}
              accessibilityLabel={`${hotel.stars} stars`}
            >
              <Icon ios="star.fill" android="star" size={12} color={colors.tones.warning.fg} />
              <Text variant="caption" weight="700" color="warning">
                {hotel.stars}
              </Text>
            </View>
          )}
        </View>
        <Text variant="callout" color="muted">
          {[hotel.address, hotel.city, hotel.country].filter(Boolean).join(', ')}
        </Text>
        {hotel.checkInTime && hotel.checkOutTime && (
          <Text variant="caption" color="subtle" style={{ marginTop: space.xs }}>
            Check-in from {hotel.checkInTime.slice(0, 5)} · Check-out by {hotel.checkOutTime.slice(0, 5)}
          </Text>
        )}
      </View>
    </Card>
  );
}
