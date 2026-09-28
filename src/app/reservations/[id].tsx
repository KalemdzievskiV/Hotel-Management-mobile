import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/useApi';
import { formatMoney, formatServerTime, formatStay } from '@/lib/format';
import {
  Payment,
  PaymentMethod,
  PaymentMethodLabels,
  PaymentTransactionType,
  Reservation,
  ReservationStatus,
} from '@/lib/types';
import { Button, Chip, colors, ErrorMessage, Field, Loading, StatusBadge, styles } from '@/components/ui';

// The ways the front desk takes money in person
const DESK_METHODS = [PaymentMethod.Cash, PaymentMethod.CreditCard, PaymentMethod.DebitCard, PaymentMethod.BankTransfer];

async function loadReservation(id: number) {
  const [reservation, payments] = await Promise.all([api.reservation(id), api.payments(id)]);
  return { reservation, payments };
}

export default function ReservationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canManage } = useAuth();
  const { data, setData, error, loading, refresh } = useApi(() => loadReservation(Number(id)), id);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorMessage message={error ?? 'Not found'} onRetry={refresh} />;
  const { reservation: r, payments } = data;

  const run = async (action: () => Promise<Reservation>) => {
    setBusy(true);
    try {
      setData({ ...data, reservation: await action() });
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const confirmCheckOut = () => {
    if (r.remainingAmount <= 0) return run(() => api.checkOut(r.id));
    Alert.alert('Balance still open', `${formatMoney(r.remainingAmount)} hasn't been paid yet. Check out anyway?`, [
      { text: 'Take payment first', style: 'cancel', onPress: () => setPaying(true) },
      { text: 'Check out', onPress: () => run(() => api.checkOut(r.id)) },
    ]);
  };

  const confirmNoShow = () =>
    Alert.alert('Mark as no-show?', "The guest didn't arrive. The room is released.", [
      { text: 'Keep', style: 'cancel' },
      { text: 'Mark no-show', style: 'destructive', onPress: () => run(() => api.noShow(r.id)) },
    ]);

  const confirmCancel = () =>
    Alert.alert('Cancel reservation?', 'The guest will lose this booking.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: () => run(() => api.cancel(r.id, 'Cancelled from mobile app')) },
    ]);

  // A confirmed guest who hasn't turned up by the check-in date
  const canNoShow = r.status === ReservationStatus.Confirmed && new Date(r.checkInDate) <= new Date();
  const canPay = canManage && r.remainingAmount > 0 && r.status !== ReservationStatus.Cancelled;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.rowTop}>
            <Text style={[styles.title, { fontSize: 20 }]}>{r.guestName ?? `Booking #${r.id}`}</Text>
            <StatusBadge status={r.status} />
          </View>
          <Text style={styles.muted}>{formatStay(r)}</Text>
          <Text style={styles.muted}>
            {r.hotelName} · Room {r.roomNumber}
          </Text>
        </View>

        {canManage && (
          <View style={{ gap: 10 }}>
            {r.status === ReservationStatus.Pending && (
              <Button title="Confirm" onPress={() => run(() => api.confirm(r.id))} disabled={busy} />
            )}
            {r.canCheckIn && <Button title="Check in" onPress={() => run(() => api.checkIn(r.id))} disabled={busy} />}
            {r.canCheckOut && <Button title="Check out" onPress={confirmCheckOut} disabled={busy} />}
          </View>
        )}

        <Text style={styles.sectionTitle}>Payments</Text>
        <View style={styles.card}>
          <Field label="Total" value={formatMoney(r.totalAmount)} />
          <Field label="Paid" value={formatMoney(r.depositAmount)} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={styles.muted}>Remaining</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: r.remainingAmount > 0 ? colors.danger : colors.success }}>
              {r.remainingAmount > 0 ? formatMoney(r.remainingAmount) : 'Paid in full'}
            </Text>
          </View>

          {payments.length > 0 && (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 6, paddingTop: 6 }}>
              {payments.map((p) => (
                <PaymentLine key={p.id} payment={p} />
              ))}
            </View>
          )}

          {canPay && !paying && (
            <Button small title="Record payment" onPress={() => setPaying(true)} style={{ marginTop: 8 }} />
          )}
          {canPay && paying && (
            <PaymentForm
              reservation={r}
              onCancel={() => setPaying(false)}
              onSaved={async () => {
                setPaying(false);
                await refresh();
              }}
            />
          )}
        </View>

        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.card}>
          <Field label="Guests" value={r.numberOfGuests} />
          <Field label="Booking #" value={r.id} />
          <Field label="Special requests" value={r.specialRequests} />
          <Field label="Notes" value={r.notes} />
        </View>

        {(canNoShow && canManage) || r.canCancel ? (
          <View style={{ gap: 10, marginTop: 6 }}>
            {canNoShow && canManage && (
              <Button title="Mark no-show" variant="secondary" onPress={confirmNoShow} disabled={busy} />
            )}
            {r.canCancel && <Button title="Cancel reservation" variant="danger" onPress={confirmCancel} disabled={busy} />}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PaymentLine({ payment: p }: { payment: Payment }) {
  const refund = p.type === PaymentTransactionType.Refund;
  const method = p.method !== null && p.method !== undefined ? PaymentMethodLabels[p.method] : null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}>
      <View style={{ flexShrink: 1 }}>
        <Text style={{ fontSize: 15, color: colors.text }}>{refund ? 'Refund' : (method ?? 'Payment')}</Text>
        <Text style={[styles.muted, { fontSize: 12 }]}>
          {[formatServerTime(p.createdAt), p.reference, p.createdByName].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={{ fontSize: 15, color: refund ? colors.danger : colors.text }}>
        {refund ? '−' : ''}
        {formatMoney(p.amount)}
      </Text>
    </View>
  );
}

function PaymentForm({
  reservation,
  onCancel,
  onSaved,
}: {
  reservation: Reservation;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(reservation.remainingAmount.toFixed(2));
  const [method, setMethod] = useState(PaymentMethod.Cash);
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);

  // Accept a decimal comma too, as phone keyboards in many regions type one
  const value = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(value) && value > 0 && value <= reservation.remainingAmount;

  const save = async () => {
    setSaving(true);
    try {
      await api.recordPayment(reservation.id, value, method, reference.trim() || undefined);
      onSaved();
    } catch (e) {
      Alert.alert('Could not record the payment', e instanceof Error ? e.message : 'Something went wrong');
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 10 }}>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="Amount"
        placeholderTextColor={colors.muted}
        selectTextOnFocus
      />
      {!valid && amount !== '' && (
        <Text style={[styles.error, { textAlign: 'left', fontSize: 13 }]}>
          Enter an amount up to {formatMoney(reservation.remainingAmount)}
        </Text>
      )}
      <View style={styles.chips}>
        {DESK_METHODS.map((m) => (
          <Chip key={m} label={PaymentMethodLabels[m]} selected={method === m} onPress={() => setMethod(m)} />
        ))}
      </View>
      <TextInput
        style={styles.input}
        value={reference}
        onChangeText={setReference}
        placeholder="Reference (optional), e.g. receipt #"
        placeholderTextColor={colors.muted}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button small title={saving ? 'Saving…' : `Record ${valid ? formatMoney(value) : ''}`} onPress={save} disabled={!valid || saving} />
        <Button small title="Cancel" variant="secondary" onPress={onCancel} disabled={saving} />
      </View>
    </View>
  );
}
