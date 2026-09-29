import { request } from '@/lib/http';
import type { AvailableRooms, BookingType, Reservation } from '@/lib/types';

export interface NewBooking {
  hotelId: number;
  roomId: number;
  bookingType: BookingType;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  specialRequests?: string;
}

export const bookingApi = {
  availableRooms: (hotelId: number, bookingType: BookingType, checkIn: string, checkOut: string, guests: number) =>
    request<AvailableRooms>(
      'GET',
      `/Reservations/available-rooms?hotelId=${hotelId}&bookingType=${bookingType}` +
        `&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&minCapacity=${guests}`
    ),
  /** A guest's booking is always for their own profile and starts Pending (unpaid) */
  create: (booking: NewBooking) => request<Reservation>('POST', '/Reservations', { ...booking, guestId: 0 }),
};
