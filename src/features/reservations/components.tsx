import { View } from 'react-native';
import { Avatar, Badge, Card, Icon, Text } from '@/components';
import { formatMoney, formatStay } from '@/lib/format';
import { Reservation, ReservationStatus, ReservationStatusLabels, ReservationStatusTones } from '@/lib/types';
import { space, useTheme } from '@/theme';
import { OPEN_STATUSES } from './hooks';

export function StatusBadge({ status }: { status: ReservationStatus }) {
  return <Badge label={ReservationStatusLabels[status]} tone={ReservationStatusTones[status]} dot />;
}

/**
 * One booking in a list. The front desk sees the guest first; a guest sees the hotel first.
 */
export function ReservationCard({
  reservation: r,
  perspective,
  onPress,
}: {
  reservation: Reservation;
  perspective: 'desk' | 'guest';
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const title = perspective === 'desk' ? (r.guestName ?? `Booking #${r.id}`) : (r.hotelName ?? `Booking #${r.id}`);
  const subtitle = perspective === 'desk' ? `Room ${r.roomNumber}` : `Room ${r.roomNumber} · ${r.numberOfGuests} guest${r.numberOfGuests === 1 ? '' : 's'}`;
  const owes = perspective === 'desk' && r.remainingAmount > 0 && OPEN_STATUSES.includes(r.status);

  return (
    <Card onPress={onPress} accessibilityLabel={`${title}, ${ReservationStatusLabels[r.status]}, ${formatStay(r)}`}>
      <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
        {perspective === 'desk' && <Avatar name={r.guestName ?? ''} />}
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm }}>
            <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
              {title}
            </Text>
            <StatusBadge status={r.status} />
          </View>
          <Text variant="callout" color="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginTop: space.sm }}>
        <Icon ios="calendar" android="calendar_month" size={15} color={colors.textSubtle} />
        <Text variant="callout" color="muted" style={{ flex: 1 }} numberOfLines={2}>
          {formatStay(r)}
        </Text>
        {owes && <Badge label={`Due ${formatMoney(r.remainingAmount)}`} tone="warning" />}
      </View>
    </Card>
  );
}
