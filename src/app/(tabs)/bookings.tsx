import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, View } from 'react-native';
import {
  Chip,
  EmptyState,
  FadeIn,
  ErrorState,
  HotelLine,
  SkeletonList,
  Text,
  TextField,
  useScreenStyles,
  WithHotel,
} from '@/components';
import type { DeskSegment } from '@/features/reservations/api';
import { ReservationCard } from '@/features/reservations/components';
import { useDeskSearch } from '@/features/reservations/hooks';
import { errorText } from '@/lib/http';
import { usePullToRefresh, useRefreshOnFocus } from '@/lib/query';
import type { Hotel } from '@/lib/types';
import { useDebounced } from '@/lib/useDebounced';
import { space, useTheme } from '@/theme';

const SEGMENTS: { value: DeskSegment; label: string; empty: string }[] = [
  { value: 'arrivals', label: 'Arriving', empty: 'No arrivals today' },
  { value: 'departures', label: 'Leaving', empty: 'No departures today' },
  { value: 'inhouse', label: 'In-house', empty: 'Nobody is staying right now' },
  { value: 'upcoming', label: 'Upcoming', empty: 'Nothing booked for later' },
  { value: 'pending', label: 'To approve', empty: 'No bookings waiting for approval' },
  { value: 'all', label: 'All', empty: 'No bookings yet' },
];

function isSegment(value: unknown): value is DeskSegment {
  return SEGMENTS.some((s) => s.value === value);
}

export default function BookingsScreen() {
  return <WithHotel>{(hotel) => <Bookings hotel={hotel} />}</WithHotel>;
}

function Bookings({ hotel }: { hotel: Hotel }) {
  const screen = useScreenStyles();
  const { colors } = useTheme();
  // Today's tiles open this tab on a segment
  const params = useLocalSearchParams<{ segment?: string }>();
  // A chip picked here wins until a tile opens the tab with a different segment
  const [picked, setPicked] = useState<{ param?: string; segment: DeskSegment }>(() => ({
    param: params.segment,
    segment: isSegment(params.segment) ? params.segment : 'arrivals',
  }));
  const segment = params.segment !== picked.param && isSegment(params.segment) ? params.segment : picked.segment;
  const setSegment = (value: DeskSegment) => setPicked({ param: params.segment, segment: value });

  const [text, setText] = useState('');
  const query = useDebounced(text);
  const list = useDeskSearch(hotel.id, segment, query);
  const pull = usePullToRefresh(list.refetch);
  useRefreshOnFocus(list.refetch);

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages[0]?.totalCount ?? 0;
  const current = SEGMENTS.find((s) => s.value === segment)!;

  return (
    <FlatList
      style={screen.screen}
      contentContainerStyle={screen.content}
      data={items}
      keyExtractor={(item) => String(item.id)}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
      }}
      ListHeaderComponent={
        <View style={{ gap: space.md }}>
          <HotelLine />
          <TextField
            icon={{ ios: 'magnifyingglass', android: 'search' }}
            placeholder="Guest, phone, room or booking #"
            accessibilityLabel="Search bookings"
            value={text}
            onChangeText={setText}
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: space.sm }}
            style={{ marginHorizontal: -space.lg }}
          >
            <View style={{ width: space.lg - space.sm }} />
            {SEGMENTS.map((s) => (
              <Chip
                key={s.value}
                label={s.label}
                count={s.value === segment && !list.isPending ? total : undefined}
                selected={s.value === segment}
                onPress={() => setSegment(s.value)}
              />
            ))}
            <View style={{ width: space.lg - space.sm }} />
          </ScrollView>
        </View>
      }
      ListEmptyComponent={
        list.isPending ? (
          <SkeletonList header={false} count={3} />
        ) : list.error ? (
          <ErrorState message={errorText(list.error)} onRetry={() => void list.refetch()} />
        ) : (
          <EmptyState
            fill={false}
            icon={query ? { ios: 'magnifyingglass', android: 'search' } : { ios: 'calendar', android: 'calendar_month' }}
            title={query ? 'No matches' : current.empty}
            message={query ? `Nothing in “${current.label}” matches “${query}”.` : undefined}
            action={
              query
                ? { title: 'Search all bookings', onPress: () => setSegment('all') }
                : { title: 'New booking', onPress: () => router.push('/reservations/new') }
            }
          />
        )
      }
      ListFooterComponent={
        list.isFetchingNextPage ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: space.lg }} />
        ) : items.length > 0 ? (
          <Text variant="caption" color="subtle" align="center" style={{ paddingVertical: space.sm }}>
            {total} booking{total === 1 ? '' : 's'}
          </Text>
        ) : null
      }
      renderItem={({ item, index }) => (
        <FadeIn index={index}>
          <ReservationCard reservation={item} perspective="desk" onPress={() => router.push(`/reservations/${item.id}`)} />
        </FadeIn>
      )}
    />
  );
}
