import { request } from '@/lib/http';
import type {
  HousekeepingSchedule,
  HousekeepingTask,
  HousekeepingTaskPriority,
  HousekeepingTaskType,
  StaffMember,
} from '@/lib/types';

export interface NewTask {
  roomId: number;
  type: HousekeepingTaskType;
  priority: HousekeepingTaskPriority;
  /** Hotel wall-clock time, YYYY-MM-DDTHH:mm:ss */
  scheduledFor: string;
  assignedToUserId?: string | null;
  notes?: string;
}

export const housekeepingApi = {
  /** `date` is a local calendar day, YYYY-MM-DD */
  schedule: (hotelId: number, date: string) =>
    request<HousekeepingSchedule>('GET', `/Housekeeping/hotel/${hotelId}/schedule?date=${date}`),
  start: (id: number) => request<HousekeepingTask>('POST', `/Housekeeping/${id}/start`),
  complete: (id: number) => request<HousekeepingTask>('POST', `/Housekeeping/${id}/complete`),
  // Creates a cleaning task for every room with a departure that day (rooms that have one are skipped)
  generateDaily: (hotelId: number, date: string) =>
    request<unknown>('POST', `/Housekeeping/hotel/${hotelId}/generate-daily?date=${date}`),
  create: (task: NewTask) => request<HousekeepingTask>('POST', '/Housekeeping', task),
  /** An empty string unassigns the task */
  assign: (id: number, userId: string) => request<HousekeepingTask>('PUT', `/Housekeeping/${id}`, { assignedToUserId: userId }),
  staff: (hotelId: number) => request<StaffMember[]>('GET', `/Hotels/${hotelId}/staff`),
};
