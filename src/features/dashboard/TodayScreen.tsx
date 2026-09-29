import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import {
  Button,
  Card,
  ErrorState,
  HotelLine,
  Icon,
  KpiCard,
  SectionHeader,
  Skeleton,
  Text,
  useScreenStyles,
} from '@/components';
import type { AndroidSymbol, IosSymbol } from '@/components/Icon';
import { formatMoney, formatWholeMoney } from '@/lib/format';
import { errorText } from '@/lib/http';
import { usePullToRefresh, useRefreshOnFocus } from '@/lib/query';
import { RoomStatusLabels, RoomStatusTones, type AttentionItem, type AttentionKind, type Hotel } from '@/lib/types';
import { makeStyles, radius, space, useTheme, type ToneName } from '@/theme';
import { useTodayDashboard } from './hooks';

const ATTENTION: Record<AttentionKind, { label: string; tone: ToneName; icon: { ios: IosSymbol; android: AndroidSymbol } }> = {
  overdueArrival: { label: "Didn't arrive", tone: 'rose', icon: { ios: 'clock.badge.exclamationmark', android: 'schedule' } },
  unpaidDeparture: { label: 'Leaving, still owes', tone: 'warning', icon: { ios: 'creditcard', android: 'payments' } },
  roomNotReady: { label: 'Room not ready', tone: 'danger', icon: { ios: 'bed.double', android: 'bed' } },
  pendingApproval: { label: 'Waiting for approval', tone: 'info', icon: { ios: 'hourglass', android: 'hourglass_top' } },
};

/** The front desk's home: how today is going and what needs doing */
export function TodayScreen({ hotel }: { hotel: Hotel }) {
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const { data, error, isPending, refetch } = useTodayDashboard(hotel.id);
  const pull = usePullToRefresh(refetch);
  useRefreshOnFocus(refetch);

  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ScrollView
      style={screen.screen}
      contentContainerStyle={screen.content}
      refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      <View style={{ gap: 2 }}>
        <HotelLine />
        <Text variant="title">{today}</Text>
      </View>

      {isPending ? (
        <TodaySkeleton />
      ) : error && !data ? (
        <ErrorState message={errorText(error)} onRetry={() => void refetch()} />
      ) : (
        data && (
          <>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <KpiCard
                label="Occupancy"
                value={`${Math.round(data.occupancyPercent)}%`}
                detail={`${data.occupiedRooms} of ${data.totalRooms} rooms`}
                progress={data.totalRooms ? data.occupiedRooms / data.totalRooms : 0}
                icon={{ ios: 'bed.double.fill', android: 'bed' }}
                onPress={() => router.navigate('/rooms')}
              />
              <KpiCard
                label="Taken today"
                value={formatWholeMoney(data.revenueToday)}
                detail="Payments less refunds"
                tone="success"
                icon={{ ios: 'banknote', android: 'payments' }}
                onPress={() => router.push('/reports')}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <KpiCard
                label="Arrivals"
                value={String(data.arrivals)}
                detail={data.arrivals ? `${data.arrivalsCheckedIn} checked in` : 'None today'}
                progress={data.arrivals ? data.arrivalsCheckedIn / data.arrivals : undefined}
                tone="info"
                onPress={() => router.navigate({ pathname: '/bookings', params: { segment: 'arrivals' } })}
              />
              <KpiCard
                label="Departures"
                value={String(data.departures)}
                detail={data.departures ? `${data.departuresCheckedOut} checked out` : 'None today'}
                progress={data.departures ? data.departuresCheckedOut / data.departures : undefined}
                tone="violet"
                onPress={() => router.navigate({ pathname: '/bookings', params: { segment: 'departures' } })}
              />
              <KpiCard
                label="In-house"
                value={String(data.inHouse)}
                detail="Staying now"
                tone="neutral"
                onPress={() => router.navigate({ pathname: '/bookings', params: { segment: 'inhouse' } })}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <QuickAction title="Walk-in" icon={{ ios: 'figure.walk', android: 'directions_walk' }} onPress={() => router.push('/walk-in')} />
              <QuickAction
                title="New booking"
                icon={{ ios: 'calendar.badge.plus', android: 'event' }}
                onPress={() => router.push('/reservations/new')}
              />
              <QuickAction
                title={data.openHousekeepingTasks ? `Tasks · ${data.openHousekeepingTasks}` : 'Tasks'}
                icon={{ ios: 'sparkles', android: 'cleaning_services' }}
                onPress={() => router.push('/tasks')}
              />
            </View>

            <SectionHeader title="Needs attention" count={data.attention.length || undefined} />
            {data.attention.length === 0 ? (
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <Icon ios="checkmark.seal.fill" android="verified" size={24} color={colors.tones.success.fg} />
                <View style={{ flex: 1 }}>
                  <Text variant="headline">All clear</Text>
                  <Text variant="callout" color="muted">
                    Nothing waiting on the desk right now.
                  </Text>
                </View>
              </Card>
            ) : (
              <AttentionList items={data.attention} />
            )}

            {data.roomsByStatus.length > 0 && (
              <>
                <SectionHeader title="Rooms" />
                <Pressable
                  onPress={() => router.navigate('/rooms')}
                  accessibilityRole="button"
                  accessibilityLabel="Open the room board"
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}
                >
                  {data.roomsByStatus.map(({ status, count }) => (
                    <View
                      key={status}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: space.xs,
                        paddingHorizontal: space.md,
                        paddingVertical: 6,
                        borderRadius: radius.pill,
                        backgroundColor: colors.tones[RoomStatusTones[status]].bg,
                      }}
                    >
                      <Text variant="callout" weight="700" style={{ color: colors.tones[RoomStatusTones[status]].fg }}>
                        {count}
                      </Text>
                      <Text variant="callout" style={{ color: colors.tones[RoomStatusTones[status]].fg }}>
                        {RoomStatusLabels[status]}
                      </Text>
                    </View>
                  ))}
                </Pressable>
              </>
            )}
          </>
        )
      )}
    </ScrollView>
  );
}

function QuickAction({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: { ios: IosSymbol; android: AndroidSymbol };
  onPress: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.quick, pressed && { opacity: 0.75 }]}
    >
      <Icon ios={icon.ios} android={icon.android} size={22} color={colors.primary} />
      <Text variant="caption" weight="600" numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

// The first few; the rest behind "Show all" so the tiles below stay in reach
const ATTENTION_PREVIEW = 5;

function AttentionList({ items }: { items: AttentionItem[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, ATTENTION_PREVIEW);
  return (
    <Card padded={false}>
      {shown.map((item, index) => (
        <AttentionRow key={`${item.kind}-${item.reservationId}-${index}`} item={item} first={index === 0} />
      ))}
      {items.length > ATTENTION_PREVIEW && (
        <Button
          title={all ? 'Show fewer' : `Show all ${items.length}`}
          variant="ghost"
          size="sm"
          onPress={() => setAll((a) => !a)}
          style={{ alignSelf: 'center', marginVertical: space.xs }}
        />
      )}
    </Card>
  );
}

function AttentionRow({ item, first }: { item: AttentionItem; first: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const kind = ATTENTION[item.kind];
  const tone = colors.tones[kind.tone];
  return (
    <Pressable
      disabled={!item.reservationId}
      onPress={() => item.reservationId && router.push(`/reservations/${item.reservationId}`)}
      accessibilityRole="button"
      accessibilityLabel={`${kind.label}: ${item.title}, ${item.detail}`}
      style={({ pressed }) => [styles.row, !first && styles.divider, pressed && { backgroundColor: colors.surfaceAlt }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: tone.bg }]}>
        <Icon ios={kind.icon.ios} android={kind.icon.android} size={18} color={tone.fg} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="caption" weight="600" style={{ color: tone.fg }}>
          {kind.label}
        </Text>
        <Text variant="body" weight="600" numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={2}>
          {item.detail}
        </Text>
      </View>
      {item.amount ? (
        <Text variant="headline" color="warning">
          {formatMoney(item.amount)}
        </Text>
      ) : (
        <Icon ios="chevron.right" android="chevron_right" size={16} color={colors.textSubtle} />
      )}
    </Pressable>
  );
}

function TodaySkeleton() {
  return (
    <View style={{ gap: space.md }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {[0, 1].map((row) => (
        <View key={row} style={{ flexDirection: 'row', gap: space.md }}>
          {[0, 1].map((i) => (
            <Card key={i} style={{ flex: 1, gap: space.sm, minHeight: 112 }}>
              <Skeleton width="50%" />
              <Skeleton width="40%" height={28} />
              <Skeleton width="70%" />
            </Card>
          ))}
        </View>
      ))}
      <Skeleton height={64} round={radius.lg} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  quick: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, paddingHorizontal: space.lg },
  divider: { borderTopWidth: 1, borderTopColor: t.colors.border },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
}));
