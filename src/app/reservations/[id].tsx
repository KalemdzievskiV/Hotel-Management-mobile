import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/useApi';
import { formatMoney, formatStay } from '@/lib/format';
import { Reservation, ReservationStatus } from '@/lib/types';
import { Button, ErrorMessage, Loading, StatusBadge, styles } from '@/components/ui';

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={{ fontSize: 15, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

export default function ReservationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isStaff } = useAuth();
  const { data: r, setData, error, loading, refresh } = useApi(() => api.reservation(Number(id)), id);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;
  if (error || !r) return <ErrorMessage message={error ?? 'Not found'} onRetry={refresh} />;

  const run = async (action: () => Promise<Reservation>) => {
    setBusy(true);
    try {
      setData(await action());
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = () =>
    Alert.alert('Cancel reservation?', 'The guest will lose this booking.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: () => run(() => api.cancel(r.id, 'Cancelled from mobile app')) },
    ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.list}>
      <View style={styles.card}>
        <View style={styles.rowTop}>
          <Text style={[styles.title, { fontSize: 20 }]}>{r.guestName ?? `Booking #${r.id}`}</Text>
          <StatusBadge status={r.status} />
        </View>
        <Text style={styles.muted}>{formatStay(r)}</Text>
      </View>

      <View style={styles.card}>
        <Field label="Hotel" value={r.hotelName} />
        <Field label="Room" value={r.roomNumber} />
        <Field label="Guests" value={r.numberOfGuests} />
        <Field label="Booking #" value={r.id} />
      </View>

      <View style={styles.card}>
        <Field label="Total" value={formatMoney(r.totalAmount)} />
        <Field label="Paid" value={formatMoney(r.depositAmount)} />
        <Field label="Remaining" value={formatMoney(r.remainingAmount)} />
      </View>

      {(r.specialRequests || r.notes) && (
        <View style={styles.card}>
          <Field label="Special requests" value={r.specialRequests} />
          <Field label="Notes" value={r.notes} />
        </View>
      )}

      {isStaff && (
        <View style={{ gap: 10, marginTop: 6 }}>
          {r.status === ReservationStatus.Pending && (
            <Button title="Confirm" onPress={() => run(() => api.confirm(r.id))} disabled={busy} />
          )}
          {r.canCheckIn && <Button title="Check in" onPress={() => run(() => api.checkIn(r.id))} disabled={busy} />}
          {r.canCheckOut && (
            <Button title="Check out" onPress={() => run(() => api.checkOut(r.id))} disabled={busy} />
          )}
          {r.canCancel && <Button title="Cancel reservation" variant="danger" onPress={confirmCancel} disabled={busy} />}
        </View>
      )}
    </ScrollView>
  );
}
