import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HousekeepingSchedule, HousekeepingTask } from '@/lib/types';
import { roomKeys } from '@/features/rooms/hooks';
import { housekeepingApi } from './api';

export const housekeepingKeys = {
  all: ['housekeeping'] as const,
  day: (hotelId: number, date: string) => ['housekeeping', hotelId, date] as const,
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
