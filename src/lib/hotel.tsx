import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { api } from './api';
import { useAuth } from './auth';
import { storage } from './storage';
import type { Hotel } from './types';
import { useApi } from './useApi';

interface HotelContextValue {
  /** The hotels a staff member works at (empty for guests) */
  hotels: Hotel[];
  /** The one the staff screens show; remembered per user */
  hotel: Hotel | null;
  selectHotel: (id: number) => void;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

const HotelContext = createContext<HotelContextValue | null>(null);

const selectedKey = (userId: string) => `hotel-mgmt-hotel-${userId}`;

export function HotelProvider({ children }: { children: ReactNode }) {
  const { user, isStaff } = useAuth();
  const userId = isStaff && user ? user.id : null;

  const { data, error, loading, refresh } = useApi(async () => {
    if (!userId) return null;
    const [hotels, saved] = await Promise.all([api.hotels(), storage.get(selectedKey(userId))]);
    return { hotels, savedId: Number(saved) || null };
  }, userId ?? '');

  // A choice made in this session, tied to the user it was made by
  const [picked, setPicked] = useState<{ userId: string; hotelId: number } | null>(null);

  const selectHotel = useCallback(
    (hotelId: number) => {
      if (!userId) return;
      setPicked({ userId, hotelId });
      void storage.set(selectedKey(userId), String(hotelId));
    },
    [userId]
  );

  const value = useMemo<HotelContextValue>(() => {
    const hotels = data?.hotels ?? [];
    const pickedId = picked?.userId === userId ? picked.hotelId : null;
    const hotel =
      hotels.find((h) => h.id === pickedId) ?? hotels.find((h) => h.id === data?.savedId) ?? hotels[0] ?? null;
    return { hotels, hotel, selectHotel, loading: !!userId && loading, error, reload: refresh };
  }, [data, picked, userId, loading, error, refresh, selectHotel]);

  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
}

export function useHotel(): HotelContextValue {
  const context = useContext(HotelContext);
  if (!context) throw new Error('useHotel must be used inside HotelProvider');
  return context;
}
