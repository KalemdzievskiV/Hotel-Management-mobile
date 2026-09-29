import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HousekeepingSchedule, HousekeepingTask } from '@/lib/types';
import { roomKeys } from '@/features/rooms/hooks';
import { dashboardKeys } from '@/features/dashboard/hooks';
import { housekeepingApi, type NewTask } from './api';

export const housekeepingKeys = {
  all: ['housekeeping'] as const,
  day: (hotelId: number, date: string) => ['housekeeping', hotelId, date] as const,
  staff: (hotelId: number) => ['housekeeping', 'staff', hotelId] as const,
};

export function useSchedule(hotelId: number, date: string) {
  return useQuery({
    queryKey: housekeepingKeys.day(hotelId, date),
    queryFn: () => housekeepingApi.schedule(hotelId, date),
    // Paging through days keeps the last day on screen (dimmed) until the next one arrives
    placeholderData: keepPreviousData,
  });
}

/** Start or finish a task; finishing one can make its room available, so the board reloads too */
export function useTaskAction(hotelId: number, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, action }: { task: HousekeepingTask; action: 'start' | 'complete' }) =>
      action === 'start' ? housekeepingApi.start(task.id) : housekeepingApi.complete(task.id),
    onSuccess: (updated) => {
      queryClient.setQueryData<HousekeepingSchedule>(housekeepingKeys.day(hotelId, date), (schedule) =>
        schedule ? { ...schedule, tasks: schedule.tasks.map((t) => (t.id === updated.id ? updated : t)) } : schedule
      );
      void queryClient.invalidateQueries({ queryKey: roomKeys.hotel(hotelId) });
    },
  });
}

export function useGenerateDailyTasks(hotelId: number, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => housekeepingApi.generateDaily(hotelId, date),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: housekeepingKeys.day(hotelId, date) }),
  });
}

/** People a task can be given to: the hotel's housekeepers first, then everyone else on staff */
export function useStaff(hotelId: number, enabled = true) {
  return useQuery({
    queryKey: housekeepingKeys.staff(hotelId),
    queryFn: async () => {
      const staff = await housekeepingApi.staff(hotelId);
      const active = staff.filter((s) => s.isActive !== false);
      const rank = (roles: string[]) => (roles.includes('Housekeeper') ? 0 : 1);
      return active.sort((a, b) => rank(a.roles) - rank(b.roles) || a.fullName.localeCompare(b.fullName));
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useCreateTask(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: NewTask) => housekeepingApi.create(task),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: housekeepingKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.today(hotelId) });
    },
  });
}

/** Give a task to someone ("" to nobody); the list shows the change at once */
export function useAssignTask(hotelId: number, date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: number; userId: string }) => housekeepingApi.assign(taskId, userId),
    onSuccess: (updated) =>
      queryClient.setQueryData<HousekeepingSchedule>(housekeepingKeys.day(hotelId, date), (schedule) =>
        schedule ? { ...schedule, tasks: schedule.tasks.map((t) => (t.id === updated.id ? updated : t)) } : schedule
      ),
  });
}
