// The subset of the API's shapes this app uses (same as the web app's types/)
import type { ToneName } from '@/theme';

export interface AuthResponse {
  token: string;
  email: string;
  fullName: string;
  roles: string[];
  expiresAt: string;
  /** Single use: exchanged at /Auth/refresh for new tokens */
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AuthUser {
  /** Identity user id, read from the token (matches e.g. assignedToUserId on tasks) */
  id: string;
  email: string;
  fullName: string;
  roles: string[];
}

export interface Hotel {
  id: number;
  name: string;
  description?: string | null;
  address: string;
  city: string;
  country: string;
  postalCode?: string | null;
  stars: number;
  rating?: number;
  totalReviews?: number;
  /** Comma-separated, e.g. "WiFi, Parking, Pool" */
  amenities?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  website?: string | null;
  checkInTime?: string;
  checkOutTime?: string;
  totalRooms?: number;
}

/** The signed-in user's own guest profile (GET/PUT /Guests/me) */
export interface GuestProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string | null;
  nationality?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

export type ProfileUpdate = Omit<GuestProfile, 'id' | 'email'>;

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

export const ReservationStatusTones: Record<ReservationStatus, ToneName> = {
  [ReservationStatus.Pending]: 'warning',
  [ReservationStatus.Confirmed]: 'info',
  [ReservationStatus.CheckedIn]: 'success',
  [ReservationStatus.CheckedOut]: 'neutral',
  [ReservationStatus.Cancelled]: 'danger',
  [ReservationStatus.NoShow]: 'rose',
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
  /** Server-stamped (UTC): read with parseServerTime */
  createdAt?: string;
  confirmedAt?: string | null;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  hotelName?: string;
  roomNumber?: string;
  guestName?: string;
}

export enum PaymentMethod {
  Cash = 0,
  CreditCard = 1,
  DebitCard = 2,
  BankTransfer = 3,
  Online = 4,
  PayOnArrival = 5,
}

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'Cash',
  [PaymentMethod.CreditCard]: 'Credit card',
  [PaymentMethod.DebitCard]: 'Debit card',
  [PaymentMethod.BankTransfer]: 'Bank transfer',
  [PaymentMethod.Online]: 'Online',
  [PaymentMethod.PayOnArrival]: 'Pay on arrival',
};

export enum PaymentTransactionType {
  Payment = 1,
  Refund = 2,
}

/** One entry in a reservation's payment ledger */
export interface Payment {
  id: number;
  reservationId: number;
  type: PaymentTransactionType;
  amount: number;
  method?: PaymentMethod | null;
  reference?: string | null;
  notes?: string | null;
  createdAt: string;
  createdByName?: string | null;
}

export enum RoomStatus {
  Available = 1,
  Occupied = 2,
  Cleaning = 3,
  Maintenance = 4,
  OutOfService = 5,
  Reserved = 6,
}

export const RoomStatusLabels: Record<RoomStatus, string> = {
  [RoomStatus.Available]: 'Available',
  [RoomStatus.Occupied]: 'Occupied',
  [RoomStatus.Cleaning]: 'Needs cleaning',
  [RoomStatus.Maintenance]: 'Maintenance',
  [RoomStatus.OutOfService]: 'Out of service',
  [RoomStatus.Reserved]: 'Reserved',
};

export const RoomStatusTones: Record<RoomStatus, ToneName> = {
  [RoomStatus.Available]: 'success',
  [RoomStatus.Occupied]: 'info',
  [RoomStatus.Cleaning]: 'warning',
  [RoomStatus.Maintenance]: 'rose',
  [RoomStatus.OutOfService]: 'neutral',
  [RoomStatus.Reserved]: 'violet',
};

export enum RoomType {
  Single = 1,
  Double = 2,
  Twin = 3,
  Triple = 4,
  Suite = 5,
  Deluxe = 6,
  Presidential = 7,
  Studio = 8,
  Family = 9,
  Accessible = 10,
}

export const RoomTypeLabels: Record<RoomType, string> = {
  [RoomType.Single]: 'Single room',
  [RoomType.Double]: 'Double room',
  [RoomType.Twin]: 'Twin room',
  [RoomType.Triple]: 'Triple room',
  [RoomType.Suite]: 'Suite',
  [RoomType.Deluxe]: 'Deluxe room',
  [RoomType.Presidential]: 'Presidential suite',
  [RoomType.Studio]: 'Studio',
  [RoomType.Family]: 'Family room',
  [RoomType.Accessible]: 'Accessible room',
};

export interface Room {
  id: number;
  hotelId: number;
  roomNumber: string;
  type: RoomType;
  floor: number;
  capacity: number;
  status: RoomStatus;
  isActive: boolean;
  lastCleaned?: string | null;
  notes?: string | null;
  pricePerNight?: number;
  allowsShortStay?: boolean;
  shortStayHourlyRate?: number | null;
  minimumShortStayHours?: number | null;
  maximumShortStayHours?: number | null;
  description?: string | null;
  /** Comma-separated */
  amenities?: string | null;
  bedType?: string | null;
  areaSqM?: number | null;
  viewType?: string | null;
  hasBalcony?: boolean;
  hasBathtub?: boolean;
}

/** GET /Reservations/available-rooms */
export interface AvailableRooms {
  hotelId: number;
  totalAvailable: number;
  rooms: Room[];
}

export enum HousekeepingTaskType {
  CleanRoom = 1,
  ChangeLinen = 2,
  DeepClean = 3,
  Maintenance = 4,
  Inspection = 5,
  TurnDown = 6,
}

export const HousekeepingTaskTypeLabels: Record<HousekeepingTaskType, string> = {
  [HousekeepingTaskType.CleanRoom]: 'Clean room',
  [HousekeepingTaskType.ChangeLinen]: 'Change linen',
  [HousekeepingTaskType.DeepClean]: 'Deep clean',
  [HousekeepingTaskType.Maintenance]: 'Maintenance',
  [HousekeepingTaskType.Inspection]: 'Inspection',
  [HousekeepingTaskType.TurnDown]: 'Turn-down',
};

export enum HousekeepingTaskPriority {
  Low = 1,
  Normal = 2,
  High = 3,
  Urgent = 4,
}

export enum HousekeepingTaskStatus {
  Pending = 1,
  InProgress = 2,
  Completed = 3,
  Cancelled = 4,
  NeedsInspection = 5,
}

export interface HousekeepingTask {
  id: number;
  roomId: number;
  roomNumber: string;
  hotelId: number;
  assignedToUserId?: string | null;
  assignedToName?: string | null;
  type: HousekeepingTaskType;
  priority: HousekeepingTaskPriority;
  status: HousekeepingTaskStatus;
  scheduledFor: string;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  durationMinutes?: number | null;
}

export interface HousekeepingSchedule {
  date: string;
  tasks: HousekeepingTask[];
}

/** One page of a list (GET /Reservations/search) */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type AttentionKind = 'overdueArrival' | 'unpaidDeparture' | 'roomNotReady' | 'pendingApproval';

export interface AttentionItem {
  kind: AttentionKind;
  reservationId?: number | null;
  roomId?: number | null;
  title: string;
  detail: string;
  amount?: number | null;
}

/** GET /Dashboard/today */
export interface TodayDashboard {
  hotelId: number;
  date: string;
  totalRooms: number;
  occupiedRooms: number;
  occupancyPercent: number;
  arrivals: number;
  arrivalsCheckedIn: number;
  departures: number;
  departuresCheckedOut: number;
  inHouse: number;
  revenueToday: number;
  pendingApprovals: number;
  openHousekeepingTasks: number;
  roomsByStatus: { status: RoomStatus; count: number }[];
  attention: AttentionItem[];
}

/** GET /Dashboard/trend: one day */
export interface DailyTrend {
  date: string;
  revenue: number;
  occupiedRooms: number;
  totalRooms: number;
  occupancyPercent: number;
}

/** A guest as the hotel sees them */
export interface Guest {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationality?: string | null;
  isVIP: boolean;
  isBlacklisted: boolean;
  blacklistReason?: string | null;
  notes?: string | null;
  lastStayDate?: string | null;
}

/** GET /WalkIn/guest-intelligence/{id}: what the desk should know before checking someone in */
export interface GuestIntelligence {
  guestId: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  isVIP: boolean;
  isBlacklisted: boolean;
  blacklistReason?: string | null;
  preferences?: string | null;
  specialRequests?: string | null;
  notes?: string | null;
  totalStays: number;
  totalSpent: number;
  lastStayDate?: string | null;
  mostUsedRoomType?: string | null;
  hasOutstandingPayments: boolean;
}

/** Someone who works at a hotel (GET /Hotels/{id}/staff) */
export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  roles: string[];
  isActive?: boolean;
}

export const HousekeepingTaskPriorityLabels: Record<HousekeepingTaskPriority, string> = {
  [HousekeepingTaskPriority.Low]: 'Low',
  [HousekeepingTaskPriority.Normal]: 'Normal',
  [HousekeepingTaskPriority.High]: 'High',
  [HousekeepingTaskPriority.Urgent]: 'Urgent',
};

// Notifications (GET /Notifications). Same numbers as the API's NotificationType.
export enum NotificationType {
  NewBooking = 1,
  BookingCancelledByGuest = 2,
  BookingConfirmed = 3,
  BookingCancelled = 4,
  TaskAssigned = 5,
  TaskUrgent = 6,
}

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  hotelId?: number | null;
  reservationId?: number | null;
  housekeepingTaskId?: number | null;
  createdAt: string;
  readAt?: string | null;
  isRead: boolean;
}

export interface NotificationPage extends PagedResult<AppNotification> {
  unreadCount: number;
}

export interface NotificationPreference {
  type: NotificationType;
  pushEnabled: boolean;
}
