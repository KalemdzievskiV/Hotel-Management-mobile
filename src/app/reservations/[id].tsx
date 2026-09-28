import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View } from 'react-native';
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
import { StatusBadge } from '@/features/reservations/components';
import { usePayments, useRecordPayment, useReservation, useReservationAction } from '@/features/reservations/hooks';
import { useAuth } from '@/lib/auth';
import { formatMoney, formatServerTime, formatStay } from '@/lib/format';
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

// The ways the front desk takes money in person
const DESK_METHODS = [PaymentMethod.Cash, PaymentMethod.CreditCard, PaymentMethod.DebitCard, PaymentMethod.BankTransfer];

export default function ReservationScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
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
  const [paying, setPaying] = useState(false);
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

  const confirmCheckOut = () => {
    if (r.remainingAmount <= 0) return run(() => reservationsApi.checkOut(r.id), 'Checked out');
    Alert.alert('Balance still open', `${formatMoney(r.remainingAmount)} hasn't been paid yet. Check out anyway?`, [
      { text: 'Take payment first', style: 'cancel', onPress: () => setPaying(true) },
      { text: 'Check out', onPress: () => run(() => reservationsApi.checkOut(r.id), 'Checked out') },
    ]);
  };

  const confirmNoShow = () =>
    Alert.alert('Mark as no-show?', "The guest didn't arrive. The room is released.", [
      { text: 'Keep', style: 'cancel' },
      { text: 'Mark no-show', style: 'destructive', onPress: () => run(() => reservationsApi.noShow(r.id), 'Marked as no-show') },
    ]);

  const confirmCancel = () =>
    Alert.alert(
      'Cancel this booking?',
      canManage ? 'The guest will lose this booking and the room is released.' : 'Your booking will be cancelled.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: () => run(() => reservationsApi.cancel(r.id, 'Cancelled from mobile app'), 'Booking cancelled'),
        },
      ]
    );

  // A confirmed guest who hasn't turned up by the check-in date
  const canNoShow = canManage && r.status === ReservationStatus.Confirmed && new Date(r.checkInDate) <= new Date();
  const canPay = canManage && r.remainingAmount > 0 && r.status !== ReservationStatus.Cancelled;
  const paidShare = r.totalAmount > 0 ? Math.min(1, r.depositAmount / r.totalAmount) : 1;

  // The one next step at the front desk, kept within thumb reach at the bottom
  const primary = !canManage
    ? null
    : r.status === ReservationStatus.Pending
      ? { title: 'Confirm booking', onPress: () => run(() => reservationsApi.confirm(r.id), 'Booking confirmed') }
      : r.canCheckIn
        ? { title: 'Check in', onPress: () => run(() => reservationsApi.checkIn(r.id), 'Checked in') }
        : r.canCheckOut
          ? { title: 'Check out', onPress: confirmCheckOut }
          : null;

  return (
    <View style={screen.screen}>
      <ScrollView
        contentContainerStyle={[screen.content, primary && { paddingBottom: 110 + insets.bottom }]}
        refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <Card style={{ gap: space.md }}>
          <View style={screen.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1 }}>
              {canManage && <Avatar name={r.guestName ?? ''} size={48} />}
              <View style={{ flex: 1 }}>
                <Text variant="title" numberOfLines={2}>
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

        <SectionHeader title="Payment" />
        <Card style={{ gap: space.sm }}>
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
          <View style={screen.row}>
            <Text variant="caption" color="subtle">
              Paid {formatMoney(r.depositAmount)}
            </Text>
            <Text variant="caption" color="subtle">
              Total {formatMoney(r.totalAmount)}
            </Text>
          </View>

          {(payments.data?.length ?? 0) > 0 && (
            <>
              <Divider />
              {payments.data!.map((p) => (
                <PaymentLine key={p.id} payment={p} />
              ))}
            </>
          )}

          {canPay && (
            <Button
              size="sm"
              variant="secondary"
              title="Record payment"
              icon={{ ios: 'plus', android: 'add' }}
              onPress={() => setPaying(true)}
              style={{ marginTop: space.sm }}
            />
          )}
        </Card>

        {(r.specialRequests || r.notes) && (
          <>
            <SectionHeader title="Notes" />
            <Card>
              <KeyValue label="Special requests" value={r.specialRequests} />
              <KeyValue label="Notes" value={r.notes} />
            </Card>
          </>
        )}

        {(canNoShow || r.canCancel) && (
          <View style={{ gap: space.sm, marginTop: space.md }}>
            {canNoShow && (
              <Button title="Mark no-show" variant="secondary" onPress={confirmNoShow} disabled={action.isPending} />
            )}
            {r.canCancel && (
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

function Fact({ icon, text }: { icon: { ios: IosSymbol; android: AndroidSymbol }; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Icon ios={icon.ios} android={icon.android} size={17} color={colors.textMuted} />
      <Text variant="body" style={{ flex: 1 }}>
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
