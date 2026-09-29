import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './api';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  today: (hotelId: number) => ['dashboard', 'today', hotelId] as const,
  trend: (hotelId: number, days: number) => ['dashboard', 'trend', hotelId, days] as const,
};

export function useTodayDashboard(hotelId: number) {
  return useQuery({ queryKey: dashboardKeys.today(hotelId), queryFn: () => dashboardApi.today(hotelId) });
}

export function useTrend(hotelId: number, days = 7) {
  return useQuery({ queryKey: dashboardKeys.trend(hotelId, days), queryFn: () => dashboardApi.trend(hotelId, days) });
}
