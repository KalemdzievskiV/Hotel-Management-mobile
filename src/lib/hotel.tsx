import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useHotels } from '@/features/hotels/hooks';
import { errorText } from './http';
import { useAuth } from './auth';
import { storage } from './storage';
import type { Hotel } from './types';

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
  const { data, error, isPending, refetch } = useHotels(!!userId);

  // The saved choice, and one made in this session; both tied to the user they belong to
  const [saved, setSaved] = useState<{ userId: string; hotelId: number | null } | null>(null);
  const [picked, setPicked] = useState<{ userId: string; hotelId: number } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let current = true;
    storage
      .get(selectedKey(userId))
      .then((value) => current && setSaved({ userId, hotelId: Number(value) || null }))
      .catch(() => current && setSaved({ userId, hotelId: null }));
    return () => {
      current = false;
    };
  }, [userId]);

  const selectHotel = useCallback(
    (hotelId: number) => {
      if (!userId) return;
      setPicked({ userId, hotelId });
      void storage.set(selectedKey(userId), String(hotelId));
    },
    [userId]
  );

  const savedLoaded = saved?.userId === userId;
  const value = useMemo<HotelContextValue>(() => {
    const hotels = userId ? (data ?? []) : [];
    const pickedId = picked?.userId === userId ? picked.hotelId : null;
    const savedId = savedLoaded ? saved?.hotelId : null;
    const hotel =
      hotels.find((h) => h.id === pickedId) ?? hotels.find((h) => h.id === savedId) ?? hotels[0] ?? null;
    return {
      hotels,
      hotel,
      selectHotel,
      loading: !!userId && ((isPending && !data) || !savedLoaded),
      // With hotels already on screen (e.g. from the saved cache), a failed refresh isn't shown
      error: userId && error && !data ? errorText(error) : null,
      reload: () => void refetch(),
    };
  }, [data, error, isPending, picked, saved, savedLoaded, userId, selectHotel, refetch]);

  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
}

export function useHotel(): HotelContextValue {
  const context = useContext(HotelContext);
  if (!context) throw new Error('useHotel must be used inside HotelProvider');
  return context;
}
