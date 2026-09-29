import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  KeyValue,
  SectionHeader,
  SkeletonList,
  Text,
  TextField,
  useScreenStyles,
  useToast,
  WithHotel,
} from '@/components';
import { RoomOffer, SearchSheet, SearchSummary } from '@/features/booking/components';
import { useAvailableRooms } from '@/features/booking/hooks';
import { defaultSearch, describeSearch, searchProblem, stayPrice, stayWindow, type StaySearch } from '@/features/booking/search';
import { guestsApi } from '@/features/guests/api';
import { GuestIntelCard, GuestPicker, guestChoiceName, type GuestChoice } from '@/features/guests/components';
import { useGuestIntelligence } from '@/features/guests/hooks';
import { useCreateDeskBooking } from '@/features/reservations/hooks';
import { formatMoney } from '@/lib/format';
import { errorText } from '@/lib/http';
import { PaymentMethod, PaymentMethodLabels, RoomTypeLabels, type Hotel, type Room } from '@/lib/types';
import { makeStyles, space } from '@/theme';

const DESK_METHODS = [PaymentMethod.Cash, PaymentMethod.CreditCard, PaymentMethod.DebitCard, PaymentMethod.BankTransfer];

/** A booking taken at the desk or on the phone: who, when, which room, any deposit */
export default function NewReservationScreen() {
  return <WithHotel>{(hotel) => <NewReservation hotel={hotel} />}</WithHotel>;
}

function NewReservation({ hotel }: { hotel: Hotel }) {
  const screen = useScreenStyles();
  const [guest, setGuest] = useState<GuestChoice | null>(null);
  const [search, setSearch] = useState<StaySearch>(defaultSearch);
  const [room, setRoom] = useState<Room | null>(null);

  const step = !guest ? 1 : !room ? 2 : 3;

  return (
    <View style={screen.screen}>
      <Stack.Screen options={{ title: `New reservation · ${step} of 3` }} />
      {step === 1 ? (
        <ScrollView contentContainerStyle={screen.content} keyboardShouldPersistTaps="handled">
          <Text variant="title">Who is it for?</Text>
          <GuestPicker hotelId={hotel.id} onPick={setGuest} />
        </ScrollView>
      ) : step === 2 ? (
        <RoomStep
          hotel={hotel}
          guest={guest!}
          search={search}
          onSearch={setSearch}
          onChangeGuest={() => setGuest(null)}
          onPick={setRoom}
        />
      ) : (
        <ConfirmStep
          hotel={hotel}
          guest={guest!}
          search={search}
          room={room!}
          onBack={() => setRoom(null)}
        />
      )}
    </View>
  );
}

function GuestLine({ guest, onChange }: { guest: GuestChoice; onChange: () => void }) {
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Avatar name={guestChoiceName(guest)} />
      <View style={{ flex: 1 }}>
        <Text variant="headline" numberOfLines={1}>
          {guestChoiceName(guest)}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {guest.kind === 'new' ? 'New guest' : guest.guest.phoneNumber}
        </Text>
      </View>
      <Button title="Change" size="sm" variant="ghost" onPress={onChange} />
    </Card>
  );
}

function RoomStep({
  hotel,
  guest,
  search,
  onSearch,
  onChangeGuest,
  onPick,
}: {
  hotel: Hotel;
  guest: GuestChoice;
  search: StaySearch;
  onSearch: (search: StaySearch) => void;
  onChangeGuest: () => void;
  onPick: (room: Room) => void;
}) {
  const screen = useScreenStyles();
  const rooms = useAvailableRooms(hotel.id, search);
  const [editing, setEditing] = useState(false);
  const problem = searchProblem(search);

  return (
    <>
      <ScrollView contentContainerStyle={screen.content}>
        <GuestLine guest={guest} onChange={onChangeGuest} />
        {guest.kind === 'existing' && <GuestIntelCard guestId={guest.guest.id} />}

        <SectionHeader title="When" />
        <SearchSummary search={search} onPress={() => setEditing(true)} />

        <SectionHeader title="Free rooms" count={rooms.data?.length} />
        {problem ? (
          <Text variant="callout" color="subtle">
            {problem}.
          </Text>
        ) : rooms.isPending ? (
          <SkeletonList header={false} count={2} />
        ) : rooms.error && !rooms.data ? (
          <ErrorState message={errorText(rooms.error)} onRetry={() => void rooms.refetch()} />
        ) : rooms.data!.length === 0 ? (
          <EmptyState
            fill={false}
            icon={{ ios: 'bed.double', android: 'bed' }}
            title="No rooms free"
            message="Nothing fits these dates and guests."
            action={{ title: 'Change dates', onPress: () => setEditing(true) }}
          />
        ) : (
          rooms.data!.map((room) => <RoomOffer key={room.id} room={room} search={search} onPress={() => onPick(room)} />)
        )}
      </ScrollView>
      <SearchSheet
        visible={editing}
        search={search}
        onClose={() => setEditing(false)}
        onApply={(next) => {
          onSearch(next);
          setEditing(false);
        }}
      />
    </>
  );
}

function ConfirmStep({
  hotel,
  guest,
  search,
  room,
  onBack,
}: {
  hotel: Hotel;
  guest: GuestChoice;
  search: StaySearch;
  room: Room;
  onBack: () => void;
}) {
  const screen = useScreenStyles();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const create = useCreateDeskBooking();
  const intel = useGuestIntelligence(guest.kind === 'existing' ? guest.guest.id : null);
  const [creatingGuest, setCreatingGuest] = useState(false);
  const [deposit, setDeposit] = useState('');
  const [method, setMethod] = useState(PaymentMethod.Cash);
  const [requests, setRequests] = useState('');
  const [notes, setNotes] = useState('');

  const total = stayPrice(room, search);
  const depositValue = deposit.trim() === '' ? 0 : Number(deposit.replace(',', '.'));
  const depositValid = Number.isFinite(depositValue) && depositValue >= 0 && depositValue <= total;
  const blacklisted = intel.data?.isBlacklisted ?? false;

  const submit = async () => {
    try {
      // A new guest is created first; a returning one (same email) is found by the API instead
      let guestId: number;
      if (guest.kind === 'existing') guestId = guest.guest.id;
      else {
        setCreatingGuest(true);
        const found = await guestsApi.search(guest.guest.email).catch(() => []);
        const match = found.find((g) => g.email.toLowerCase() === guest.guest.email.toLowerCase());
        guestId = match ? match.id : (await guestsApi.create(hotel.id, guest.guest)).id;
        setCreatingGuest(false);
      }
      const { checkIn, checkOut } = stayWindow(search);
      const reservation = await create.mutateAsync({
        hotelId: hotel.id,
        roomId: room.id,
        guestId,
        bookingType: search.type,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: search.guests,
        depositAmount: depositValue,
        paymentMethod: depositValue > 0 ? method : undefined,
        specialRequests: requests.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.show(`Booked room ${room.roomNumber} for ${guestChoiceName(guest)}`);
      router.replace(`/reservations/${reservation.id}`);
    } catch (e) {
      setCreatingGuest(false);
      Alert.alert('Could not book', errorText(e));
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[screen.content, { paddingBottom: 120 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: space.xs }}>
          <KeyValue label="Guest" value={guestChoiceName(guest)} />
          <KeyValue label="Room" value={`${room.roomNumber} · ${RoomTypeLabels[room.type]}`} />
          <KeyValue label="When" value={describeSearch(search)} />
          <KeyValue label="Total" value={formatMoney(total)} emphasis />
          <Button title="Change room or dates" size="sm" variant="ghost" onPress={onBack} style={{ alignSelf: 'flex-end' }} />
        </Card>

        <SectionHeader title="Deposit" />
        <Card style={{ gap: space.md }}>
          <TextField
            label="Taken now (optional)"
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={deposit}
            onChangeText={setDeposit}
            error={depositValid ? null : `Up to ${formatMoney(total)}`}
          />
          {depositValue > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {DESK_METHODS.map((m) => (
                <Chip key={m} label={PaymentMethodLabels[m]} selected={method === m} onPress={() => setMethod(m)} />
              ))}
            </View>
          )}
        </Card>

        <TextField label="Guest's requests (optional)" value={requests} onChangeText={setRequests} placeholder="e.g. quiet room, late arrival" />
        <TextField label="Staff notes (optional)" value={notes} onChangeText={setNotes} helper="Only staff see these" />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: space.md + insets.bottom }]}>
        <Button
          title={blacklisted ? 'Blacklisted guest' : `Book · ${formatMoney(total)}`}
          onPress={() => void submit()}
          loading={create.isPending || creatingGuest}
          disabled={!depositValid || blacklisted}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
}));
