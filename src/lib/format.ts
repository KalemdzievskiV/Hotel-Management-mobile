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

/**
 * For times the server stamps itself (payments, cleaning, task start/finish): it stores UTC
 * without a zone suffix, which JavaScript would otherwise read as local time.
 * Booking dates are different: they are hotel wall-clock times, so use them as they are.
 */
export function parseServerTime(value: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** "14:05" today, otherwise "3 Oct, 14:05" */
export function formatServerTime(value: string): string {
  const date = parseServerTime(value);
  if (date.toDateString() === new Date().toDateString()) return formatTime(date);
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** A local calendar day as the API's date parameter, YYYY-MM-DD */
export function toDateParam(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** "Today", "Tomorrow", "Yesterday" or "Fri 2 Oct" */
export function dayLabel(date: Date): string {
  const offset = Math.round((startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (offset === -1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** "12 Oct → 15 Oct 2026 · 3 nights" or "12 Oct, 14:00 · 3 h" for short stays */
export function formatStay(r: Reservation): string {
  if (r.bookingType === BookingType.ShortStay) {
    return `${formatDateTime(r.checkInDate)} · ${r.durationInHours ?? '?'} h`;
  }
  const nights = r.totalNights ? ` · ${r.totalNights} night${r.totalNights === 1 ? '' : 's'}` : '';
  // The year once, on the last date, when both dates fall in the same year
  const sameYear = new Date(r.checkInDate).getFullYear() === new Date(r.checkOutDate).getFullYear();
  const start = sameYear
    ? new Date(r.checkInDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : formatDate(r.checkInDate);
  return `${start} → ${formatDate(r.checkOutDate)}${nights}`;
}
