import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PaymentMethod, Reservation, ReservationStatus } from '@/lib/types';
import { dashboardKeys } from '@/features/dashboard/hooks';
import { roomKeys } from '@/features/rooms/hooks';
import { reservationsApi, type BookingChanges, type DeskBooking, type DeskSegment } from './api';

export const reservationKeys = {
  all: ['reservations'] as const,
  desk: (hotelId: number) => ['reservations', 'desk', hotelId] as const,
  search: (hotelId: number, segment: DeskSegment, query: string) =>
    ['reservations', 'desk', hotelId, segment, query] as const,
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

/** A desk list, 25 at a time; `fetchNextPage` loads more as the list scrolls */
export function useDeskSearch(hotelId: number, segment: DeskSegment, query: string) {
  const term = query.trim();
  return useInfiniteQuery({
    queryKey: reservationKeys.search(hotelId, segment, term),
    queryFn: ({ pageParam }) => reservationsApi.search(hotelId, segment, term, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });
}

/**
 * After anything that changes a booking at the desk: lists, the room board and the Today
 * numbers all reload.
 */
export function invalidateDesk(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: reservationKeys.all });
  void queryClient.invalidateQueries({ queryKey: roomKeys.all });
  void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
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
      invalidateDesk(queryClient);
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
      invalidateDesk(queryClient);
    },
  });
}

export function useRefund(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ amount, reason }: { amount: number; reason?: string }) => reservationsApi.refund(id, amount, reason),
    onSuccess: (reservation) => {
      queryClient.setQueryData(reservationKeys.detail(id), reservation);
      invalidateDesk(queryClient);
    },
  });
}

export function useUpdateReservation(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: BookingChanges) => reservationsApi.update(id, changes),
    onSuccess: (reservation) => {
      queryClient.setQueryData(reservationKeys.detail(id), reservation);
      invalidateDesk(queryClient);
    },
  });
}

/** Takes the balance and checks out in one step */
export function useExpressCheckOut(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payment: { amount: number; method: PaymentMethod; extraCharges?: number; extraNotes?: string }) =>
      reservationsApi.expressCheckOut(id, payment.amount, payment.method, payment.extraCharges, payment.extraNotes),
    onSuccess: (reservation) => {
      queryClient.setQueryData(reservationKeys.detail(id), reservation);
      invalidateDesk(queryClient);
    },
  });
}

/** A booking made at the desk (confirmed straight away) */
export function useCreateDeskBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (booking: DeskBooking) => reservationsApi.create(booking),
    onSuccess: (reservation) => {
      queryClient.setQueryData(reservationKeys.detail(reservation.id), reservation);
      invalidateDesk(queryClient);
    },
  });
}
