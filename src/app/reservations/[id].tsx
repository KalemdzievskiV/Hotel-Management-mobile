import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  ErrorState,
  Icon,
  KeyValue,
  SectionHeader,
  Sheet,
  SkeletonList,
  Text,
  TextField,
  useScreenStyles,
  useToast,
} from '@/components';
import type { AndroidSymbol, IosSymbol } from '@/components/Icon';
import { reservationsApi } from '@/features/reservations/api';
import { useHotelDetail } from '@/features/hotels/hooks';
import { NewTaskSheet } from '@/features/housekeeping/components';
import {
  CancelSheet,
  CheckoutSheet,
  DESK_METHODS,
  EditBookingSheet,
  RefundSheet,
  StatusBadge,
  StatusTimeline,
} from '@/features/reservations/components';
import {
  useExpressCheckOut,
  usePayments,
  useRecordPayment,
  useRefund,
  useReservation,
  useReservationAction,
  useUpdateReservation,
} from '@/features/reservations/hooks';
import { useAuth } from '@/lib/auth';
import { formatMoney, formatServerTime, formatStay, parseStayTime, toDateParam } from '@/lib/format';
import { errorText } from '@/lib/http';
import { usePullToRefresh } from '@/lib/query';
import {
  Payment,
  PaymentMethod,
  PaymentMethodLabels,
  PaymentTransactionType,
  Reservation,
  ReservationStatus,
} from '@/lib/types';
import { makeStyles, radius, space, useTheme } from '@/theme';

export default function ReservationScreen() {
  // `pay=1` opens straight on "Record payment" (from the ＋ menu)
  const { id: idParam, pay } = useLocalSearchParams<{ id: string; pay?: string }>();
  const id = Number(idParam);
  const { canManage } = useAuth();
  const screen = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const reservation = useReservation(id);
  const payments = usePayments(id);
  const action = useReservationAction(id);
  const checkout = useExpressCheckOut(id);
  const refund = useRefund(id);
  const update = useUpdateReservation(id);
  const [paying, setPaying] = useState(pay === '1');
  const [cancelling, setCancelling] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [editing, setEditing] = useState(false);
  // After a checkout: offer a cleaning task for the room
  const [justLeft, setJustLeft] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const pull = usePullToRefresh(() => Promise.all([reservation.refetch(), payments.refetch()]));

  if (reservation.isPending) return <SkeletonList count={3} header={false} />;
  if (!reservation.data) {
    return <ErrorState message={errorText(reservation.error)} onRetry={() => void reservation.refetch()} />;
  }
  const r = reservation.data;

  const run = (call: () => Promise<Reservation>, done: string) =>
    action.mutate(call, {
      onSuccess: () => toast.show(done),
      onError: (e) => Alert.alert('Could not update', errorText(e)),
    });

  // With money owed, the checkout sheet takes it in the same step
  const startCheckOut = () => {
    if (r.remainingAmount > 0) return setCheckingOut(true);
    action.mutate(() => reservationsApi.checkOut(r.id), {
      onSuccess: () => {
        toast.show(`Room ${r.roomNumber} checked out`);
        setJustLeft(true);
      },
      onError: (e) => Alert.alert('Could not check out', errorText(e)),
    });
  };

  const expressCheckOut = (payment: { amount: number; method: PaymentMethod; extraCharges: number; extraNotes?: string }) =>
    checkout.mutate(payment, {
      onSuccess: () => {
        setCheckingOut(false);
        toast.show(payment.amount > 0 ? `Paid ${formatMoney(payment.amount)} · checked out` : 'Checked out');
        setJustLeft(true);
      },
      onError: (e) => Alert.alert('Could not check out', errorText(e)),
    });

  const doRefund = (refundRequest: { amount: number; reason?: string }) =>
    refund.mutate(refundRequest, {
      onSuccess: () => {
        setRefunding(false);
        toast.show(`Refunded ${formatMoney(refundRequest.amount)}`);
      },
      onError: (e) => Alert.alert('Could not refund', errorText(e)),
    });

  const confirmNoShow = () =>
    Alert.alert('Mark as no-show?', "The guest didn't arrive. The room is released.", [
      { text: 'Keep', style: 'cancel' },
      { text: 'Mark no-show', style: 'destructive', onPress: () => run(() => reservationsApi.noShow(r.id), 'Marked as no-show') },
    ]);

  const confirmCancel = () => {
    if (!canManage) return setCancelling(true);
    Alert.alert('Cancel this booking?', 'The guest will lose this booking and the room is released.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: () => run(() => reservationsApi.cancel(r.id, 'Cancelled by the hotel from the mobile app'), 'Booking cancelled'),
      },
    ]);
  };

  // Guests can cancel until their stay starts; after that it's for the hotel to sort out
  const canCancel = !!r.canCancel && (canManage || r.checkInDate.slice(0, 10) >= toDateParam(new Date()));

  // A confirmed guest whose check-in day has passed without them turning up
  const canNoShow =
    canManage && r.status === ReservationStatus.Confirmed && toDateParam(parseStayTime(r.checkInDate)) < toDateParam(new Date());
  const canPay = canManage && r.remainingAmount > 0 && r.status !== ReservationStatus.Cancelled;
  const canRefund = canManage && r.depositAmount > 0;
  const canEdit =
    canManage &&
    [ReservationStatus.Pending, ReservationStatus.Confirmed, ReservationStatus.CheckedIn].includes(r.status);
  const cancelled = r.status === ReservationStatus.Cancelled;
  const paidShare = r.totalAmount > 0 ? Math.min(1, r.depositAmount / r.totalAmount) : 1;

  // The one next step at the front desk, kept within thumb reach at the bottom
  const primary = !canManage
    ? null
    : r.status === ReservationStatus.Pending
      ? { title: 'Confirm booking', onPress: () => run(() => reservationsApi.confirm(r.id), 'Booking confirmed') }
      : r.canCheckIn
        ? { title: 'Check in', onPress: () => run(() => reservationsApi.checkIn(r.id), 'Checked in') }
        : r.canCheckOut
          ? { title: r.remainingAmount > 0 ? `Check out · ${formatMoney(r.remainingAmount)} due` : 'Check out', onPress: startCheckOut }
          : null;

  return (
    <View style={screen.screen}>
      <Stack.Screen
        options={{
          headerRight: canEdit
            ? () => (
                <Pressable onPress={() => setEditing(true)} hitSlop={10} accessibilityRole="button" style={{ marginRight: space.lg }}>
                  <Text variant="body" weight="600" color="primary">
                    Edit
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView
        contentContainerStyle={[screen.content, primary && { paddingBottom: 110 + insets.bottom }]}
        refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <Card style={{ gap: space.md }}>
          <View style={screen.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1 }}>
              {canManage && <Avatar name={r.guestName ?? ''} size={48} />}
              <View style={{ flex: 1 }}>
                <Text
                  variant="title"
                  numberOfLines={2}
                  onPress={canManage ? () => router.push(`/guests/${r.guestId}`) : undefined}
                  accessibilityRole={canManage ? 'link' : undefined}
                  accessibilityHint={canManage ? "Opens the guest's profile" : undefined}
                >
                  {canManage ? (r.guestName ?? `Booking #${r.id}`) : (r.hotelName ?? `Booking #${r.id}`)}
                </Text>
                <Text variant="callout" color="muted">
                  Booking #{r.id}
                </Text>
              </View>
            </View>
            <StatusBadge status={r.status} />
          </View>
          <View style={styles.facts}>
            <Fact icon={{ ios: 'calendar', android: 'calendar_month' }} text={formatStay(r)} />
            <Fact icon={{ ios: 'bed.double', android: 'bed' }} text={`Room ${r.roomNumber}${canManage ? '' : ` · ${r.hotelName}`}`} />
            <Fact
              icon={{ ios: 'person.2', android: 'group' }}
              text={`${r.numberOfGuests} guest${r.numberOfGuests === 1 ? '' : 's'}`}
            />
          </View>
        </Card>

        {justLeft && r.status === ReservationStatus.CheckedOut && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.tones.warning.bg }}>
            <Icon ios="sparkles" android="cleaning_services" size={22} color={colors.tones.warning.fg} />
            <View style={{ flex: 1 }}>
              <Text variant="headline" color="warning">
                Room {r.roomNumber} needs cleaning
              </Text>
              <Text variant="callout" color="warning">
                Give it to housekeeping now?
              </Text>
            </View>
            <Button title="Create task" size="sm" onPress={() => setAddingTask(true)} />
          </Card>
        )}

        <SectionHeader title="Payment" />
        <Card style={{ gap: space.sm }}>
          {cancelled ? (
            // The API still counts the total as owed; nobody owes anything for a cancelled stay
            <View style={screen.row}>
              <Text variant="body" color="muted">
                {r.depositAmount > 0 ? 'Paid, to be refunded' : 'Balance'}
              </Text>
              <Text variant="title" color={r.depositAmount > 0 ? 'info' : 'muted'}>
                {r.depositAmount > 0 ? formatMoney(r.depositAmount) : 'Nothing to pay'}
              </Text>
            </View>
          ) : (
            <>
              <View style={screen.row}>
                <Text variant="body" color="muted">
                  {r.remainingAmount > 0 ? 'Balance due' : 'Balance'}
                </Text>
                <Text variant="title" color={r.remainingAmount > 0 ? 'warning' : 'success'}>
                  {r.remainingAmount > 0 ? formatMoney(r.remainingAmount) : 'Paid in full'}
                </Text>
              </View>
              <View style={styles.progressTrack} accessibilityLabel={`${Math.round(paidShare * 100)}% paid`}>
                <View style={[styles.progressFill, { width: `${paidShare * 100}%` }]} />
              </View>
            </>
          )}
          <View style={screen.row}>
            <Text variant="caption" color="subtle">
              Paid {formatMoney(r.depositAmount)}
            </Text>
            <Text variant="caption" color="subtle">
              Total {formatMoney(r.totalAmount)}
            </Text>
          </View>

          {!canManage && r.remainingAmount > 0 && !cancelled && (
            <Text variant="caption" color="muted">
              You pay the hotel when you arrive.
            </Text>
          )}

          {(payments.data?.length ?? 0) > 0 && (
            <>
              <Divider />
              {payments.data!.map((p) => (
                <PaymentLine key={p.id} payment={p} />
              ))}
            </>
          )}

          {(canPay || canRefund) && (
            <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
              {canPay && (
                <Button
                  size="sm"
                  variant="secondary"
                  title="Record payment"
                  icon={{ ios: 'plus', android: 'add' }}
                  onPress={() => setPaying(true)}
                />
              )}
              {canRefund && (
                <Button
                  size="sm"
                  variant="ghost"
                  title="Refund"
                  icon={{ ios: 'arrow.uturn.backward', android: 'undo' }}
                  onPress={() => setRefunding(true)}
                />
              )}
            </View>
          )}
        </Card>

        {!canManage && (
          <>
            <SectionHeader title="Status" />
            <Card>
              <StatusTimeline reservation={r} />
            </Card>
            <HotelCard hotelId={r.hotelId} />
          </>
        )}

        {(r.specialRequests || r.notes) && (
          <>
            <SectionHeader title="Notes" />
            <Card>
              <KeyValue label="Special requests" value={r.specialRequests} />
              <KeyValue label="Notes" value={r.notes} />
            </Card>
          </>
        )}

        {(canNoShow || canCancel) && (
          <View style={{ gap: space.sm, marginTop: space.md }}>
            {canNoShow && (
              <Button title="Mark no-show" variant="secondary" onPress={confirmNoShow} disabled={action.isPending} />
            )}
            {canCancel && (
              <Button
                title="Cancel booking"
                variant="ghost"
                onPress={confirmCancel}
                disabled={action.isPending}
                style={{ backgroundColor: colors.tones.danger.bg }}
              />
            )}
          </View>
        )}
      </ScrollView>

      {primary && (
        <View style={[styles.bottomBar, { paddingBottom: space.md + insets.bottom }]}>
          <Button title={primary.title} onPress={primary.onPress} loading={action.isPending} />
        </View>
      )}

      {!canManage && canCancel && (
        <CancelSheet
          visible={cancelling}
          onClose={() => setCancelling(false)}
          busy={action.isPending}
          onCancel={(reason) =>
            action.mutate(() => reservationsApi.cancel(r.id, reason), {
              onSuccess: () => {
                setCancelling(false);
                toast.show('Booking cancelled');
              },
              onError: (e) => Alert.alert('Could not cancel', errorText(e)),
            })
          }
        />
      )}

      {canManage && (
        <>
          {r.canCheckOut && (
            <CheckoutSheet
              visible={checkingOut}
              reservation={r}
              busy={checkout.isPending}
              onClose={() => setCheckingOut(false)}
              onCheckOut={expressCheckOut}
            />
          )}
          {canRefund && (
            <RefundSheet visible={refunding} reservation={r} busy={refund.isPending} onClose={() => setRefunding(false)} onRefund={doRefund} />
          )}
          {canEdit && (
            <EditBookingSheet
              visible={editing}
              reservation={r}
              busy={update.isPending}
              onClose={() => setEditing(false)}
              onSave={(changes, onError) =>
                update.mutate(changes, {
                  onSuccess: () => {
                    setEditing(false);
                    toast.show('Booking updated');
                  },
                  onError: (e) => onError(errorText(e)),
                })
              }
            />
          )}
          <NewTaskSheet
            hotelId={r.hotelId}
            roomId={r.roomId}
            visible={addingTask}
            onClose={() => {
              setAddingTask(false);
              setJustLeft(false);
            }}
          />
        </>
      )}

      {canPay && (
        <Sheet
          visible={paying}
          onClose={() => setPaying(false)}
          title="Record payment"
          message={`${formatMoney(r.remainingAmount)} still to pay`}
        >
          <PaymentForm reservation={r} onDone={() => setPaying(false)} />
        </Sheet>
      )}
    </View>
  );
}

/** Where the guest is going: address (opens maps), times, and the hotel's phone */
function HotelCard({ hotelId }: { hotelId: number }) {
  const { data: hotel } = useHotelDetail(hotelId);
  if (!hotel) return null;
  const address = [hotel.address, hotel.city, hotel.country].filter(Boolean).join(', ');
  return (
    <>
      <SectionHeader title="The hotel" />
      <Card style={{ gap: space.sm }}>
        <Text variant="headline">{hotel.name}</Text>
        <Fact
          icon={{ ios: 'mappin.and.ellipse', android: 'location_on' }}
          text={address}
          onPress={() =>
            void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)
          }
        />
        {hotel.checkInTime && hotel.checkOutTime && (
          <Fact
            icon={{ ios: 'clock', android: 'schedule' }}
            text={`Check-in from ${hotel.checkInTime.slice(0, 5)} · Check-out by ${hotel.checkOutTime.slice(0, 5)}`}
          />
        )}
        {!!hotel.phoneNumber && (
          <Fact
            icon={{ ios: 'phone', android: 'call' }}
            text={hotel.phoneNumber}
            onPress={() => void Linking.openURL(`tel:${hotel.phoneNumber!.replace(/[^\d+]/g, '')}`)}
          />
        )}
      </Card>
    </>
  );
}

function Fact({
  icon,
  text,
  onPress,
}: {
  icon: { ios: IosSymbol; android: AndroidSymbol };
  text: string;
  /** Makes the text a link, e.g. to maps or the phone */
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Icon ios={icon.ios} android={icon.android} size={17} color={colors.textMuted} />
      <Text
        variant="body"
        style={{ flex: 1, color: onPress ? colors.primary : colors.text }}
        onPress={onPress}
        accessibilityRole={onPress ? 'link' : undefined}
      >
        {text}
      </Text>
    </View>
  );
}

function PaymentLine({ payment: p }: { payment: Payment }) {
  const refund = p.type === PaymentTransactionType.Refund;
  const method = p.method !== null && p.method !== undefined ? PaymentMethodLabels[p.method] : null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md, paddingVertical: space.xs }}>
      <View style={{ flexShrink: 1 }}>
        <Text variant="body" weight="500">
          {refund ? 'Refund' : (method ?? 'Payment')}
        </Text>
        <Text variant="caption" color="subtle">
          {[formatServerTime(p.createdAt), p.reference, p.createdByName].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text variant="body" weight="600" color={refund ? 'danger' : 'text'}>
        {refund ? '−' : ''}
        {formatMoney(p.amount)}
      </Text>
    </View>
  );
}

function PaymentForm({ reservation, onDone }: { reservation: Reservation; onDone: () => void }) {
  const record = useRecordPayment(reservation.id);
  const toast = useToast();
  const [amount, setAmount] = useState(reservation.remainingAmount.toFixed(2));
  const [method, setMethod] = useState(PaymentMethod.Cash);
  const [reference, setReference] = useState('');

  // Accept a decimal comma too, as phone keyboards in many regions type one
  const value = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(value) && value > 0 && value <= reservation.remainingAmount;

  const save = () =>
    record.mutate(
      { amount: value, method, reference: reference.trim() || undefined },
      {
        onSuccess: () => {
          toast.show(`Payment of ${formatMoney(value)} recorded`);
          onDone();
        },
        onError: (e) => Alert.alert('Could not record the payment', errorText(e)),
      }
    );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: space.md }}>
      <TextField
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        selectTextOnFocus
        error={!valid && amount !== '' ? `Enter an amount up to ${formatMoney(reservation.remainingAmount)}` : null}
      />
      <View style={{ gap: space.xs + 2 }}>
        <Text variant="callout" weight="500" color="muted">
          Method
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {DESK_METHODS.map((m) => (
            <Chip key={m} label={PaymentMethodLabels[m]} selected={method === m} onPress={() => setMethod(m)} />
          ))}
        </View>
      </View>
      <TextField
        label="Reference (optional)"
        placeholder="e.g. receipt #"
        value={reference}
        onChangeText={setReference}
      />
      <Button
        title={valid ? `Record ${formatMoney(value)}` : 'Record payment'}
        onPress={save}
        loading={record.isPending}
        disabled={!valid}
      />
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  facts: { gap: space.sm, paddingTop: space.xs },
  progressTrack: { height: 8, borderRadius: radius.pill, backgroundColor: t.colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: t.colors.tones.success.fg },
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
