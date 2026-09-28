import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { api } from '@/lib/api';
import { formatServerTime } from '@/lib/format';
import { useApi, useRefreshOnFocus } from '@/lib/useApi';
import { Hotel, Room, RoomStatus, RoomStatusColors, RoomStatusLabels, RoomType } from '@/lib/types';
import { ActionSheet, SheetAction } from '@/components/ActionSheet';
import { HotelLine, WithHotel } from '@/components/WithHotel';
import { Chip, colors, ErrorMessage, Loading, styles } from '@/components/ui';

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
const COLUMNS = 3;
const GAP = 8;

export default function RoomsScreen() {
  return <WithHotel>{(hotel) => <RoomBoard hotel={hotel} />}</WithHotel>;
}

function RoomBoard({ hotel }: { hotel: Hotel }) {
  const { data, error, loading, refreshing, refresh } = useApi(() => api.rooms(hotel.id), String(hotel.id));
  useRefreshOnFocus(refresh);
  const [filter, setFilter] = useState<RoomStatus | null>(null);
  const [selected, setSelected] = useState<Room | null>(null);
  const [busy, setBusy] = useState(false);
  const { width } = useWindowDimensions();

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refresh} />;

  const rooms = (data ?? []).filter((room) => room.isActive);
  const counts = new Map<RoomStatus, number>();
  for (const room of rooms) counts.set(room.status, (counts.get(room.status) ?? 0) + 1);

  const shown = rooms
    .filter((room) => filter === null || room.status === filter)
    .sort((a, b) => a.floor - b.floor || a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
  const floors = [...new Set(shown.map((room) => room.floor))];
  const tileWidth = (width - 32 - GAP * (COLUMNS - 1)) / COLUMNS;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      await refresh();
    } catch (e) {
      Alert.alert('Could not update the room', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing || busy} onRefresh={refresh} />}
      >
        <HotelLine />
        <View style={styles.chips}>
          <Chip label={`All ${rooms.length}`} selected={filter === null} onPress={() => setFilter(null)} />
          {STATUS_ORDER.filter((status) => counts.has(status) || status === filter).map((status) => (
            <Chip
              key={status}
              label={`${RoomStatusLabels[status]} ${counts.get(status) ?? 0}`}
              selected={filter === status}
              color={RoomStatusColors[status]}
              onPress={() => setFilter(filter === status ? null : status)}
            />
          ))}
        </View>

        {rooms.length === 0 && <Text style={styles.empty}>This hotel has no rooms yet</Text>}
        {rooms.length > 0 && shown.length === 0 && <Text style={styles.empty}>No rooms with this status</Text>}

        {floors.map((floor) => (
          <View key={floor} style={{ gap: GAP }}>
            <Text style={styles.sectionTitle}>{floor === 0 ? 'Ground floor' : `Floor ${floor}`}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
              {shown
                .filter((room) => room.floor === floor)
                .map((room) => (
                  <RoomTile key={room.id} room={room} width={tileWidth} onPress={() => setSelected(room)} />
                ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {selected && (
        <ActionSheet
          visible
          title={`Room ${selected.roomNumber}`}
          message={roomSummary(selected)}
          actions={roomActions(selected, run)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function RoomTile({ room, width, onPress }: { room: Room; width: number; onPress: () => void }) {
  const color = RoomStatusColors[room.status];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width, borderLeftWidth: 4, borderLeftColor: color, paddingVertical: 10, paddingHorizontal: 10 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>{room.roomNumber}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color }} numberOfLines={1}>
        {RoomStatusLabels[room.status]}
      </Text>
      <Text style={[styles.muted, { fontSize: 12 }]} numberOfLines={1}>
        {RoomType[room.type]}
      </Text>
    </Pressable>
  );
}

function roomSummary(room: Room): string {
  const parts = [`${RoomType[room.type]} · ${RoomStatusLabels[room.status]}`];
  if (room.lastCleaned) parts.push(`Last cleaned ${formatServerTime(room.lastCleaned)}`);
  if (room.status === RoomStatus.Occupied || room.status === RoomStatus.Reserved) {
    parts.push('Occupied and reserved follow the bookings; check guests in and out from Reservations.');
  }
  return parts.join('\n');
}

function roomActions(room: Room, run: (action: () => Promise<unknown>) => void): SheetAction[] {
  const actions: SheetAction[] = [];
  // Also records the cleaning time, which setting "Available" by hand doesn't
  if (room.status === RoomStatus.Cleaning) {
    actions.push({ label: 'Mark as cleaned', onPress: () => run(() => api.markRoomCleaned(room.id)) });
  }
  for (const status of MANUAL_STATUSES) {
    if (status === room.status || (status === RoomStatus.Available && room.status === RoomStatus.Cleaning)) continue;
    actions.push({
      label: status === RoomStatus.Available ? 'Set available' : `Set to “${RoomStatusLabels[status]}”`,
      onPress: () => run(() => api.setRoomStatus(room.id, status)),
      destructive: status === RoomStatus.OutOfService,
    });
  }
  return actions;
}
