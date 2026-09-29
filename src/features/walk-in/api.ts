import { hotelDay } from '@/lib/format';
import { request } from '@/lib/http';
import type { PaymentMethod, Reservation, Room } from '@/lib/types';
import type { NewGuest } from '@/features/guests/api';

export interface QuickCheckIn {
  hotelId: number;
  roomId: number;
  existingGuestId?: number;
  newGuest?: NewGuest;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  depositAmount: number;
  paymentMethod?: PaymentMethod;
  specialRequests?: string;
}

export const walkInApi = {
  /** Rooms free from tonight to tomorrow, at the hotel's today */
  roomsTonight: (hotelId: number) =>
    request<Room[]>('GET', `/WalkIn/available-rooms/${hotelId}?date=${hotelDay().date}`),
  /** Creates (or finds, by email) the guest, books the room and checks in, in one step */
  checkIn: (walkIn: QuickCheckIn) => request<Reservation>('POST', '/WalkIn/quick-checkin', walkIn),
};
