import { request } from '@/lib/http';
import type { Payment, PaymentMethod, Reservation } from '@/lib/types';

export const reservationsApi = {
  // Guests get their own bookings; staff get bookings for the hotels they work at
  list: () => request<Reservation[]>('GET', '/Reservations'),
  get: (id: number) => request<Reservation>('GET', `/Reservations/${id}`),
  todaysCheckIns: () => request<Reservation[]>('GET', '/Reservations/today/check-ins'),
  todaysCheckOuts: () => request<Reservation[]>('GET', '/Reservations/today/check-outs'),

  confirm: (id: number) => request<Reservation>('POST', `/Reservations/${id}/confirm`),
  checkIn: (id: number) => request<Reservation>('POST', `/Reservations/${id}/checkin`),
  checkOut: (id: number) => request<Reservation>('POST', `/Reservations/${id}/checkout`),
  cancel: (id: number, reason: string) => request<Reservation>('POST', `/Reservations/${id}/cancel`, { reason }),
  noShow: (id: number) => request<Reservation>('POST', `/Reservations/${id}/noshow`),

  payments: (id: number) => request<Payment[]>('GET', `/Reservations/${id}/payments`),
  recordPayment: (id: number, amount: number, paymentMethod: PaymentMethod, reference?: string) =>
    request<Reservation>('POST', `/Reservations/${id}/payment`, { amount, paymentMethod, reference }),
};
