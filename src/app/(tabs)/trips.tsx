import { router } from 'expo-router';
import { RefreshControl, SectionList, View } from 'react-native';
import { Card, EmptyState, ErrorState, FadeIn, Icon, SectionHeader, SkeletonList, Text, useScreenStyles } from '@/components';
import { parseDay } from '@/features/booking/search';
import { useHotels } from '@/features/hotels/hooks';
import { ReservationCard, StatusBadge } from '@/features/reservations/components';
import { useMyReservations } from '@/features/reservations/hooks';
import { formatStay } from '@/lib/format';
import { errorText } from '@/lib/http';
import { usePullToRefresh, useRefreshOnFocus } from '@/lib/query';
import { BookingType, ReservationStatus, type Hotel, type Reservation } from '@/lib/types';
import { makeStyles, radius, space, useTheme } from '@/theme';

/** "Today", "Tomorrow", "In 5 days", or "Staying now" once checked in */
function countdown(r: Reservation): string {
  if (r.status === ReservationStatus.CheckedIn) return 'Staying now';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((parseDay(r.checkInDate.slice(0, 10)).getTime() - today.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export default function TripsScreen() {
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const { data, error, isPending, refetch } = useMyReservations();
  const hotels = useHotels();
  const pull = usePullToRefresh(refetch);
  useRefreshOnFocus(refetch);

  if (isPending) return <SkeletonList header={false} />;
  if (error && !data) return <ErrorState message={errorText(error)} onRetry={() => void refetch()} />;

  const [upcoming, past] = data ?? [];
  const next = upcoming?.data[0];
  const later = upcoming?.data.slice(1) ?? [];
  const open = (r: Reservation) => router.push(`/reservations/${r.id}`);

  if (!next && (past?.data.length ?? 0) === 0) {
    return (
      <EmptyState
        icon={{ ios: 'suitcase', android: 'luggage' }}
        title="No trips yet"
        message="Find a hotel and book a room; your stays will show up here."
        action={{ title: 'Find a stay', onPress: () => router.navigate('/') }}
      />
    );
  }

  const sections = [
    ...(later.length > 0 ? [{ key: 'later', title: 'Also coming up', data: later }] : []),
    ...(past && past.data.length > 0 ? [{ key: 'past', title: 'Past and cancelled', data: past.data }] : []),
  ];

  return (
    <SectionList
      style={screen.screen}
      contentContainerStyle={screen.content}
      sections={sections}
      keyExtractor={(item) => String(item.id)}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
      ListHeaderComponent={
        next ? (
          <NextTrip reservation={next} hotel={hotels.data?.find((h) => h.id === next.hotelId)} onPress={() => open(next)} />
        ) : (
          <Card style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.xl }}>
            <Text variant="headline">Nothing booked right now</Text>
            <Text variant="callout" color="primary" onPress={() => router.navigate('/')} accessibilityRole="link">
              Find your next stay
            </Text>
          </Card>
        )
      }
      renderSectionHeader={({ section }) => <SectionHeader title={section.title} count={section.data.length} />}
      renderItem={({ item, index }) => (
        <FadeIn index={index}>
          <ReservationCard reservation={item} perspective="guest" onPress={() => open(item)} />
        </FadeIn>
      )}
    />
  );
}

/** The trip coming up next, big: where, when and how long until it starts */
function NextTrip({ reservation: r, hotel, onPress }: { reservation: Reservation; hotel?: Hotel; onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <SectionHeader title="Next trip" />
      <Card padded={false} onPress={onPress} style={{ overflow: 'hidden' }} accessibilityLabel={`Next trip: ${r.hotelName}, ${formatStay(r)}`}>
        <View style={styles.hero}>
          <Text variant="overline" style={{ color: colors.onPrimary, opacity: 0.85 }}>
            {countdown(r)}
          </Text>
          <Text variant="display" style={{ color: colors.onPrimary }} numberOfLines={2}>
            {r.hotelName ?? `Booking #${r.id}`}
          </Text>
          {hotel && (
            <Text variant="callout" style={{ color: colors.onPrimary, opacity: 0.85 }} numberOfLines={1}>
              {[hotel.address, hotel.city].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
        <View style={{ padding: space.lg, gap: space.sm }}>
          <View style={styles.row}>
            <Icon ios="calendar" android="calendar_month" size={17} color={colors.textMuted} />
            <Text variant="body" style={{ flex: 1 }}>
              {formatStay(r)}
            </Text>
          </View>
          {hotel?.checkInTime && r.bookingType === BookingType.Daily && (
            <View style={styles.row}>
              <Icon ios="clock" android="schedule" size={17} color={colors.textMuted} />
              <Text variant="body" style={{ flex: 1 }}>
                Check-in from {hotel.checkInTime.slice(0, 5)}
              </Text>
            </View>
          )}
          <View style={[styles.row, { justifyContent: 'space-between', marginTop: space.xs }]}>
            <StatusBadge status={r.status} />
            <Text variant="callout" weight="600" color="primary">
              View details
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  hero: { backgroundColor: t.colors.primary, padding: space.lg, paddingTop: space.xl, gap: space.xs, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
}));
