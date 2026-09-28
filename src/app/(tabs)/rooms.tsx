import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native';
import {
  ActionSheet,
  Chip,
  EmptyState,
  ErrorState,
  HotelLine,
  SectionHeader,
  SkeletonList,
  Text,
  useScreenStyles,
  useToast,
  WithHotel,
  type SheetAction,
} from '@/components';
import { useRooms, useUpdateRoomStatus } from '@/features/rooms/hooks';
import { formatServerTime } from '@/lib/format';
import { errorText } from '@/lib/http';
import { usePullToRefresh, useRefreshOnFocus } from '@/lib/query';
import { Hotel, Room, RoomStatus, RoomStatusLabels, RoomStatusTones, RoomType } from '@/lib/types';
import { radius, space, useTheme } from '@/theme';

// What staff set by hand; Occupied and Reserved follow the room's bookings
const MANUAL_STATUSES = [RoomStatus.Cleaning, RoomStatus.Maintenance, RoomStatus.OutOfService, RoomStatus.Available];
const STATUS_ORDER = [
  RoomStatus.Cleaning,
  RoomStatus.Available,
  RoomStatus.Occupied,
  RoomStatus.Reserved,
  RoomStatus.Maintenance,
  RoomStatus.OutOfService,
];
const GAP = space.sm;

export default function RoomsScreen() {
  return <WithHotel>{(hotel) => <RoomBoard hotel={hotel} />}</WithHotel>;
}

function RoomBoard({ hotel }: { hotel: Hotel }) {
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const { data, error, isPending, refetch } = useRooms(hotel.id);
  const update = useUpdateRoomStatus(hotel.id);
  const pull = usePullToRefresh(refetch);
  useRefreshOnFocus(refetch);
  const [filter, setFilter] = useState<RoomStatus | null>(null);
  const [selected, setSelected] = useState<Room | null>(null);
  // Separate from `selected` so the sheet keeps its content while it slides away
  const [sheetOpen, setSheetOpen] = useState(false);
  const { width } = useWindowDimensions();

  if (isPending) return <SkeletonList />;
  if (error && !data) return <ErrorState message={errorText(error)} onRetry={() => void refetch()} />;

  const rooms = (data ?? []).filter((room) => room.isActive);
  if (rooms.length === 0) {
    return (
      <EmptyState
        icon={{ ios: 'bed.double', android: 'bed' }}
        title="No rooms yet"
        message="Add rooms to this hotel on the website."
      />
    );
  }

  const counts = new Map<RoomStatus, number>();
  for (const room of rooms) counts.set(room.status, (counts.get(room.status) ?? 0) + 1);

  const shown = rooms
    .filter((room) => filter === null || room.status === filter)
    .sort((a, b) => a.floor - b.floor || a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
  const floors = [...new Set(shown.map((room) => room.floor))];
  // Three tiles a row on phones, more on tablets
  const columns = Math.max(3, Math.floor((width - space.lg * 2) / 120));
  const tileWidth = (width - space.lg * 2 - GAP * (columns - 1)) / columns;

  const setStatus = (room: Room, status: RoomStatus | 'cleaned') =>
    update.mutate(
      { room, status },
      {
        onSuccess: () =>
          toast.show(
            status === 'cleaned' ? `Room ${room.roomNumber} is clean` : `Room ${room.roomNumber}: ${RoomStatusLabels[status]}`
          ),
        onError: (e) => Alert.alert('Could not update the room', errorText(e)),
      }
    );

  return (
    <>
      <ScrollView
        style={screen.screen}
        contentContainerStyle={screen.content}
        refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <HotelLine />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: space.sm }}
          style={{ marginHorizontal: -space.lg }}
        >
          <View style={{ width: space.lg - space.sm }} />
          <Chip label="All" count={rooms.length} selected={filter === null} onPress={() => setFilter(null)} />
          {STATUS_ORDER.filter((status) => counts.has(status) || status === filter).map((status) => (
            <Chip
              key={status}
              label={RoomStatusLabels[status]}
              count={counts.get(status) ?? 0}
              selected={filter === status}
              tone={RoomStatusTones[status]}
              onPress={() => setFilter(filter === status ? null : status)}
            />
          ))}
          <View style={{ width: space.lg - space.sm }} />
        </ScrollView>

        {shown.length === 0 && (
          <EmptyState fill={false} title="No rooms with this status" action={{ title: 'Show all', onPress: () => setFilter(null) }} />
        )}

        {floors.map((floor) => (
          <View key={floor} style={{ gap: GAP }}>
            <SectionHeader title={floor === 0 ? 'Ground floor' : `Floor ${floor}`} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
              {shown
                .filter((room) => room.floor === floor)
                .map((room) => (
                  <RoomTile
                    key={room.id}
                    room={room}
                    width={tileWidth}
                    onPress={() => {
                      setSelected(room);
                      setSheetOpen(true);
                    }}
                  />
                ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <ActionSheet
        visible={sheetOpen}
        title={selected ? `Room ${selected.roomNumber}` : ''}
        message={selected ? roomSummary(selected) : undefined}
        actions={selected ? roomActions(selected, setStatus) : []}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}

function RoomTile({ room, width, onPress }: { room: Room; width: number; onPress: () => void }) {
  const { colors } = useTheme();
  const tone = colors.tones[RoomStatusTones[room.status]];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Room ${room.roomNumber}, ${RoomStatusLabels[room.status]}`}
      style={({ pressed }) => ({
        width,
        padding: space.md,
        borderRadius: radius.md,
        backgroundColor: tone.bg,
        gap: 2,
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Text variant="title" style={{ color: colors.text }}>
        {room.roomNumber}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tone.fg }} />
        <Text variant="caption" weight="600" style={{ color: tone.fg, flexShrink: 1 }} numberOfLines={1}>
          {RoomStatusLabels[room.status]}
        </Text>
      </View>
      <Text variant="caption" color="muted" numberOfLines={1}>
        {RoomType[room.type]}
      </Text>
    </Pressable>
  );
}

function roomSummary(room: Room): string {
  const parts = [`${RoomType[room.type]} · ${RoomStatusLabels[room.status]}`];
  if (room.lastCleaned) parts.push(`Last cleaned ${formatServerTime(room.lastCleaned)}`);
  if (room.status === RoomStatus.Occupied || room.status === RoomStatus.Reserved) {
    parts.push('Occupied and reserved follow the bookings; check guests in and out from Bookings.');
  }
  return parts.join('\n');
}

function roomActions(room: Room, setStatus: (room: Room, status: RoomStatus | 'cleaned') => void): SheetAction[] {
  const actions: SheetAction[] = [];
  // Also records the cleaning time, which setting "Available" by hand doesn't
  if (room.status === RoomStatus.Cleaning) {
    actions.push({
      label: 'Mark as cleaned',
      icon: { ios: 'checkmark.circle', android: 'check_circle' },
      onPress: () => setStatus(room, 'cleaned'),
    });
  }
  const icons = {
    [RoomStatus.Cleaning]: { ios: 'sparkles', android: 'cleaning_services' },
    [RoomStatus.Maintenance]: { ios: 'wrench.and.screwdriver', android: 'build' },
    [RoomStatus.OutOfService]: { ios: 'nosign', android: 'block' },
    [RoomStatus.Available]: { ios: 'checkmark.circle', android: 'check_circle' },
  } as const;
  for (const status of MANUAL_STATUSES) {
    if (status === room.status || (status === RoomStatus.Available && room.status === RoomStatus.Cleaning)) continue;
    actions.push({
      label: status === RoomStatus.Available ? 'Set available' : `Set to “${RoomStatusLabels[status]}”`,
      icon: icons[status as keyof typeof icons],
      onPress: () => setStatus(room, status),
      destructive: status === RoomStatus.OutOfService,
    });
  }
  return actions;
}
