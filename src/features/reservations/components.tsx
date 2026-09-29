import { useState } from 'react';
import { View } from 'react-native';
import { Avatar, Badge, Button, Card, Chip, Icon, Sheet, Text, TextField } from '@/components';
import { formatMoney, formatServerTime, formatStay } from '@/lib/format';
import { Reservation, ReservationStatus, ReservationStatusLabels, ReservationStatusTones } from '@/lib/types';
import { radius, space, useTheme, type ToneName } from '@/theme';
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

interface Step {
  label: string;
  /** When it happened; missing for steps still to come */
  at?: string | null;
  detail?: string | null;
  state: 'done' | 'current' | 'upcoming' | 'stopped';
  tone?: ToneName;
}

/** The steps a booking goes through, from the guest's side */
function steps(r: Reservation): Step[] {
  const requested: Step = { label: 'Requested', at: r.createdAt, state: 'done' };
  const confirmed = (state: Step['state']): Step => ({
    label: 'Confirmed by the hotel',
    at: r.confirmedAt,
    detail: state === 'current' ? 'Waiting for the hotel to confirm' : null,
    state,
  });
  switch (r.status) {
    case ReservationStatus.Pending:
      return [requested, confirmed('current'), { label: 'Checked in', state: 'upcoming' }, { label: 'Checked out', state: 'upcoming' }];
    case ReservationStatus.Confirmed:
      return [requested, confirmed('done'), { label: 'Checked in', state: 'current', detail: 'At the front desk when you arrive' }, { label: 'Checked out', state: 'upcoming' }];
    case ReservationStatus.CheckedIn:
      return [requested, confirmed('done'), { label: 'Checked in', at: r.checkedInAt, state: 'done' }, { label: 'Checked out', state: 'current' }];
    case ReservationStatus.CheckedOut:
      return [requested, confirmed('done'), { label: 'Checked in', at: r.checkedInAt, state: 'done' }, { label: 'Checked out', at: r.checkedOutAt, state: 'done' }];
    case ReservationStatus.Cancelled:
      return [requested, { label: 'Cancelled', at: r.cancelledAt, detail: r.cancellationReason, state: 'stopped', tone: 'danger' }];
    case ReservationStatus.NoShow:
      return [requested, confirmed('done'), { label: 'Marked as no-show', detail: "The hotel recorded that you didn't arrive", state: 'stopped', tone: 'rose' }];
  }
}

/** Requested → Confirmed → Checked in → Checked out, with when each happened */
export function StatusTimeline({ reservation }: { reservation: Reservation }) {
  const { colors } = useTheme();
  const list = steps(reservation);
  return (
    <View accessibilityRole="list">
      {list.map((step, index) => {
        const last = index === list.length - 1;
        const color =
          step.state === 'stopped'
            ? colors.tones[step.tone ?? 'danger'].fg
            : step.state === 'done'
              ? colors.tones.success.fg
              : step.state === 'current'
                ? colors.primary
                : colors.border;
        return (
          <View
            key={step.label}
            style={{ flexDirection: 'row', gap: space.md }}
            accessible
            accessibilityLabel={[step.label, step.state === 'upcoming' ? 'not yet' : null, step.detail].filter(Boolean).join(', ')}
          >
            <View style={{ alignItems: 'center', width: 20 }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: radius.pill,
                  borderWidth: 2,
                  borderColor: color,
                  backgroundColor: step.state === 'done' || step.state === 'stopped' ? color : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {step.state === 'done' && <Icon ios="checkmark" android="check" size={12} color={colors.surface} />}
                {step.state === 'stopped' && <Icon ios="xmark" android="close" size={12} color={colors.surface} />}
                {step.state === 'current' && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                )}
              </View>
              {!last && (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 18,
                    backgroundColor: step.state === 'done' ? colors.tones.success.fg : colors.border,
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1, paddingBottom: last ? 0 : space.md }}>
              <Text variant="body" weight={step.state === 'upcoming' ? '400' : '600'} color={step.state === 'upcoming' ? 'subtle' : 'text'}>
                {step.label}
              </Text>
              {(step.at || step.detail) && (
                <Text variant="caption" color="muted">
                  {[step.at ? formatServerTime(step.at) : null, step.detail].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const CANCEL_REASONS = ['Plans changed', 'Found another place', 'Booked by mistake', 'Other'];

/** A guest cancels: pick a reason (the hotel sees it), then confirm */
export function CancelSheet({
  visible,
  busy,
  onClose,
  onCancel,
}: {
  visible: boolean;
  busy: boolean;
  onClose: () => void;
  onCancel: (reason: string) => void;
}) {
  const [choice, setChoice] = useState(CANCEL_REASONS[0]!);
  const [details, setDetails] = useState('');
  const reason = [choice === 'Other' ? null : choice, details.trim() || null].filter(Boolean).join(': ');
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Cancel this booking?"
      message="The room is released and the hotel is told why. This can't be undone."
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {CANCEL_REASONS.map((r) => (
          <Chip key={r} label={r} selected={choice === r} onPress={() => setChoice(r)} tone="danger" />
        ))}
      </View>
      <TextField
        placeholder={choice === 'Other' ? 'Tell the hotel why' : 'Anything to add? (optional)'}
        value={details}
        onChangeText={setDetails}
        maxLength={400}
      />
      <Button
        title="Cancel booking"
        variant="danger"
        loading={busy}
        disabled={reason === ''}
        onPress={() => onCancel(reason || choice)}
      />
      <Button title="Keep booking" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}
