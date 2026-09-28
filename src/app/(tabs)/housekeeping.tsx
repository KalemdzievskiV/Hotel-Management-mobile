import { Tabs } from 'expo-router/tabs';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, SectionList, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { addDays, dayLabel, formatServerTime, toDateParam } from '@/lib/format';
import { useApi, useRefreshOnFocus } from '@/lib/useApi';
import {
  Hotel,
  HousekeepingTask,
  HousekeepingTaskPriority,
  HousekeepingTaskStatus,
  HousekeepingTaskTypeLabels,
} from '@/lib/types';
import { HotelLine, WithHotel } from '@/components/WithHotel';
import { Badge, Button, Chip, colors, ErrorMessage, Loading, styles } from '@/components/ui';

const SECTIONS = [
  { title: 'In progress', statuses: [HousekeepingTaskStatus.InProgress] },
  { title: 'To do', statuses: [HousekeepingTaskStatus.Pending, HousekeepingTaskStatus.NeedsInspection] },
  { title: 'Done', statuses: [HousekeepingTaskStatus.Completed] },
];

export default function HousekeepingScreen() {
  return <WithHotel>{(hotel) => <HousekeepingBoard hotel={hotel} />}</WithHotel>;
}

function HousekeepingBoard({ hotel }: { hotel: Hotel }) {
  const { user, canManage } = useAuth();
  const [dayOffset, setDayOffset] = useState(0);
  // Housekeepers start on their own tasks, managers on the whole hotel
  const [scope, setScope] = useState<'mine' | 'all'>(canManage ? 'all' : 'mine');
  const [busyId, setBusyId] = useState<number | null>(null);

  const day = addDays(new Date(), dayOffset);
  const date = toDateParam(day);
  const { data, setData, error, loading, refreshing, refresh } = useApi(
    () => api.housekeepingSchedule(hotel.id, date),
    `${hotel.id}:${date}`
  );
  useRefreshOnFocus(refresh);

  // "My tasks" includes unassigned ones, which anyone on shift can pick up
  const tasks = (data?.tasks ?? []).filter(
    (t) =>
      t.status !== HousekeepingTaskStatus.Cancelled &&
      (scope === 'all' || !t.assignedToUserId || t.assignedToUserId === user?.id)
  );
  const sections = SECTIONS.map((s) => ({ title: s.title, data: tasks.filter((t) => s.statuses.includes(t.status)) }));
  const [inProgress, toDo, done] = sections.map((s) => s.data.length);

  const update = async (task: HousekeepingTask, action: (id: number) => Promise<HousekeepingTask>) => {
    setBusyId(task.id);
    try {
      const updated = await action(task.id);
      if (data) setData({ ...data, tasks: data.tasks.map((t) => (t.id === updated.id ? updated : t)) });
    } catch (e) {
      Alert.alert('Could not update the task', e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusyId(null);
    }
  };

  const createTasks = () =>
    Alert.alert(
      'Create cleaning tasks?',
      `${dayLabel(day)}: adds a cleaning task for every room with a departure. Rooms that already have a task are skipped.`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Create tasks',
          onPress: async () => {
            try {
              await api.generateDailyTasks(hotel.id, date);
              refresh();
            } catch (e) {
              Alert.alert('Could not create tasks', e instanceof Error ? e.message : 'Something went wrong');
            }
          },
        },
      ]
    );

  return (
    <>
      <Tabs.Screen
        options={{
          headerRight: canManage
            ? () => (
                <Pressable onPress={createTasks} hitSlop={10} style={{ marginRight: 16 }}>
                  <Text style={{ color: colors.primary, fontSize: 16 }}>Create tasks</Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorMessage message={error} onRetry={refresh} />
      ) : (
        <SectionList
          style={styles.screen}
          sections={tasks.length > 0 ? sections : []}
          keyExtractor={(task) => String(task.id)}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListHeaderComponent={
            <View style={{ gap: 10 }}>
              <HotelLine />
              <DayPicker day={day} onChange={(delta) => setDayOffset((offset) => offset + delta)} />
              <View style={styles.chips}>
                <Chip label="My tasks" selected={scope === 'mine'} onPress={() => setScope('mine')} />
                <Chip label="All tasks" selected={scope === 'all'} onPress={() => setScope('all')} />
              </View>
              {tasks.length > 0 && (
                <Text style={styles.muted}>
                  {toDo} to do · {inProgress} in progress · {done} done
                </Text>
              )}
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {scope === 'mine' && (data?.tasks.length ?? 0) > 0
                ? 'Nothing assigned to you. See “All tasks”.'
                : canManage
                  ? 'No tasks for this day. “Create tasks” adds cleaning for rooms with departures.'
                  : 'No tasks for this day.'}
            </Text>
          }
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          renderSectionFooter={({ section }) =>
            section.data.length === 0 ? <Text style={styles.empty}>Nothing here</Text> : null
          }
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              busy={busyId === item.id}
              disabled={busyId !== null}
              onStart={() => update(item, api.startTask)}
              onComplete={() => update(item, api.completeTask)}
            />
          )}
        />
      )}
    </>
  );
}

function DayPicker({ day, onChange }: { day: Date; onChange: (delta: number) => void }) {
  const label = dayLabel(day);
  const date = day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return (
    <View style={[styles.card, styles.rowTop, { paddingVertical: 8 }]}>
      <Pressable onPress={() => onChange(-1)} hitSlop={12} style={{ paddingHorizontal: 12 }}>
        <Text style={{ fontSize: 22, color: colors.primary }}>‹</Text>
      </Pressable>
      <Text style={styles.title}>{label.includes(' ') ? label : `${label} · ${date}`}</Text>
      <Pressable onPress={() => onChange(1)} hitSlop={12} style={{ paddingHorizontal: 12 }}>
        <Text style={{ fontSize: 22, color: colors.primary }}>›</Text>
      </Pressable>
    </View>
  );
}

function TaskCard({
  task,
  busy,
  disabled,
  onStart,
  onComplete,
}: {
  task: HousekeepingTask;
  busy: boolean;
  disabled: boolean;
  onStart: () => void;
  onComplete: () => void;
}) {
  const urgent = task.priority === HousekeepingTaskPriority.Urgent;
  const high = task.priority === HousekeepingTaskPriority.High;

  let progress: string | null = null;
  if (task.status === HousekeepingTaskStatus.InProgress && task.startedAt) {
    progress = `Started ${formatServerTime(task.startedAt)}`;
  } else if (task.status === HousekeepingTaskStatus.Completed && task.completedAt) {
    progress = `Done ${formatServerTime(task.completedAt)}${task.durationMinutes ? ` · took ${task.durationMinutes} min` : ''}`;
  } else if (task.status === HousekeepingTaskStatus.NeedsInspection) {
    progress = 'Needs inspection';
  }

  return (
    <View style={[styles.card, task.status === HousekeepingTaskStatus.Completed && { opacity: 0.7 }]}>
      <View style={styles.rowTop}>
        <Text style={[styles.title, { fontSize: 18 }]}>Room {task.roomNumber}</Text>
        {(urgent || high) && <Badge label={urgent ? 'Urgent' : 'High priority'} color={urgent ? colors.danger : '#b45309'} />}
      </View>
      <Text style={styles.muted}>
        {HousekeepingTaskTypeLabels[task.type]} · {task.assignedToName ?? 'Unassigned'}
      </Text>
      {task.notes && <Text style={{ fontSize: 15, color: colors.text }}>{task.notes}</Text>}
      {progress && <Text style={styles.muted}>{progress}</Text>}

      {task.status !== HousekeepingTaskStatus.Completed && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          {task.status === HousekeepingTaskStatus.Pending && (
            <Button small title={busy ? 'Saving…' : 'Start'} onPress={onStart} disabled={disabled} />
          )}
          <Button
            small
            title={busy && task.status !== HousekeepingTaskStatus.Pending ? 'Saving…' : 'Mark done'}
            variant={task.status === HousekeepingTaskStatus.Pending ? 'secondary' : 'primary'}
            onPress={onComplete}
            disabled={disabled}
          />
        </View>
      )}
    </View>
  );
}
