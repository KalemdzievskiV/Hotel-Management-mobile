import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentMethod, Reservation, ReservationStatus } from '@/lib/types';
import { roomKeys } from '@/features/rooms/hooks';
import { reservationsApi } from './api';

export const reservationKeys = {
  all: ['reservations'] as const,
  desk: (hotelId: number) => ['reservations', 'desk', hotelId] as const,
  mine: ['reservations', 'mine'] as const,
  detail: (id: number) => ['reservations', 'detail', id] as const,
  payments: (id: number) => ['reservations', 'detail', id, 'payments'] as const,
};

export interface ReservationSection {
  key: string;
  title: string;
  data: Reservation[];
}

export const OPEN_STATUSES = [ReservationStatus.Pending, ReservationStatus.Confirmed, ReservationStatus.CheckedIn];

function byCheckIn(list: Reservation[]): Reservation[] {
  return [...list].sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
}

// Front desk: today's arrivals and departures at the hotel first, then everything else there
// that's still open
async function loadDesk(hotelId: number): Promise<ReservationSection[]> {
  const [checkIns, checkOuts, all] = await Promise.all([
    reservationsApi.todaysCheckIns(),
    reservationsApi.todaysCheckOuts(),
    reservationsApi.list(),
  ]);
  const atHotel = (list: Reservation[]) => list.filter((r) => r.hotelId === hotelId);
  const todayIds = new Set([...checkIns, ...checkOuts].map((r) => r.id));
  const open = atHotel(all).filter((r) => !todayIds.has(r.id) && OPEN_STATUSES.includes(r.status));
  return [
    { key: 'arrivals', title: 'Arriving today', data: atHotel(checkIns) },
    { key: 'departures', title: 'Leaving today', data: atHotel(checkOuts) },
    { key: 'open', title: 'Upcoming and in-house', data: byCheckIn(open) },
  ];
}

async function loadMine(): Promise<ReservationSection[]> {
  const mine = await reservationsApi.list();
  return [
    { key: 'upcoming', title: 'Upcoming', data: byCheckIn(mine.filter((r) => OPEN_STATUSES.includes(r.status))) },
    {
      key: 'past',
      title: 'Past and cancelled',
      data: byCheckIn(mine.filter((r) => !OPEN_STATUSES.includes(r.status))).reverse(),
    },
  ];
}

export function useDeskReservations(hotelId: number) {
  return useQuery({ queryKey: reservationKeys.desk(hotelId), queryFn: () => loadDesk(hotelId) });
}

export function useMyReservations() {
  return useQuery({ queryKey: reservationKeys.mine, queryFn: loadMine });
}

export function useReservation(id: number) {
  return useQuery({ queryKey: reservationKeys.detail(id), queryFn: () => reservationsApi.get(id) });
}

export function usePayments(id: number) {
  return useQuery({ queryKey: reservationKeys.payments(id), queryFn: () => reservationsApi.payments(id) });
}

/**
 * Runs a front-desk action (confirm, check in/out, cancel, no-show). The updated booking shows
 * at once; lists and the room board reload since the booking's and the room's status changed.
 */
export function useReservationAction(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: () => Promise<Reservation>) => action(),
    onSuccess: (reservation) => {
      queryClient.setQueryData(reservationKeys.detail(id), reservation);
      void queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      void queryClient.invalidateQueries({ queryKey: roomKeys.all });
    },
  });
}

export function useRecordPayment(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payment: { amount: number; method: PaymentMethod; reference?: string }) =>
      reservationsApi.recordPayment(id, payment.amount, payment.method, payment.reference),
    onSuccess: (reservation) => {
      queryClient.setQueryData(reservationKeys.detail(id), reservation);
      void queryClient.invalidateQueries({ queryKey: reservationKeys.payments(id) });
      void queryClient.invalidateQueries({ queryKey: reservationKeys.desk(reservation.hotelId) });
    },
  });
}
