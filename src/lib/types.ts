// The subset of the API's shapes this app uses (same as the web app's types/)

export interface AuthResponse {
  token: string;
  email: string;
  fullName: string;
  roles: string[];
  expiresAt: string;
}

export interface AuthUser {
  email: string;
  fullName: string;
  roles: string[];
}

export interface Hotel {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  stars: number;
  phoneNumber?: string;
  checkInTime?: string;
  checkOutTime?: string;
  totalRooms?: number;
}

export enum BookingType {
  Daily = 0,
  ShortStay = 1,
}

export enum ReservationStatus {
  Pending = 0,
  Confirmed = 1,
  CheckedIn = 2,
  CheckedOut = 3,
  Cancelled = 4,
  NoShow = 5,
}

export const ReservationStatusLabels: Record<ReservationStatus, string> = {
  [ReservationStatus.Pending]: 'Pending',
  [ReservationStatus.Confirmed]: 'Confirmed',
  [ReservationStatus.CheckedIn]: 'Checked in',
  [ReservationStatus.CheckedOut]: 'Checked out',
  [ReservationStatus.Cancelled]: 'Cancelled',
  [ReservationStatus.NoShow]: 'No-show',
};

export const ReservationStatusColors: Record<ReservationStatus, string> = {
  [ReservationStatus.Pending]: '#b45309',
  [ReservationStatus.Confirmed]: '#1d4ed8',
  [ReservationStatus.CheckedIn]: '#15803d',
  [ReservationStatus.CheckedOut]: '#6b7280',
  [ReservationStatus.Cancelled]: '#b91c1c',
  [ReservationStatus.NoShow]: '#9f1239',
};

export interface Reservation {
  id: number;
  hotelId: number;
  roomId: number;
  guestId: number;
  bookingType: BookingType;
  checkInDate: string;
  checkOutDate: string;
  durationInHours?: number;
  numberOfGuests: number;
  status: ReservationStatus;
  totalAmount: number;
  depositAmount: number;
  remainingAmount: number;
  specialRequests?: string;
  notes?: string;
  totalNights?: number;
  canCheckIn?: boolean;
  canCheckOut?: boolean;
  canCancel?: boolean;
  hotelName?: string;
  roomNumber?: string;
  guestName?: string;
}
