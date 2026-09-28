import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Room, RoomStatus } from '@/lib/types';
import { roomsApi } from './api';

export const roomKeys = {
  all: ['rooms'] as const,
  hotel: (hotelId: number) => ['rooms', hotelId] as const,
};

export function useRooms(hotelId: number) {
  return useQuery({ queryKey: roomKeys.hotel(hotelId), queryFn: () => roomsApi.forHotel(hotelId) });
}

/**
 * Changes a room's status. The board shows the new status at once and goes back if the API
 * refuses. 'cleaned' marks it cleaned: Available, and the cleaning time is recorded.
 */
export function useUpdateRoomStatus(hotelId: number) {
  const queryClient = useQueryClient();
  const key = roomKeys.hotel(hotelId);
  return useMutation({
    mutationFn: ({ room, status }: { room: Room; status: RoomStatus | 'cleaned' }) =>
      status === 'cleaned' ? roomsApi.markCleaned(room.id) : roomsApi.setStatus(room.id, status),
    onMutate: async ({ room, status }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Room[]>(key);
      const newStatus = status === 'cleaned' ? RoomStatus.Available : status;
      queryClient.setQueryData<Room[]>(key, (rooms) =>
        rooms?.map((r) => (r.id === room.id ? { ...r, status: newStatus } : r))
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
