import { hotelDay } from '@/lib/format';
import { request } from '@/lib/http';
import type { DailyTrend, TodayDashboard } from '@/lib/types';

export const dashboardApi = {
  today: (hotelId: number) => {
    const { date, utcOffsetMinutes } = hotelDay();
    return request<TodayDashboard>(
      'GET',
      `/Dashboard/today?hotelId=${hotelId}&date=${date}&utcOffsetMinutes=${utcOffsetMinutes}`
    );
  },
  trend: (hotelId: number, days: number) => {
    const { date, utcOffsetMinutes } = hotelDay();
    return request<DailyTrend[]>(
      'GET',
      `/Dashboard/trend?hotelId=${hotelId}&date=${date}&days=${days}&utcOffsetMinutes=${utcOffsetMinutes}`
    );
  },
};
