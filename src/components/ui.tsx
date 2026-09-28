import { SymbolView, SymbolViewProps } from 'expo-symbols';
import {
  ActivityIndicator,
  ColorValue,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Reservation, ReservationStatusColors, ReservationStatusLabels } from '@/lib/types';
import { formatStay } from '@/lib/format';

export const colors = {
  bg: '#f5f5f4',
  card: '#ffffff',
  text: '#1c1917',
  muted: '#78716c',
  border: '#e7e5e4',
  primary: '#1d4ed8',
  danger: '#b91c1c',
  success: '#15803d',
};

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.error}>{message}</Text>
      {onRetry && <Button title="Try again" onPress={onRetry} variant="secondary" />}
    </View>
  );
}

/** A centered note for screens with nothing to show, e.g. a housekeeper not yet assigned to a hotel */
export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <View style={styles.center}>
      <Text style={[styles.title, { textAlign: 'center' }]}>{title}</Text>
      {message && <Text style={[styles.muted, { textAlign: 'center' }]}>{message}</Text>}
    </View>
  );
}

export function Button({
  title,
  onPress,
  disabled,
  variant = 'primary',
  small,
  style,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  /** Compact and only as wide as its label, for buttons inside cards */
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        small && styles.buttonSmall,
        (pressed || disabled) && { opacity: 0.6 },
        style,
      ]}
    >
      <Text
        style={[styles.buttonText, small && { fontSize: 14 }, variant === 'secondary' && { color: colors.text }]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/** Selectable pill for filters and pickers */
export function Chip({
  label,
  selected,
  onPress,
  color = colors.primary,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: color, borderColor: color },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: Reservation['status'] }) {
  return <Badge label={ReservationStatusLabels[status]} color={ReservationStatusColors[status]} />;
}

/** SF Symbol on iOS, Material Symbol on Android and web */
export function Icon({
  ios,
  android,
  size = 24,
  color = colors.text,
}: {
  ios: Extract<SymbolViewProps['name'], string>;
  android: NonNullable<Exclude<SymbolViewProps['name'], string>['android']>;
  size?: number;
  color?: ColorValue;
}) {
  return <SymbolView name={{ ios, android, web: android }} size={size} tintColor={color} />;
}

/** Label on the left, value on the right; renders nothing without a value */
export function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4 }}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={{ fontSize: 15, color: colors.text, flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

export function ReservationRow({ reservation, onPress }: { reservation: Reservation; onPress: () => void }) {
  const r = reservation;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
      <View style={styles.rowTop}>
        <Text style={styles.title} numberOfLines={1}>
          {r.guestName ?? `Booking #${r.id}`}
        </Text>
        <StatusBadge status={r.status} />
      </View>
      <Text style={styles.muted}>
        {r.hotelName} · Room {r.roomNumber}
      </Text>
      <Text style={styles.muted}>{formatStay(r)}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: colors.bg },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: 4,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, flexShrink: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', marginTop: 8 },
  muted: { color: colors.muted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 15, textAlign: 'center' },
  empty: { color: colors.muted, fontSize: 14, fontStyle: 'italic' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  buttonSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  buttonDanger: { backgroundColor: colors.danger },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 14, color: colors.text, fontWeight: '500' },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
});
