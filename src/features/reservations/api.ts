import { request } from '@/lib/http';
import { hotelDay } from '@/lib/format';
import type { BookingType, PagedResult, Payment, PaymentMethod, Reservation } from '@/lib/types';

export type DeskSegment = 'arrivals' | 'departures' | 'inhouse' | 'upcoming' | 'pending' | 'all';

/** A booking made at the desk; it's confirmed straight away */
export interface DeskBooking {
  hotelId: number;
  roomId: number;
  guestId: number;
  bookingType: BookingType;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  depositAmount: number;
  paymentMethod?: PaymentMethod;
  specialRequests?: string;
  notes?: string;
}

/** What the desk can change on a booking (the room stays the same) */
export interface BookingChanges {
  checkInDate: string;
  checkOutDate: string;
  durationInHours?: number | null;
  numberOfGuests: number;
  specialRequests?: string | null;
  notes?: string | null;
  paymentMethod?: PaymentMethod | null;
}

export const reservationsApi = {
  // Guests get their own bookings; staff get bookings for the hotels they work at
  list: () => request<Reservation[]>('GET', '/Reservations'),
  get: (id: number) => request<Reservation>('GET', `/Reservations/${id}`),

  confirm: (id: number) => request<Reservation>('POST', `/Reservations/${id}/confirm`),
  checkIn: (id: number) => request<Reservation>('POST', `/Reservations/${id}/checkin`),
  checkOut: (id: number) => request<Reservation>('POST', `/Reservations/${id}/checkout`),
  cancel: (id: number, reason: string) => request<Reservation>('POST', `/Reservations/${id}/cancel`, { reason }),
  noShow: (id: number) => request<Reservation>('POST', `/Reservations/${id}/noshow`),

  /** One page of the hotel's bookings for a segment, relative to the hotel's today */
  search: (hotelId: number, segment: DeskSegment, query: string, page: number, pageSize = 25) =>
    request<PagedResult<Reservation>>(
      'GET',
      `/Reservations/search?hotelId=${hotelId}&segment=${segment}&date=${hotelDay().date}` +
        `&q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`
    ),
  create: (booking: DeskBooking) => request<Reservation>('POST', '/Reservations', booking),
  update: (id: number, changes: BookingChanges) => request<Reservation>('PUT', `/Reservations/${id}`, changes),
  refund: (id: number, amount: number, reason?: string) =>
    request<Reservation>('POST', `/Reservations/${id}/refund`, { amount, reason }),
  /** Takes the last payment (and any extras), then checks out, in one step */
  expressCheckOut: (id: number, finalPayment: number, paymentMethod: PaymentMethod, extraCharges = 0, extraChargesNotes?: string) =>
    request<Reservation>('POST', `/WalkIn/express-checkout/${id}`, { finalPayment, paymentMethod, extraCharges, extraChargesNotes }),

  payments: (id: number) => request<Payment[]>('GET', `/Reservations/${id}/payments`),
  recordPayment: (id: number, amount: number, paymentMethod: PaymentMethod, reference?: string) =>
    request<Reservation>('POST', `/Reservations/${id}/payment`, { amount, paymentMethod, reference }),
};
