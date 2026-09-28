import { Tabs } from 'expo-router/tabs';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, SectionList, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  HotelLine,
  Icon,
  SectionHeader,
  SegmentedControl,
  SkeletonList,
  Text,
  useScreenStyles,
  useToast,
  WithHotel,
} from '@/components';
import { useGenerateDailyTasks, useSchedule, useTaskAction } from '@/features/housekeeping/hooks';
import { useAuth } from '@/lib/auth';
import { addDays, dayLabel, formatServerTime, toDateParam } from '@/lib/format';
import { errorText } from '@/lib/http';
import { usePullToRefresh, useRefreshOnFocus } from '@/lib/query';
import {
  Hotel,
  HousekeepingTask,
  HousekeepingTaskPriority,
  HousekeepingTaskStatus,
  HousekeepingTaskTypeLabels,
} from '@/lib/types';
import { radius, space, useTheme, type ToneName } from '@/theme';

const SECTIONS = [
  { key: 'progress', title: 'In progress', statuses: [HousekeepingTaskStatus.InProgress] },
  { key: 'todo', title: 'To do', statuses: [HousekeepingTaskStatus.Pending, HousekeepingTaskStatus.NeedsInspection] },
  { key: 'done', title: 'Done', statuses: [HousekeepingTaskStatus.Completed] },
];

export default function HousekeepingScreen() {
  return <WithHotel>{(hotel) => <HousekeepingBoard hotel={hotel} />}</WithHotel>;
}

function HousekeepingBoard({ hotel }: { hotel: Hotel }) {
  const { user, canManage } = useAuth();
  const screen = useScreenStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const [dayOffset, setDayOffset] = useState(0);
  // Housekeepers start on their own tasks, managers on the whole hotel
  const [scope, setScope] = useState<'mine' | 'all'>(canManage ? 'all' : 'mine');

  const day = addDays(new Date(), dayOffset);
  const date = toDateParam(day);
  const schedule = useSchedule(hotel.id, date);
  const taskAction = useTaskAction(hotel.id, date);
  const generate = useGenerateDailyTasks(hotel.id, date);
  const pull = usePullToRefresh(schedule.refetch);
  useRefreshOnFocus(schedule.refetch);

  const { data, error, isPending, isPlaceholderData } = schedule;
  // "My tasks" includes unassigned ones, which anyone on shift can pick up
  const tasks = (data?.tasks ?? []).filter(
    (t) =>
      t.status !== HousekeepingTaskStatus.Cancelled &&
      (scope === 'all' || !t.assignedToUserId || t.assignedToUserId === user?.id)
  );
  const sections = SECTIONS.map((s) => ({ ...s, data: tasks.filter((t) => s.statuses.includes(t.status)) }));
  const [inProgress, toDo, done] = sections.map((s) => s.data.length);

  const act = (task: HousekeepingTask, action: 'start' | 'complete') =>
    taskAction.mutate(
      { task, action },
      {
        onSuccess: () => toast.show(action === 'start' ? `Room ${task.roomNumber} started` : `Room ${task.roomNumber} done`),
        onError: (e) => Alert.alert('Could not update the task', errorText(e)),
      }
    );

  const createTasks = () =>
    Alert.alert(
      'Create cleaning tasks?',
      `${dayLabel(day)}: adds a cleaning task for every room with a departure. Rooms that already have a task are skipped.`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Create tasks',
          onPress: () =>
            generate.mutate(undefined, {
              onSuccess: () => toast.show('Cleaning tasks created'),
              onError: (e) => Alert.alert('Could not create tasks', errorText(e)),
            }),
        },
      ]
    );

  return (
    <>
      <Tabs.Screen
        options={{
          headerRight: canManage
            ? () => (
                <Pressable
                  onPress={createTasks}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Create cleaning tasks for departures"
                  style={({ pressed }) => ({
                    marginRight: space.lg,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.xs,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Icon ios="plus.circle.fill" android="add_circle" size={20} color={colors.primary} />
                  <Text variant="callout" weight="600" color="primary">
                    Tasks
                  </Text>
                </Pressable>
              )
            : undefined,
        }}
      />
      {isPending ? (
        <SkeletonList />
      ) : error && !data ? (
        <ErrorState message={errorText(error)} onRetry={() => void schedule.refetch()} />
      ) : (
        <SectionList
          style={[screen.screen, isPlaceholderData && { opacity: 0.5 }]}
          sections={tasks.length > 0 ? sections : []}
          keyExtractor={(task) => String(task.id)}
          contentContainerStyle={screen.content}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl {...pull} tintColor={colors.primary} colors={[colors.primary]} />}
          ListHeaderComponent={
            <View style={{ gap: space.md }}>
              <HotelLine />
              <DayPicker day={day} onChange={(delta) => setDayOffset((offset) => offset + delta)} />
              <SegmentedControl
                options={[
                  { value: 'mine', label: 'My tasks' },
                  { value: 'all', label: 'All tasks' },
                ]}
                value={scope}
                onChange={setScope}
              />
              {tasks.length > 0 && (
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Stat label="To do" value={toDo} tone="warning" />
                  <Stat label="In progress" value={inProgress} tone="info" />
                  <Stat label="Done" value={done} tone="success" />
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              fill={false}
              icon={{ ios: 'sparkles', android: 'cleaning_services' }}
              title={scope === 'mine' && (data?.tasks.length ?? 0) > 0 ? 'Nothing assigned to you' : 'No tasks for this day'}
              message={
                scope === 'mine' && (data?.tasks.length ?? 0) > 0
                  ? 'Switch to “All tasks” to see the rest of the hotel.'
                  : canManage
                    ? 'Create cleaning tasks for every room with a departure.'
                    : undefined
              }
              action={
                canManage && (data?.tasks.length ?? 0) === 0 ? { title: 'Create tasks', onPress: createTasks } : undefined
              }
            />
          }
          renderSectionHeader={({ section }) =>
            section.data.length > 0 ? <SectionHeader title={section.title} count={section.data.length} /> : null
          }
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              busy={taskAction.isPending && taskAction.variables?.task.id === item.id}
              disabled={taskAction.isPending}
              onStart={() => act(item, 'start')}
              onComplete={() => act(item, 'complete')}
            />
          )}
        />
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: ToneName }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.tones[tone].bg, borderRadius: radius.md, padding: space.md }}>
      <Text variant="title" style={{ color: colors.tones[tone].fg }}>
        {value}
      </Text>
      <Text variant="caption" style={{ color: colors.tones[tone].fg }}>
        {label}
      </Text>
    </View>
  );
}

function DayPicker({ day, onChange }: { day: Date; onChange: (delta: number) => void }) {
  const { colors } = useTheme();
  const label = dayLabel(day);
  const date = day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const arrow = (delta: number) => (
    <Pressable
      onPress={() => onChange(delta)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={delta < 0 ? 'Previous day' : 'Next day'}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
      })}
    >
      <Icon
        ios={delta < 0 ? 'chevron.left' : 'chevron.right'}
        android={delta < 0 ? 'chevron_left' : 'chevron_right'}
        size={20}
        color={colors.primary}
      />
    </Pressable>
  );
  return (
    <Card padded={false} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.xs }}>
      {arrow(-1)}
      <Text variant="headline">{label.includes(' ') ? label : `${label} · ${date}`}</Text>
      {arrow(1)}
    </Card>
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
  const { colors } = useTheme();
  const urgent = task.priority === HousekeepingTaskPriority.Urgent;
  const high = task.priority === HousekeepingTaskPriority.High;
  const completed = task.status === HousekeepingTaskStatus.Completed;
  const pending = task.status === HousekeepingTaskStatus.Pending;

  let progress: string | null = null;
  if (task.status === HousekeepingTaskStatus.InProgress && task.startedAt) {
    progress = `Started ${formatServerTime(task.startedAt)}`;
  } else if (completed && task.completedAt) {
    progress = `Done ${formatServerTime(task.completedAt)}${task.durationMinutes ? ` · took ${task.durationMinutes} min` : ''}`;
  } else if (task.status === HousekeepingTaskStatus.NeedsInspection) {
    progress = 'Needs inspection';
  }

  return (
    <Card style={[{ gap: space.sm }, completed && { opacity: 0.65 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="headline" weight="700">
            {task.roomNumber}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm }}>
            <Text variant="headline" style={{ flexShrink: 1 }}>
              {HousekeepingTaskTypeLabels[task.type]}
            </Text>
            {(urgent || high) && <Badge label={urgent ? 'Urgent' : 'High'} tone={urgent ? 'danger' : 'warning'} />}
            {completed && <Icon ios="checkmark.circle.fill" android="check_circle" size={22} color={colors.tones.success.fg} />}
          </View>
          <Text variant="callout" color="muted">
            {task.assignedToName ?? 'Unassigned'}
            {progress ? ` · ${progress}` : ''}
          </Text>
        </View>
      </View>
      {task.notes && (
        <Text variant="callout" style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, padding: space.sm }}>
          {task.notes}
        </Text>
      )}
      {!completed && (
        <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
          {pending && (
            <Button
              size="sm"
              title="Start"
              icon={{ ios: 'play.fill', android: 'play_arrow' }}
              onPress={onStart}
              loading={busy}
              disabled={disabled}
            />
          )}
          <Button
            size="sm"
            title="Mark done"
            icon={{ ios: 'checkmark', android: 'check' }}
            variant={pending ? 'secondary' : 'primary'}
            onPress={onComplete}
            loading={busy && !pending}
            disabled={disabled}
          />
        </View>
      )}
    </Card>
  );
}
