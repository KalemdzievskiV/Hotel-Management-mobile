import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { Avatar, Button, Chip, FormError, Sheet, Skeleton, Text, TextField, useToast } from '@/components';
import { useRooms } from '@/features/rooms/hooks';
import { addDays, toDateParam } from '@/lib/format';
import { errorText } from '@/lib/http';
import {
  HousekeepingTaskPriority,
  HousekeepingTaskPriorityLabels,
  HousekeepingTaskType,
  HousekeepingTaskTypeLabels,
  RoomStatus,
  type StaffMember,
} from '@/lib/types';
import { radius, space, useTheme } from '@/theme';
import { useCreateTask, useStaff } from './hooks';

const TYPES = [
  HousekeepingTaskType.CleanRoom,
  HousekeepingTaskType.ChangeLinen,
  HousekeepingTaskType.DeepClean,
  HousekeepingTaskType.TurnDown,
  HousekeepingTaskType.Inspection,
  HousekeepingTaskType.Maintenance,
];
const PRIORITIES = [
  HousekeepingTaskPriority.Low,
  HousekeepingTaskPriority.Normal,
  HousekeepingTaskPriority.High,
  HousekeepingTaskPriority.Urgent,
];

/** Now (today) or 09:00 (tomorrow), as a hotel wall-clock time */
function scheduleFor(day: 'today' | 'tomorrow'): string {
  const now = new Date();
  if (day === 'today') {
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${toDateParam(now)}T${hh}:${mm}:00`;
  }
  return `${toDateParam(addDays(now, 1))}T09:00:00`;
}

/**
 * A manager creates a housekeeping task: which room, what, how urgent, for whom and when.
 * `roomId` preselects a room (e.g. "Create cleaning task" after a checkout).
 */
export function NewTaskSheet({
  hotelId,
  visible,
  onClose,
  roomId,
  type = HousekeepingTaskType.CleanRoom,
}: {
  hotelId: number;
  visible: boolean;
  onClose: () => void;
  roomId?: number;
  type?: HousekeepingTaskType;
}) {
  return (
    <Sheet visible={visible} onClose={onClose} title="New housekeeping task">
      {visible && <NewTaskForm hotelId={hotelId} initialRoomId={roomId} initialType={type} onDone={onClose} />}
    </Sheet>
  );
}

function NewTaskForm({
  hotelId,
  initialRoomId,
  initialType,
  onDone,
}: {
  hotelId: number;
  initialRoomId?: number;
  initialType: HousekeepingTaskType;
  onDone: () => void;
}) {
  const { height } = useWindowDimensions();
  const toast = useToast();
  const rooms = useRooms(hotelId);
  const staff = useStaff(hotelId);
  const create = useCreateTask(hotelId);
  const [roomId, setRoomId] = useState<number | null>(initialRoomId ?? null);
  const [type, setType] = useState(initialType);
  const [priority, setPriority] = useState(HousekeepingTaskPriority.Normal);
  const [assignee, setAssignee] = useState<string>('');
  const [day, setDay] = useState<'today' | 'tomorrow'>('today');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Rooms waiting to be cleaned first: they're the usual reason for a task
  const roomList = (rooms.data ?? [])
    .filter((r) => r.isActive)
    .sort(
      (a, b) =>
        Number(b.status === RoomStatus.Cleaning) - Number(a.status === RoomStatus.Cleaning) ||
        a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })
    );
  const room = roomList.find((r) => r.id === roomId);

  const save = () => {
    if (!roomId) return;
    setError(null);
    create.mutate(
      {
        roomId,
        type,
        priority,
        scheduledFor: scheduleFor(day),
        assignedToUserId: assignee || null,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.show(`Task added for room ${room?.roomNumber ?? ''}`.trim());
          onDone();
        },
        onError: (e) => setError(errorText(e)),
      }
    );
  };

  return (
    <View style={{ gap: space.md }}>
      <ScrollView style={{ maxHeight: height * 0.6 }} contentContainerStyle={{ gap: space.lg }} keyboardShouldPersistTaps="handled">
        <Field label="Room">
          {rooms.isPending ? (
            <Skeleton height={36} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {roomList.map((r) => (
                <Chip
                  key={r.id}
                  label={r.roomNumber}
                  selected={r.id === roomId}
                  tone={r.status === RoomStatus.Cleaning ? 'warning' : 'primary'}
                  onPress={() => setRoomId(r.id)}
                />
              ))}
            </View>
          )}
        </Field>
        <Field label="Task">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {TYPES.map((t) => (
              <Chip key={t} label={HousekeepingTaskTypeLabels[t]} selected={t === type} onPress={() => setType(t)} />
            ))}
          </View>
        </Field>
        <Field label="Priority">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {PRIORITIES.map((p) => (
              <Chip
                key={p}
                label={HousekeepingTaskPriorityLabels[p]}
                selected={p === priority}
                tone={p === HousekeepingTaskPriority.Urgent ? 'danger' : p === HousekeepingTaskPriority.High ? 'warning' : 'primary'}
                onPress={() => setPriority(p)}
              />
            ))}
          </View>
        </Field>
        <Field label="When">
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Chip label="Now" selected={day === 'today'} onPress={() => setDay('today')} />
            <Chip label="Tomorrow morning" selected={day === 'tomorrow'} onPress={() => setDay('tomorrow')} />
          </View>
        </Field>
        <Field label="Who">
          <StaffChips staff={staff.data} loading={staff.isPending} value={assignee} onChange={setAssignee} />
        </Field>
        <TextField label="Notes (optional)" placeholder="e.g. extra towels, guest is allergic" value={notes} onChangeText={setNotes} />
      </ScrollView>
      <FormError message={error} />
      <Button
        title={room ? `Add task for room ${room.roomNumber}` : 'Pick a room'}
        onPress={save}
        disabled={!roomId}
        loading={create.isPending}
      />
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="callout" weight="500" color="muted">
        {label}
      </Text>
      {children}
    </View>
  );
}

/** "Anyone" plus each person on staff; `value` is a user id, "" for anyone */
function StaffChips({
  staff,
  loading,
  value,
  onChange,
}: {
  staff?: StaffMember[];
  loading: boolean;
  value: string;
  onChange: (userId: string) => void;
}) {
  if (loading) return <Skeleton height={36} />;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
      <Chip label="Anyone on shift" selected={value === ''} onPress={() => onChange('')} />
      {(staff ?? []).map((person) => (
        <Chip key={person.id} label={person.fullName} selected={value === person.id} onPress={() => onChange(person.id)} />
      ))}
    </View>
  );
}

/** Pick who does a task; the current person is marked */
export function AssignSheet({
  hotelId,
  visible,
  roomNumber,
  currentUserId,
  busy,
  onClose,
  onAssign,
}: {
  hotelId: number;
  visible: boolean;
  roomNumber?: string;
  currentUserId?: string | null;
  busy: boolean;
  onClose: () => void;
  onAssign: (userId: string) => void;
}) {
  const { colors } = useTheme();
  const staff = useStaff(hotelId, visible);
  const people: { id: string; name: string }[] = [
    { id: '', name: 'Nobody (anyone on shift)' },
    ...(staff.data ?? []).map((s) => ({ id: s.id, name: s.fullName })),
  ];
  return (
    <Sheet visible={visible} onClose={onClose} title={roomNumber ? `Room ${roomNumber}: who's on it?` : "Who's on it?"}>
      {staff.isPending ? (
        <Skeleton height={48} />
      ) : (
        <View style={{ gap: 2 }}>
          {people.map((person) => {
            const current = (currentUserId ?? '') === person.id;
            return (
              <Pressable
                key={person.id || 'nobody'}
                disabled={busy}
                onPress={() => onAssign(person.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: current }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  minHeight: 52,
                  paddingHorizontal: space.md,
                  borderRadius: radius.md,
                  backgroundColor: pressed || current ? colors.surfaceAlt : 'transparent',
                })}
              >
                <Avatar name={person.id ? person.name : '?'} size={32} />
                <Text variant="body" weight={current ? '700' : '500'} style={{ flex: 1 }}>
                  {person.name}
                </Text>
                {current && <Text variant="caption" color="primary">Current</Text>}
              </Pressable>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}
