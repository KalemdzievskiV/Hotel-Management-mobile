import { useQuery } from '@tanstack/react-query';
import { hotelsApi } from './api';

export const hotelKeys = {
  all: ['hotels'] as const,
};

export function useHotels(enabled = true) {
  return useQuery({ queryKey: hotelKeys.all, queryFn: hotelsApi.list, enabled });
}
