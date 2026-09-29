import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
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
  Stepper,
  Text,
  TextField,
  useScreenStyles,
  useToast,
  WithHotel,
} from '@/components';
import { GuestIntelCard, GuestPicker, guestChoiceName, type GuestChoice } from '@/features/guests/components';
import { useGuestIntelligence } from '@/features/guests/hooks';
import { useQuickCheckIn, useRoomsTonight } from '@/features/walk-in/hooks';
import { addDays, formatMoney, hotelDay, toDateParam } from '@/lib/format';
import { errorText } from '@/lib/http';
import { PaymentMethod, PaymentMethodLabels, RoomTypeLabels, type Hotel, type Room } from '@/lib/types';
import { makeStyles, radius, space, useTheme } from '@/theme';

// The ways the desk takes money in person
const DESK_METHODS = [PaymentMethod.Cash, PaymentMethod.CreditCard, PaymentMethod.DebitCard, PaymentMethod.BankTransfer];
const MAX_NIGHTS = 30;

/** Walk-in in under a minute: who, which room, how long, paid how much → checked in */
export default function WalkInScreen() {
  return <WithHotel>{(hotel) => <WalkIn hotel={hotel} />}</WithHotel>;
}

function WalkIn({ hotel }: { hotel: Hotel }) {
  const screen = useScreenStyles();
  const [guest, setGuest] = useState<GuestChoice | null>(null);
  const [room, setRoom] = useState<Room | null>(null);

  const step = !guest ? 1 : !room ? 2 : 3;
  const titles = ['Who is checking in?', 'Pick a room', 'Stay and payment'];

  return (
    <View style={screen.screen}>
      <Stack.Screen options={{ title: `Walk-in · ${step} of 3` }} />
      {step === 1 ? (
        <ScrollView contentContainerStyle={screen.content} keyboardShouldPersistTaps="handled">
          <Text variant="title">{titles[0]}</Text>
          <GuestPicker hotelId={hotel.id} onPick={setGuest} />
        </ScrollView>
      ) : step === 2 ? (
        <RoomStep hotel={hotel} guest={guest!} onChangeGuest={() => setGuest(null)} onPick={setRoom} />
      ) : (
        <DetailsStep
          hotel={hotel}
          guest={guest!}
          room={room!}
          onChangeGuest={() => {
            setRoom(null);
            setGuest(null);
          }}
          onChangeRoom={() => setRoom(null)}
        />
      )}
    </View>
  );
}

/** The chosen guest in one line, with a way back to change it */
function Chosen({ label, title, detail, onChange }: { label: string; title: string; detail?: string; onChange: () => void }) {
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      {label === 'Guest' && <Avatar name={title} />}
      <View style={{ flex: 1 }}>
        <Text variant="caption" color="subtle">
          {label}
        </Text>
        <Text variant="headline" numberOfLines={1}>
          {title}
        </Text>
        {detail && (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {detail}
          </Text>
        )}
      </View>
      <Button title="Change" size="sm" variant="ghost" onPress={onChange} />
    </Card>
  );
}

function RoomStep({
  hotel,
  guest,
  onChangeGuest,
  onPick,
}: {
  hotel: Hotel;
  guest: GuestChoice;
  onChangeGuest: () => void;
  onPick: (room: Room) => void;
}) {
  const screen = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const rooms = useRoomsTonight(hotel.id);
  const existingId = guest.kind === 'existing' ? guest.guest.id : null;

  return (
    <ScrollView contentContainerStyle={screen.content}>
      <Chosen
        label="Guest"
        title={guestChoiceName(guest)}
        detail={guest.kind === 'new' ? 'New guest' : guest.guest.phoneNumber}
        onChange={onChangeGuest}
      />
      {existingId !== null && <GuestIntelCard guestId={existingId} />}

      <SectionHeader title="Free tonight" count={rooms.data?.length} />
      {rooms.isPending ? (
        <SkeletonList header={false} count={2} />
      ) : rooms.error && !rooms.data ? (
        <ErrorState message={errorText(rooms.error)} onRetry={() => void rooms.refetch()} />
      ) : rooms.data!.length === 0 ? (
        <EmptyState fill={false} icon={{ ios: 'bed.double', android: 'bed' }} title="No rooms free tonight" />
      ) : (
        <View style={styles.grid}>
          {rooms.data!.map((room) => (
            <Pressable
              key={room.id}
              onPress={() => onPick(room)}
              accessibilityRole="button"
              accessibilityLabel={`Room ${room.roomNumber}, ${RoomTypeLabels[room.type]}, ${formatMoney(room.pricePerNight ?? 0)} a night`}
              style={({ pressed }) => [styles.room, pressed && { backgroundColor: colors.surfaceAlt }]}
            >
              <Text variant="title">{room.roomNumber}</Text>
              <Text variant="caption" color="muted" numberOfLines={1}>
                {RoomTypeLabels[room.type].replace(/ room$/, '')}
              </Text>
              <Text variant="caption" color="subtle" numberOfLines={1}>
                Sleeps {room.capacity}
              </Text>
              <Text variant="callout" weight="600" color="primary">
                {formatMoney(room.pricePerNight ?? 0)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function DetailsStep({
  hotel,
  guest,
  room,
  onChangeGuest,
  onChangeRoom,
}: {
  hotel: Hotel;
  guest: GuestChoice;
  room: Room;
  onChangeGuest: () => void;
  onChangeRoom: () => void;
}) {
  const screen = useScreenStyles();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const checkIn = useQuickCheckIn();
  const intel = useGuestIntelligence(guest.kind === 'existing' ? guest.guest.id : null);
  const [nights, setNights] = useState(1);
  const [people, setPeople] = useState(1);
  const total = nights * (room.pricePerNight ?? 0);
  const [paid, setPaid] = useState('');
  const [paidTouched, setPaidTouched] = useState(false);
  const [method, setMethod] = useState(PaymentMethod.Cash);
  const [requests, setRequests] = useState('');

  // Until the desk types an amount, "paid now" follows the total
  const paidText = paidTouched ? paid : total.toFixed(2);
  const paidValue = Number(paidText.replace(',', '.'));
  const paidValid = paidText.trim() === '' || (Number.isFinite(paidValue) && paidValue >= 0 && paidValue <= total);
  const blacklisted = intel.data?.isBlacklisted ?? (guest.kind === 'existing' && guest.guest.isBlacklisted);

  const submit = () => {
    const today = hotelDay().date;
    const [y, m, d] = today.split('-').map(Number);
    const deposit = paidText.trim() === '' ? 0 : paidValue;
    checkIn.mutate(
      {
        hotelId: hotel.id,
        roomId: room.id,
        ...(guest.kind === 'existing' ? { existingGuestId: guest.guest.id } : { newGuest: guest.guest }),
        checkInDate: today,
        checkOutDate: toDateParam(addDays(new Date(y!, m! - 1, d!), nights)),
        numberOfGuests: people,
        depositAmount: deposit,
        paymentMethod: deposit > 0 ? method : undefined,
        specialRequests: requests.trim() || undefined,
      },
      {
        onSuccess: (reservation) => {
          toast.show(`Room ${room.roomNumber} is now occupied`);
          router.replace(`/reservations/${reservation.id}`);
        },
        onError: (e) => Alert.alert('Could not check in', errorText(e)),
      }
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[screen.content, { paddingBottom: 120 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <Chosen label="Guest" title={guestChoiceName(guest)} detail={guest.kind === 'new' ? 'New guest' : undefined} onChange={onChangeGuest} />
        <Chosen
          label="Room"
          title={`${room.roomNumber} · ${RoomTypeLabels[room.type]}`}
          detail={`${formatMoney(room.pricePerNight ?? 0)} a night · up to ${room.capacity}`}
          onChange={onChangeRoom}
        />

        <Card style={{ gap: space.sm }}>
          <Stepper
            label="Nights"
            hint={`Until ${addDays(new Date(), nights).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`}
            value={nights}
            min={1}
            max={MAX_NIGHTS}
            onChange={setNights}
          />
          <Stepper label="Guests" value={people} min={1} max={room.capacity} onChange={setPeople} />
        </Card>

        <SectionHeader title="Payment" />
        <Card style={{ gap: space.md }}>
          <KeyValue label={`${formatMoney(room.pricePerNight ?? 0)} × ${nights} night${nights === 1 ? '' : 's'}`} value={formatMoney(total)} emphasis />
          <TextField
            label="Paid now"
            keyboardType="decimal-pad"
            value={paidText}
            onChangeText={(value) => {
              setPaidTouched(true);
              setPaid(value);
            }}
            selectTextOnFocus
            error={paidValid ? null : `Up to ${formatMoney(total)}`}
            helper={paidValue < total ? `${formatMoney(total - (paidValue || 0))} left to pay at checkout` : 'Paid in full'}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {DESK_METHODS.map((m) => (
              <Chip key={m} label={PaymentMethodLabels[m]} selected={method === m} onPress={() => setMethod(m)} />
            ))}
          </View>
        </Card>

        <TextField label="Notes for the stay (optional)" value={requests} onChangeText={setRequests} placeholder="e.g. late checkout, extra bed" />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: space.md + insets.bottom }]}>
        <Button
          title={blacklisted ? 'Blacklisted guest' : `Check in · Room ${room.roomNumber}`}
          icon={{ ios: 'key.fill', android: 'key' }}
          onPress={submit}
          loading={checkIn.isPending}
          disabled={!paidValid || blacklisted}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  room: {
    width: '31.5%',
    gap: 2,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
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
