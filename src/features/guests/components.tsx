import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Avatar, Badge, Button, Card, Icon, Skeleton, Text, TextField } from '@/components';
import { nameError } from '@/features/auth/api';
import { formatMoney, parseServerTime } from '@/lib/format';
import type { Guest } from '@/lib/types';
import { useDebounced } from '@/lib/useDebounced';
import { makeStyles, radius, space, useTheme } from '@/theme';
import type { NewGuest } from './api';
import { useGuestIntelligence, useGuestSearch } from './hooks';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Who a booking is for: someone the hotel knows, or a new guest to create with it */
export type GuestChoice = { kind: 'existing'; guest: Guest } | { kind: 'new'; guest: NewGuest };

export function guestChoiceName(choice: GuestChoice): string {
  return `${choice.guest.firstName} ${choice.guest.lastName}`.trim();
}

/** Guest badges: VIP and blacklisted */
export function GuestFlags({ guest }: { guest: Pick<Guest, 'isVIP' | 'isBlacklisted'> }) {
  if (!guest.isVIP && !guest.isBlacklisted) return null;
  return (
    <View style={{ flexDirection: 'row', gap: space.xs }}>
      {guest.isVIP && <Badge label="VIP" tone="violet" />}
      {guest.isBlacklisted && <Badge label="Blacklisted" tone="danger" />}
    </View>
  );
}

export function GuestRow({ guest, onPress, first }: { guest: Guest; onPress: () => void; first?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const name = `${guest.firstName} ${guest.lastName}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[name, guest.isVIP && 'VIP', guest.isBlacklisted && 'blacklisted', guest.phoneNumber].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <Avatar name={name} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text variant="body" weight="600" numberOfLines={1} style={{ flexShrink: 1 }}>
            {name}
          </Text>
          <GuestFlags guest={guest} />
        </View>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {[guest.phoneNumber, guest.email].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Icon ios="chevron.right" android="chevron_right" size={16} color={colors.textSubtle} />
    </Pressable>
  );
}

/**
 * Step one of a walk-in or a desk booking: find the guest by name, phone or email, or add a
 * new one with the four details the API needs.
 */
export function GuestPicker({ hotelId, onPick }: { hotelId: number; onPick: (choice: GuestChoice) => void }) {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const term = useDebounced(text);
  const results = useGuestSearch(hotelId, term);
  const searching = term.trim().length >= 2;

  if (adding) {
    return <NewGuestForm initialName={text} onCancel={() => setAdding(false)} onDone={(guest) => onPick({ kind: 'new', guest })} />;
  }

  const guests = (results.data ?? []).slice(0, searching ? 30 : 10);

  return (
    <View style={{ gap: space.md }}>
      <TextField
        icon={{ ios: 'magnifyingglass', android: 'search' }}
        placeholder="Name, phone or email"
        accessibilityLabel="Find a guest"
        value={text}
        onChangeText={setText}
        autoCorrect={false}
        autoFocus
        returnKeyType="search"
      />
      <Button
        title="New guest"
        variant="secondary"
        icon={{ ios: 'person.badge.plus', android: 'person_add' }}
        onPress={() => setAdding(true)}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Text variant="overline" color="muted">
          {searching ? 'Matching guests' : 'Recent guests'}
        </Text>
        {results.isFetching && <ActivityIndicator size="small" />}
      </View>
      {results.isPending ? (
        <Card style={{ gap: space.sm }}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" />
        </Card>
      ) : guests.length === 0 ? (
        <Text variant="callout" color="subtle">
          {searching ? `Nobody matches “${term.trim()}”. Add them as a new guest.` : 'No guests yet.'}
        </Text>
      ) : (
        <Card padded={false}>
          {guests.map((guest, index) => (
            <GuestRow key={guest.id} guest={guest} first={index === 0} onPress={() => onPick({ kind: 'existing', guest })} />
          ))}
        </Card>
      )}
    </View>
  );
}

function NewGuestForm({
  initialName,
  onCancel,
  onDone,
}: {
  initialName: string;
  onCancel: () => void;
  onDone: (guest: NewGuest) => void;
}) {
  // A typed "Ana Petrovska" becomes the first and last name
  const [first, ...rest] = initialName.trim().split(/\s+/);
  const [form, setForm] = useState({ firstName: first ?? '', lastName: rest.join(' '), email: '', phoneNumber: '' });
  const [tried, setTried] = useState(false);
  const set = (field: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  const errors = {
    firstName: nameError(form.firstName, 'First name'),
    lastName: nameError(form.lastName, 'Last name'),
    email: EMAIL_PATTERN.test(form.email.trim()) ? null : 'Enter an email address',
    phoneNumber: /^[\d\s\-+().]{5,}$/.test(form.phoneNumber.trim()) ? null : 'Enter a phone number',
  };
  const valid = Object.values(errors).every((e) => e === null);
  const shown = (field: keyof typeof errors) => (tried ? errors[field] : null);

  return (
    <View style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <TextField label="First name" value={form.firstName} onChangeText={set('firstName')} error={shown('firstName')} autoFocus />
        </View>
        <View style={{ flex: 1 }}>
          <TextField label="Last name" value={form.lastName} onChangeText={set('lastName')} error={shown('lastName')} />
        </View>
      </View>
      <TextField
        label="Phone"
        icon={{ ios: 'phone', android: 'call' }}
        keyboardType="phone-pad"
        value={form.phoneNumber}
        onChangeText={set('phoneNumber')}
        error={shown('phoneNumber')}
      />
      <TextField
        label="Email"
        icon={{ ios: 'envelope', android: 'mail' }}
        keyboardType="email-address"
        autoCapitalize="none"
        value={form.email}
        onChangeText={set('email')}
        error={shown('email')}
        helper="A returning guest with this email keeps their history"
      />
      <Button
        title="Continue"
        onPress={() => {
          setTried(true);
          if (valid)
            onDone({
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              email: form.email.trim(),
              phoneNumber: form.phoneNumber.trim(),
            });
        }}
      />
      <Button title="Back to search" variant="ghost" onPress={onCancel} />
    </View>
  );
}

/**
 * What the desk should know about a returning guest before checking them in: VIP, blacklist,
 * past stays, money owed, notes.
 */
export function GuestIntelCard({ guestId }: { guestId: number }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { data, isPending } = useGuestIntelligence(guestId);

  if (isPending) {
    return (
      <Card style={{ gap: space.sm }}>
        <Skeleton width="50%" height={16} />
        <Skeleton width="70%" />
      </Card>
    );
  }
  if (!data) return null;

  return (
    <View style={{ gap: space.sm }}>
      {data.isBlacklisted && (
        <View style={[styles.banner, { backgroundColor: colors.tones.danger.bg }]} accessibilityRole="alert">
          <Icon ios="hand.raised.fill" android="block" size={18} color={colors.tones.danger.fg} />
          <Text variant="callout" weight="600" color="danger" style={{ flex: 1 }}>
            {`Blacklisted${data.blacklistReason ? `: ${data.blacklistReason}` : ''}. They can't be booked.`}
          </Text>
        </View>
      )}
      {data.hasOutstandingPayments && (
        <View style={[styles.banner, { backgroundColor: colors.tones.warning.bg }]}>
          <Icon ios="exclamationmark.triangle" android="warning" size={18} color={colors.tones.warning.fg} />
          <Text variant="callout" color="warning" style={{ flex: 1 }}>
            Has an unpaid balance on another booking
          </Text>
        </View>
      )}
      <Card style={{ gap: space.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Text variant="headline" style={{ flex: 1 }}>
            {data.totalStays === 0 ? 'First stay here' : `${data.totalStays} past stay${data.totalStays === 1 ? '' : 's'}`}
          </Text>
          {data.isVIP && <Badge label="VIP" tone="violet" />}
        </View>
        {data.totalStays > 0 && (
          <Text variant="callout" color="muted">
            Spent {formatMoney(data.totalSpent)}
            {data.lastStayDate ? ` · last ${parseServerTime(data.lastStayDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}` : ''}
            {data.mostUsedRoomType ? ` · usually ${data.mostUsedRoomType}` : ''}
          </Text>
        )}
        {[data.preferences, data.specialRequests, data.notes].filter(Boolean).map((note) => (
          <Text key={note} variant="callout" style={styles.note}>
            {note}
          </Text>
        ))}
      </Card>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  divider: { borderTopWidth: 1, borderTopColor: t.colors.border },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, borderRadius: radius.md },
  note: { backgroundColor: t.colors.surfaceAlt, borderRadius: radius.sm, padding: space.sm, marginTop: space.xs },
}));
