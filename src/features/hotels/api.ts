import { request } from '@/lib/http';
import type { Hotel } from '@/lib/types';

export const hotelsApi = {
  // Guests get every hotel; staff get only the hotels they work at
  list: () => request<Hotel[]>('GET', '/Hotels/public'),
};
