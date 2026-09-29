import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { guestKeys } from '@/features/guests/hooks';
import { invalidateDesk, reservationKeys } from '@/features/reservations/hooks';
import { walkInApi, type QuickCheckIn } from './api';

export const walkInKeys = {
  tonight: (hotelId: number) => ['walk-in', 'tonight', hotelId] as const,
};

export function useRoomsTonight(hotelId: number) {
  return useQuery({
    queryKey: walkInKeys.tonight(hotelId),
    queryFn: () => walkInApi.roomsTonight(hotelId),
    // Rooms fill up; always ask again when the flow opens
    staleTime: 0,
  });
}

export function useQuickCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (walkIn: QuickCheckIn) => walkInApi.checkIn(walkIn),
    onSuccess: (reservation) => {
      queryClient.setQueryData(reservationKeys.detail(reservation.id), reservation);
      invalidateDesk(queryClient);
      void queryClient.invalidateQueries({ queryKey: guestKeys.all });
    },
  });
}
