import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { guestsApi } from './api';

export const guestKeys = {
  all: ['guests'] as const,
  hotel: (hotelId: number) => ['guests', 'hotel', hotelId] as const,
  search: (term: string) => ['guests', 'search', term] as const,
  detail: (id: number) => ['guests', 'detail', id] as const,
  intelligence: (id: number) => ['guests', 'detail', id, 'intelligence'] as const,
  reservations: (id: number) => ['guests', 'detail', id, 'reservations'] as const,
};

/** The hotel's guests, or the ones matching `term` once it's two characters or more */
export function useGuestSearch(hotelId: number, term: string) {
  const query = term.trim();
  const searching = query.length >= 2;
  return useQuery({
    queryKey: searching ? guestKeys.search(query) : guestKeys.hotel(hotelId),
    queryFn: () => (searching ? guestsApi.search(query) : guestsApi.forHotel(hotelId)),
    // Typing keeps the last results on screen until the new ones arrive
    placeholderData: keepPreviousData,
  });
}

export function useGuest(id: number) {
  return useQuery({ queryKey: guestKeys.detail(id), queryFn: () => guestsApi.get(id) });
}

export function useGuestIntelligence(id: number | null) {
  return useQuery({
    queryKey: guestKeys.intelligence(id ?? 0),
    queryFn: () => guestsApi.intelligence(id!),
    enabled: id !== null,
  });
}

export function useGuestReservations(id: number) {
  return useQuery({ queryKey: guestKeys.reservations(id), queryFn: () => guestsApi.reservations(id) });
}

export function useSetVip(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isVIP: boolean) => guestsApi.setVip(id, isVIP),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: guestKeys.all }),
  });
}
