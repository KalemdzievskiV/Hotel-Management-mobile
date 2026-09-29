import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Hotel } from '@/lib/types';
import { hotelsApi } from './api';

export const hotelKeys = {
  all: ['hotels'] as const,
  detail: (id: number) => ['hotels', 'detail', id] as const,
};

export function useHotels(enabled = true) {
  return useQuery({ queryKey: hotelKeys.all, queryFn: hotelsApi.list, enabled });
}

/** One hotel; shows the copy from the hotel list straight away while the full one loads */
export function useHotelDetail(id: number) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: hotelKeys.detail(id),
    queryFn: () => hotelsApi.get(id),
    placeholderData: () => queryClient.getQueryData<Hotel[]>(hotelKeys.all)?.find((h) => h.id === id),
  });
}

/** "WiFi, Parking" → ["WiFi", "Parking"] */
export function splitList(value?: string | null): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
