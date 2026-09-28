import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Pressable, RefreshControl, SectionList, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/useApi';
import { Reservation, ReservationStatus } from '@/lib/types';
import { colors, ErrorMessage, Loading, ReservationRow, styles } from '@/components/ui';

interface Section {
  title: string;
  data: Reservation[];
}

// Staff see today's arrivals and departures first, then everything else that's still open
async function loadStaffSections(): Promise<Section[]> {
  const [checkIns, checkOuts, all] = await Promise.all([
    api.todaysCheckIns(),
    api.todaysCheckOuts(),
    api.reservations(),
  ]);
  const todayIds = new Set([...checkIns, ...checkOuts].map((r) => r.id));
  const open = all.filter(
    (r) =>
      !todayIds.has(r.id) &&
      [ReservationStatus.Pending, ReservationStatus.Confirmed, ReservationStatus.CheckedIn].includes(r.status)
  );
  return [
    { title: 'Arriving today', data: checkIns },
    { title: 'Leaving today', data: checkOuts },
    { title: 'Upcoming and in-house', data: byCheckIn(open) },
  ];
}

async function loadGuestSections(): Promise<Section[]> {
  const mine = byCheckIn(await api.reservations());
  return [{ title: 'My reservations', data: mine }];
}

function byCheckIn(list: Reservation[]): Reservation[] {
  return [...list].sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
}

export default function HomeScreen() {
  const { user, isStaff, logout } = useAuth();
  const { data, error, loading, refreshing, refresh } = useApi(
    isStaff ? loadStaffSections : loadGuestSections,
    isStaff ? 'staff' : 'guest'
  );

  // Reload when coming back from a reservation that may have changed
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => router.push('/hotels')} hitSlop={10}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>Hotels</Text>
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={logout} hitSlop={10}>
              <Text style={{ color: colors.primary, fontSize: 16 }}>Sign out</Text>
            </Pressable>
          ),
        }}
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={refresh} />
      ) : (
        <SectionList
          sections={data ?? []}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListHeaderComponent={
            <Text style={styles.muted}>
              Signed in as {user?.fullName} ({user?.roles.join(', ')})
            </Text>
          }
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          renderSectionFooter={({ section }) =>
            section.data.length === 0 ? <Text style={styles.empty}>Nothing here</Text> : null
          }
          renderItem={({ item }) => (
            <ReservationRow reservation={item} onPress={() => router.push(`/reservations/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}
