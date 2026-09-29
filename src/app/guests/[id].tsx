import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, RefreshControl, ScrollView, Switch, View } from 'react-native';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  SectionHeader,
  SkeletonList,
  Text,
  useScreenStyles,
  useToast,
} from '@/components';
import { GuestFlags, GuestIntelCard } from '@/features/guests/components';
import { useGuest, useGuestReservations, useSetVip } from '@/features/guests/hooks';
import { ReservationCard } from '@/features/reservations/components';
import { errorText } from '@/lib/http';
import { usePullToRefresh } from '@/lib/query';
import { space, useTheme } from '@/theme';

export default function GuestScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const guest = useGuest(id);
  const bookings = useGuestReservations(id);
  const setVip = useSetVip(id);
  const pull = usePullToRefresh(() => Promise.all([guest.refetch(), bookings.refetch()]));

  if (guest.isPending) return <SkeletonList count={2} header={false} />;
  if (!guest.data) return <ErrorState message={errorText(guest.error)} onRetry={() => void guest.refetch()} />;
  const g = guest.data;
  const name = `${g.firstName} ${g.lastName}`;
  const stays = [...(bookings.data ?? [])].sort((a, b) => b.checkInDate.localeCompare(a.checkInDate));

  return (
    <ScrollView
      style={screen.screen}
      contentContainerStyle={screen.content}
      refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <Stack.Screen options={{ title: name }} />
      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar name={name} size={56} />
          <View style={{ flex: 1, gap: space.xs }}>
            <Text variant="title">{name}</Text>
            <GuestFlags guest={g} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          {!!g.phoneNumber && (
            <Button
              size="sm"
              variant="secondary"
              title="Call"
              icon={{ ios: 'phone', android: 'call' }}
              onPress={() => void Linking.openURL(`tel:${g.phoneNumber.replace(/[^\d+]/g, '')}`)}
            />
          )}
          {!!g.email && (
            <Button
              size="sm"
              variant="secondary"
              title="Email"
              icon={{ ios: 'envelope', android: 'mail' }}
              onPress={() => void Linking.openURL(`mailto:${g.email}`)}
            />
          )}
        </View>
        <Text variant="callout" color="muted">
          {[g.phoneNumber, g.email, g.nationality].filter(Boolean).join(' · ')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text variant="body" weight="500">
              VIP
            </Text>
            <Text variant="caption" color="subtle">
              Shown to the desk at every check-in
            </Text>
          </View>
          <Switch
            value={g.isVIP}
            disabled={setVip.isPending}
            onValueChange={(value) =>
              setVip.mutate(value, {
                onSuccess: () => toast.show(value ? `${g.firstName} is now a VIP` : 'VIP removed'),
                onError: (e) => Alert.alert('Could not change VIP', errorText(e)),
              })
            }
            trackColor={{ true: colors.tones.violet.fg, false: colors.border }}
            accessibilityLabel="VIP guest"
          />
        </View>
      </Card>

      <GuestIntelCard guestId={id} />

      <SectionHeader title="Bookings" count={stays.length || undefined} />
      {bookings.isPending ? (
        <SkeletonList header={false} count={2} />
      ) : stays.length === 0 ? (
        <EmptyState fill={false} icon={{ ios: 'calendar', android: 'calendar_month' }} title="No bookings yet" />
      ) : (
        stays.map((r) => (
          <ReservationCard key={r.id} reservation={r} perspective="guest" onPress={() => router.push(`/reservations/${r.id}`)} />
        ))
      )}
    </ScrollView>
  );
}
