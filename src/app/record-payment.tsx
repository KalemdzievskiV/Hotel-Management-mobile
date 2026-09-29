import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { EmptyState, ErrorState, SectionHeader, SkeletonList, TextField, useScreenStyles, WithHotel } from '@/components';
import { ReservationCard } from '@/features/reservations/components';
import { useDeskSearch } from '@/features/reservations/hooks';
import { errorText } from '@/lib/http';
import type { Hotel, Reservation } from '@/lib/types';
import { useDebounced } from '@/lib/useDebounced';
import { space } from '@/theme';

/** Pick whose payment to record: guests staying now or arriving today who still owe money */
export default function RecordPaymentScreen() {
  return <WithHotel>{(hotel) => <PickBooking hotel={hotel} />}</WithHotel>;
}

function PickBooking({ hotel }: { hotel: Hotel }) {
  const screen = useScreenStyles();
  const [text, setText] = useState('');
  const query = useDebounced(text);
  const inHouse = useDeskSearch(hotel.id, 'inhouse', query);
  const arrivals = useDeskSearch(hotel.id, 'arrivals', query);

  const owing = (list: typeof inHouse) =>
    (list.data?.pages.flatMap((p) => p.items) ?? []).filter((r) => r.remainingAmount > 0);
  const seen = new Set<number>();
  // A guest who arrived today is in both lists
  const bookings: Reservation[] = [...owing(inHouse), ...owing(arrivals)].filter((r) => !seen.has(r.id) && !!seen.add(r.id));

  const pending = inHouse.isPending || arrivals.isPending;
  const error = inHouse.error ?? arrivals.error;

  return (
    <FlatList
      style={screen.screen}
      contentContainerStyle={screen.content}
      data={bookings}
      keyExtractor={(r) => String(r.id)}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: space.md }}>
          <TextField
            icon={{ ios: 'magnifyingglass', android: 'search' }}
            placeholder="Guest, room or booking #"
            accessibilityLabel="Search bookings"
            value={text}
            onChangeText={setText}
            autoCorrect={false}
            autoFocus
          />
          {bookings.length > 0 && <SectionHeader title="Still to pay" count={bookings.length} />}
        </View>
      }
      ListEmptyComponent={
        pending ? (
          <SkeletonList header={false} count={3} />
        ) : error ? (
          <ErrorState message={errorText(error)} onRetry={() => void Promise.all([inHouse.refetch(), arrivals.refetch()])} />
        ) : (
          <EmptyState
            fill={false}
            icon={{ ios: 'checkmark.seal', android: 'verified' }}
            title={query ? 'No matches' : 'Nobody owes anything'}
            message={
              query
                ? 'Only guests staying now or arriving today are listed. Find others in Bookings.'
                : 'Everyone staying or arriving today has paid in full.'
            }
          />
        )
      }
      renderItem={({ item }) => (
        <ReservationCard
          reservation={item}
          perspective="desk"
          onPress={() => router.replace({ pathname: '/reservations/[id]', params: { id: String(item.id), pay: '1' } })}
        />
      )}
    />
  );
}
