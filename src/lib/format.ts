import { BookingType, Reservation } from './types';

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

/** "12 Oct → 15 Oct 2026 · 3 nights" or "12 Oct, 14:00 · 3 h" for short stays */
export function formatStay(r: Reservation): string {
  if (r.bookingType === BookingType.ShortStay) {
    return `${formatDateTime(r.checkInDate)} · ${r.durationInHours ?? '?'} h`;
  }
  const nights = r.totalNights ? ` · ${r.totalNights} night${r.totalNights === 1 ? '' : 's'}` : '';
  return `${formatDate(r.checkInDate)} → ${formatDate(r.checkOutDate)}${nights}`;
}
