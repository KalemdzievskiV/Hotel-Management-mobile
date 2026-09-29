import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Divider,
  EmptyState,
  FadeIn,
  ErrorState,
  Icon,
  KeyValue,
  SectionHeader,
  SkeletonList,
  SuccessMark,
  Text,
  TextField,
  useScreenStyles,
} from '@/components';
import { useAvailableRooms, useCreateBooking } from '@/features/booking/hooks';
import {
  describeDates,
  nightsBetween,
  searchFromParams,
  stayPrice,
  stayWindow,
} from '@/features/booking/search';
import { useHotelDetail } from '@/features/hotels/hooks';
import { formatMoney } from '@/lib/format';
import { errorText } from '@/lib/http';
import { BookingType, RoomTypeLabels, type Reservation } from '@/lib/types';
import { makeStyles, radius, space } from '@/theme';

const MAX_REQUESTS = 1000;

/** Review the stay and book it; the hotel then confirms it */
export default function BookScreen() {
  const params = useLocalSearchParams<{ hotelId: string; roomId: string }>();
  const hotelId = Number(params.hotelId);
  const roomId = Number(params.roomId);
  const search = useMemo(() => searchFromParams(params), [params]);
  const screen = useScreenStyles();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const hotel = useHotelDetail(hotelId);
  const rooms = useAvailableRooms(hotelId, search);
  const book = useCreateBooking();
  const [requests, setRequests] = useState('');
  const [booked, setBooked] = useState<Reservation | null>(null);

  if (booked) return <Booked reservation={booked} />;
  if (hotel.isPending || rooms.isPending) return <SkeletonList count={2} header={false} />;
  if (!hotel.data) return <ErrorState message={errorText(hotel.error)} onRetry={() => void hotel.refetch()} />;

  const room = rooms.data?.find((r) => r.id === roomId);
  if (!room) {
    return (
      <EmptyState
        icon={{ ios: 'bed.double', android: 'bed' }}
        title="This room was just taken"
        message="Someone else booked it for these dates. Pick another room."
        action={{ title: 'Back to rooms', onPress: () => router.back() }}
      />
    );
  }

  const total = stayPrice(room, search);
  const nights = nightsBetween(search.checkIn, search.checkOut);
  const shortStay = search.type === BookingType.ShortStay;

  const submit = () => {
    const { checkIn, checkOut } = stayWindow(search);
    book.mutate(
      {
        hotelId,
        roomId,
        bookingType: search.type,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: search.guests,
        specialRequests: requests.trim() || undefined,
      },
      {
        onSuccess: setBooked,
        onError: (e) => Alert.alert('Could not book', errorText(e)),
      }
    );
  };

  return (
    <View style={screen.screen}>
      <Stack.Screen options={{ title: 'Review your stay' }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[screen.content, { paddingBottom: 120 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <Card style={{ gap: space.sm }}>
            <Text variant="title">{hotel.data.name}</Text>
            <Text variant="callout" color="muted">
              {[hotel.data.address, hotel.data.city].filter(Boolean).join(', ')}
            </Text>
            <Divider />
            <KeyValue label="Room" value={`${RoomTypeLabels[room.type] ?? 'Room'} · ${room.roomNumber}`} />
            <KeyValue label="When" value={describeDates(search)} />
            {!shortStay && hotel.data.checkInTime && (
              <KeyValue
                label="Check-in / out"
                value={`from ${hotel.data.checkInTime.slice(0, 5)} / by ${hotel.data.checkOutTime?.slice(0, 5) ?? '—'}`}
              />
            )}
            <KeyValue label="Guests" value={search.guests} />
          </Card>

          <SectionHeader title="Price" />
          <Card>
            <KeyValue
              label={
                shortStay
                  ? `${formatMoney(room.shortStayHourlyRate ?? 0)} × ${search.hours} h`
                  : `${formatMoney(room.pricePerNight ?? 0)} × ${nights} night${nights === 1 ? '' : 's'}`
              }
              value={formatMoney(total)}
            />
            <Divider />
            <KeyValue label="Total" value={formatMoney(total)} emphasis />
            <View style={styles.note}>
              <Icon ios="creditcard" android="payments" size={16} color={styles.noteText.color} />
              <Text variant="callout" style={[styles.noteText, { flex: 1 }]}>
                Nothing to pay now. You pay at the hotel.
              </Text>
            </View>
          </Card>

          <SectionHeader title="Anything the hotel should know?" />
          <TextField
            placeholder="e.g. arriving late, a cot for the baby (optional)"
            value={requests}
            onChangeText={setRequests}
            multiline
            maxLength={MAX_REQUESTS}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
            accessibilityLabel="Special requests"
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.bottomBar, { paddingBottom: space.md + insets.bottom }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="callout" color="muted">
            Total
          </Text>
          <Text variant="title">{formatMoney(total)}</Text>
        </View>
        <Button title="Request booking" onPress={submit} loading={book.isPending} />
      </View>
    </View>
  );
}

/** After booking: it waits for the hotel to confirm it */
function Booked({ reservation: r }: { reservation: Reservation }) {
  const screen = useScreenStyles();
  return (
    <View style={[screen.screen, { justifyContent: 'center', padding: space.xl, gap: space.lg }]}>
      <Stack.Screen options={{ title: 'Booked', headerBackVisible: false, gestureEnabled: false }} />
      <View style={{ alignSelf: 'center' }}>
        <SuccessMark size={72} />
      </View>
      <FadeIn index={3} style={{ gap: space.sm }}>
        <Text variant="display" align="center">
          Request sent
        </Text>
        <Text variant="body" color="muted" align="center">
          {r.hotelName ?? 'The hotel'} will confirm your booking #{r.id} soon. You can follow it in Trips.
        </Text>
      </FadeIn>
      <View style={{ gap: space.sm }}>
        <Button title="View booking" onPress={() => router.replace(`/reservations/${r.id}`)} />
        <Button
          title="Back to Explore"
          variant="ghost"
          onPress={() => {
            router.dismissAll();
            router.navigate('/');
          }}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: t.colors.tones.info.bg,
  },
  noteText: { color: t.colors.tones.info.fg },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
}));
