import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Card, EmptyState, ErrorState, SkeletonList, TextField, useScreenStyles, WithHotel } from '@/components';
import { GuestRow } from '@/features/guests/components';
import { useGuestSearch } from '@/features/guests/hooks';
import { errorText } from '@/lib/http';
import type { Hotel } from '@/lib/types';
import { useDebounced } from '@/lib/useDebounced';
import { space, useTheme } from '@/theme';

export default function GuestsScreen() {
  return <WithHotel>{(hotel) => <Guests hotel={hotel} />}</WithHotel>;
}

function Guests({ hotel }: { hotel: Hotel }) {
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const term = useDebounced(text);
  const { data, error, isPending, isFetching, refetch } = useGuestSearch(hotel.id, term);
  const guests = data ?? [];

  return (
    <ScrollView
      style={screen.screen}
      contentContainerStyle={screen.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <TextField
            icon={{ ios: 'magnifyingglass', android: 'search' }}
            placeholder="Name, phone or email"
            accessibilityLabel="Search guests"
            value={text}
            onChangeText={setText}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
        </View>
        {isFetching && !isPending && <ActivityIndicator color={colors.primary} />}
      </View>
      {isPending ? (
        <SkeletonList header={false} count={4} />
      ) : error && !data ? (
        <ErrorState message={errorText(error)} onRetry={() => void refetch()} />
      ) : guests.length === 0 ? (
        <EmptyState
          fill={false}
          icon={{ ios: 'person.2', android: 'group' }}
          title={term.trim().length >= 2 ? 'No matches' : 'No guests yet'}
          message={term.trim().length >= 2 ? `Nobody matches “${term.trim()}”.` : 'Guests appear here after their first booking.'}
        />
      ) : (
        <Card padded={false}>
          {guests.map((guest, index) => (
            <GuestRow key={guest.id} guest={guest} first={index === 0} onPress={() => router.push(`/guests/${guest.id}`)} />
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
