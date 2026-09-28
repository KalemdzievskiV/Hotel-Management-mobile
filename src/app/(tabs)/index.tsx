import type { UseQueryResult } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ReactNode, useMemo, useState } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import {
  EmptyState,
  ErrorState,
  HotelLine,
  SectionHeader,
  SkeletonList,
  Text,
  TextField,
  useScreenStyles,
  WithHotel,
} from '@/components';
import { ReservationCard } from '@/features/reservations/components';
import { useDeskReservations, useMyReservations, type ReservationSection } from '@/features/reservations/hooks';
import { useAuth } from '@/lib/auth';
import { errorText } from '@/lib/http';
import { usePullToRefresh, useRefreshOnFocus } from '@/lib/query';
import type { Hotel, Reservation } from '@/lib/types';
import { space, useTheme } from '@/theme';

function matches(r: Reservation, query: string): boolean {
  return [r.guestName, r.roomNumber, r.hotelName, String(r.id)].some((value) => value?.toLowerCase().includes(query));
}

export default function ReservationsScreen() {
  const { canManage } = useAuth();
  return canManage ? <WithHotel>{(hotel) => <DeskReservations hotel={hotel} />}</WithHotel> : <GuestReservations />;
}

function DeskReservations({ hotel }: { hotel: Hotel }) {
  const query = useDeskReservations(hotel.id);
  return <ReservationList query={query} perspective="desk" header={<HotelLine />} />;
}

function GuestReservations() {
  const query = useMyReservations();
  return <ReservationList query={query} perspective="guest" />;
}

function ReservationList({
  query,
  perspective,
  header,
}: {
  query: UseQueryResult<ReservationSection[]>;
  perspective: 'desk' | 'guest';
  header?: ReactNode;
}) {
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const { data, error, isPending, refetch } = query;
  const pull = usePullToRefresh(refetch);
  const [search, setSearch] = useState('');
  useRefreshOnFocus(refetch);

  const term = search.trim().toLowerCase();
  const sections = useMemo(
    () =>
      term
        ? (data ?? [])
            .map((section) => ({ ...section, data: section.data.filter((r) => matches(r, term)) }))
            .filter((section) => section.data.length > 0)
        : (data ?? []),
    [data, term]
  );

  if (isPending) return <SkeletonList />;
  if (error && !data) return <ErrorState message={errorText(error)} onRetry={() => void refetch()} />;

  const total = (data ?? []).reduce((sum, s) => sum + s.data.length, 0);
  if (perspective === 'guest' && total === 0) {
    return (
      <EmptyState
        icon={{ ios: 'suitcase', android: 'luggage' }}
        title="No trips yet"
        message="Bookings you make will show up here."
      />
    );
  }

  return (
    <SectionList
      style={screen.screen}
      sections={sections}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      contentContainerStyle={screen.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
      ListHeaderComponent={
        <View style={{ gap: space.md }}>
          {header}
          {total > 0 && (
            <TextField
              icon={{ ios: 'magnifyingglass', android: 'search' }}
              placeholder={perspective === 'desk' ? 'Search guest, room or booking #' : 'Search hotel or booking #'}
              accessibilityLabel="Search bookings"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
          )}
        </View>
      }
      ListEmptyComponent={
        term ? (
          <EmptyState
            fill={false}
            icon={{ ios: 'magnifyingglass', android: 'search' }}
            title="No matches"
            message={`No bookings match “${search.trim()}”.`}
          />
        ) : null
      }
      renderSectionHeader={({ section }) => <SectionHeader title={section.title} count={section.data.length} />}
      renderSectionFooter={({ section }) =>
        section.data.length === 0 ? (
          <Text variant="callout" color="subtle" style={{ paddingVertical: space.xs }}>
            {section.key === 'arrivals' ? 'No arrivals today' : section.key === 'departures' ? 'No departures today' : 'Nothing here'}
          </Text>
        ) : null
      }
      renderItem={({ item }) => (
        <ReservationCard
          reservation={item}
          perspective={perspective}
          onPress={() => router.push(`/reservations/${item.id}`)}
        />
      )}
    />
  );
}
