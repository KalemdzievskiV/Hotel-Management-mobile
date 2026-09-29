import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState, ErrorState, FadeIn, SkeletonList, Text, TextField, useScreenStyles } from '@/components';
import { useHotels } from '@/features/hotels/hooks';
import { useAuth } from '@/lib/auth';
import { errorText } from '@/lib/http';
import { usePullToRefresh } from '@/lib/query';
import type { Hotel } from '@/lib/types';
import { space, useTheme } from '@/theme';
import { HotelCard, SearchSheet, SearchSummary } from './components';
import { useHotelsAvailability } from './hooks';
import { defaultSearch, searchToParams, type StaySearch } from './search';

function matches(hotel: Hotel, term: string): boolean {
  return [hotel.name, hotel.city, hotel.country, hotel.address].some((value) => value?.toLowerCase().includes(term));
}

/** Guests' home: where to stay, when, and which hotels have a room for it */
export function ExploreScreen() {
  const screen = useScreenStyles();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hotels = useHotels();
  const [search, setSearch] = useState<StaySearch>(defaultSearch);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const term = text.trim().toLowerCase();
  const shown = useMemo(
    () => (hotels.data ?? []).filter((hotel) => !term || matches(hotel, term)),
    [hotels.data, term]
  );
  const availability = useHotelsAvailability(shown, search);

  // Hotels with a free room first, cheapest first; full ones after
  const ordered = useMemo(() => {
    const withRooms = shown.map((hotel, i) => ({ hotel, query: availability[i]! }));
    const price = (rooms?: { pricePerNight?: number }[]) => rooms?.[0]?.pricePerNight ?? Infinity;
    return withRooms.sort((a, b) => {
      const aFull = a.query.data?.length === 0 ? 1 : 0;
      const bFull = b.query.data?.length === 0 ? 1 : 0;
      return aFull - bFull || price(a.query.data) - price(b.query.data);
    });
  }, [shown, availability]);

  const pull = usePullToRefresh(() => Promise.all([hotels.refetch(), ...availability.map((q) => q.refetch())]));

  if (hotels.isPending) return <SkeletonList count={3} />;
  if (hotels.error && !hotels.data) {
    return <ErrorState message={errorText(hotels.error)} onRetry={() => void hotels.refetch()} />;
  }

  const firstName = user?.fullName.split(' ')[0];

  return (
    <>
      <FlatList
        style={screen.screen}
        contentContainerStyle={[screen.content, { paddingTop: insets.top + space.lg }]}
        data={ordered}
        keyExtractor={({ hotel }) => String(hotel.id)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.xs }}>
            <View style={{ gap: 2 }}>
              <Text variant="display">{firstName ? `Hi ${firstName}` : 'Find a stay'}</Text>
              <Text variant="body" color="muted">
                Where would you like to stay?
              </Text>
            </View>
            <TextField
              icon={{ ios: 'magnifyingglass', android: 'search' }}
              placeholder="City or hotel"
              accessibilityLabel="Search by city or hotel"
              value={text}
              onChangeText={setText}
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            <SearchSummary search={search} onPress={() => setEditing(true)} />
          </View>
        }
        ListEmptyComponent={
          term ? (
            <EmptyState
              fill={false}
              icon={{ ios: 'magnifyingglass', android: 'search' }}
              title="No matches"
              message={`No hotels match “${text.trim()}”.`}
            />
          ) : (
            <EmptyState
              fill={false}
              icon={{ ios: 'building.2', android: 'apartment' }}
              title="No hotels yet"
              message="Check back soon."
            />
          )
        }
        renderItem={({ item: { hotel, query }, index }) => (
          <FadeIn index={index}>
            <HotelCard
              hotel={hotel}
              rooms={query.data}
              loading={query.isPending && query.fetchStatus !== 'idle'}
              search={search}
              onPress={() =>
                router.push({ pathname: '/hotels/[id]', params: { id: String(hotel.id), ...searchToParams(search) } })
              }
            />
          </FadeIn>
        )}
      />
      <SearchSheet
        visible={editing}
        search={search}
        onClose={() => setEditing(false)}
        onApply={(next) => {
          setSearch(next);
          setEditing(false);
        }}
      />
    </>
  );
}
