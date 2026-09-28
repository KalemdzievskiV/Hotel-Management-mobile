import { router } from 'expo-router';
import { ReactNode, useMemo, useState } from 'react';
import { RefreshControl, SectionList, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi, useRefreshOnFocus } from '@/lib/useApi';
import { Hotel, Reservation, ReservationStatus } from '@/lib/types';
import { HotelLine, WithHotel } from '@/components/WithHotel';
import { colors, ErrorMessage, Loading, ReservationRow, styles } from '@/components/ui';

interface Section {
  title: string;
  data: Reservation[];
}

const OPEN_STATUSES = [ReservationStatus.Pending, ReservationStatus.Confirmed, ReservationStatus.CheckedIn];

// Front desk: today's arrivals and departures at the selected hotel first, then everything
// else there that's still open
async function loadDeskSections(hotelId: number): Promise<Section[]> {
  const [checkIns, checkOuts, all] = await Promise.all([
    api.todaysCheckIns(),
    api.todaysCheckOuts(),
    api.reservations(),
  ]);
  const atHotel = (list: Reservation[]) => list.filter((r) => r.hotelId === hotelId);
  const todayIds = new Set([...checkIns, ...checkOuts].map((r) => r.id));
  const open = atHotel(all).filter((r) => !todayIds.has(r.id) && OPEN_STATUSES.includes(r.status));
  return [
    { title: 'Arriving today', data: atHotel(checkIns) },
    { title: 'Leaving today', data: atHotel(checkOuts) },
    { title: 'Upcoming and in-house', data: byCheckIn(open) },
  ];
}

async function loadGuestSections(): Promise<Section[]> {
  const mine = await api.reservations();
  const upcoming = mine.filter((r) => OPEN_STATUSES.includes(r.status));
  const past = mine.filter((r) => !OPEN_STATUSES.includes(r.status));
  return [
    { title: 'Upcoming', data: byCheckIn(upcoming) },
    { title: 'Past and cancelled', data: byCheckIn(past).reverse() },
  ];
}

function byCheckIn(list: Reservation[]): Reservation[] {
  return [...list].sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
}

function matches(r: Reservation, query: string): boolean {
  return [r.guestName, r.roomNumber, r.hotelName, String(r.id)].some((value) =>
    value?.toLowerCase().includes(query)
  );
}

export default function ReservationsScreen() {
  const { canManage } = useAuth();
  return canManage ? <WithHotel>{(hotel) => <DeskReservations hotel={hotel} />}</WithHotel> : <GuestReservations />;
}

function DeskReservations({ hotel }: { hotel: Hotel }) {
  const result = useApi(() => loadDeskSections(hotel.id), String(hotel.id));
  return <ReservationList {...result} header={<HotelLine />} />;
}

function GuestReservations() {
  const result = useApi(loadGuestSections);
  return <ReservationList {...result} />;
}

function ReservationList({
  data,
  error,
  loading,
  refreshing,
  refresh,
  header,
}: {
  data: Section[] | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
  header?: ReactNode;
}) {
  const [search, setSearch] = useState('');
  useRefreshOnFocus(refresh);

  const query = search.trim().toLowerCase();
  const sections = useMemo(
    () =>
      query
        ? (data ?? [])
            .map((section) => ({ ...section, data: section.data.filter((r) => matches(r, query)) }))
            .filter((section) => section.data.length > 0)
        : (data ?? []),
    [data, query]
  );

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refresh} />;

  return (
    <SectionList
      style={styles.screen}
      sections={sections}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          {header}
          <TextInput
            style={styles.input}
            placeholder="Search guest, room or booking #"
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      }
      ListEmptyComponent={query ? <Text style={styles.empty}>No bookings match “{search.trim()}”</Text> : null}
      renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
      renderSectionFooter={({ section }) =>
        section.data.length === 0 ? <Text style={styles.empty}>Nothing here</Text> : null
      }
      renderItem={({ item }) => (
        <ReservationRow reservation={item} onPress={() => router.push(`/reservations/${item.id}`)} />
      )}
    />
  );
}
