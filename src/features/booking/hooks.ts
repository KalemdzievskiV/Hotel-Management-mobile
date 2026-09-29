import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { reservationKeys } from '@/features/reservations/hooks';
import type { Hotel } from '@/lib/types';
import { bookingApi, type NewBooking } from './api';
import { bookableRooms, searchProblem, stayWindow, type StaySearch } from './search';

export const bookingKeys = {
  all: ['availability'] as const,
  hotel: (hotelId: number, search: StaySearch) => {
    const { checkIn, checkOut } = stayWindow(search);
    return ['availability', hotelId, search.type, checkIn, checkOut, search.guests] as const;
  },
};

// Rooms fill up: availability is re-checked after a minute rather than the default 30 s cache,
// and the API checks again when booking anyway
const AVAILABILITY_STALE_MS = 60_000;

function availabilityQuery(hotelId: number, search: StaySearch) {
  const { checkIn, checkOut } = stayWindow(search);
  return {
    queryKey: bookingKeys.hotel(hotelId, search),
    queryFn: async () => {
      const result = await bookingApi.availableRooms(hotelId, search.type, checkIn, checkOut, search.guests);
      return bookableRooms(result.rooms, search);
    },
    staleTime: AVAILABILITY_STALE_MS,
    enabled: searchProblem(search) === null,
  };
}

/** The rooms of one hotel that can be booked for the search, cheapest first */
export function useAvailableRooms(hotelId: number, search: StaySearch) {
  return useQuery(availabilityQuery(hotelId, search));
}

/** Availability for every hotel in the list, one request each (fine for a handful of hotels) */
export function useHotelsAvailability(hotels: Hotel[], search: StaySearch) {
  return useQueries({ queries: hotels.map((hotel) => availabilityQuery(hotel.id, search)) });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (booking: NewBooking) => bookingApi.create(booking),
    onSuccess: (reservation) => {
      queryClient.setQueryData(reservationKeys.detail(reservation.id), reservation);
      void queryClient.invalidateQueries({ queryKey: reservationKeys.mine });
      // The room is taken now
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}
