import { request } from '@/lib/http';
import type { HousekeepingSchedule, HousekeepingTask } from '@/lib/types';

export const housekeepingApi = {
  /** `date` is a local calendar day, YYYY-MM-DD */
  schedule: (hotelId: number, date: string) =>
    request<HousekeepingSchedule>('GET', `/Housekeeping/hotel/${hotelId}/schedule?date=${date}`),
  start: (id: number) => request<HousekeepingTask>('POST', `/Housekeeping/${id}/start`),
  complete: (id: number) => request<HousekeepingTask>('POST', `/Housekeeping/${id}/complete`),
  // Creates a cleaning task for every room with a departure that day (rooms that have one are skipped)
  generateDaily: (hotelId: number, date: string) =>
    request<unknown>('POST', `/Housekeeping/hotel/${hotelId}/generate-daily?date=${date}`),
};
