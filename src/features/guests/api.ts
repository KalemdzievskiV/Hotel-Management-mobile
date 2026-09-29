import { request } from '@/lib/http';
import type { Guest, GuestIntelligence, Reservation } from '@/lib/types';

export interface NewGuest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export const guestsApi = {
  forHotel: (hotelId: number) => request<Guest[]>('GET', `/Guests/hotel/${hotelId}`),
  /** Matches name, email or phone */
  search: (term: string) => request<Guest[]>('GET', `/Guests/search?name=${encodeURIComponent(term)}`),
  get: (id: number) => request<Guest>('GET', `/Guests/${id}`),
  intelligence: (id: number) => request<GuestIntelligence>('GET', `/WalkIn/guest-intelligence/${id}`),
  reservations: (id: number) => request<Reservation[]>('GET', `/Reservations/guest/${id}`),
  create: (hotelId: number, guest: NewGuest) => request<Guest>('POST', '/Guests', { ...guest, hotelId }),
  setVip: (id: number, isVIP: boolean) => request<void>('PATCH', `/Guests/${id}/vip`, { isVIP }),
};
