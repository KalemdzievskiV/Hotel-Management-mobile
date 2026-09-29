import { BookingType, Reservation } from './types';

export function formatMoney(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Booking dates and times are hotel wall-clock times ("11:00 at the hotel"). The API sends them
 * with a "Z" it doesn't mean, so the zone is dropped: 11:00 stays 11:00 on any phone.
 */
export function parseStayTime(value: string): Date {
  const [date, time = '00:00:00'] = value.replace(/([zZ]|[+-]\d\d:?\d\d)$/, '').split('T');
  const [year, month, day] = date!.split('-').map(Number);
  const [hour, minute, second] = time.split(':').map((part) => Math.floor(Number(part)));
  return new Date(year!, month! - 1, day!, hour || 0, minute || 0, second || 0);
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
  const checkIn = parseStayTime(r.checkInDate);
  const checkOut = parseStayTime(r.checkOutDate);
  if (r.bookingType === BookingType.ShortStay) {
    const at = checkIn.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `${at} · ${r.durationInHours ?? '?'} h`;
  }
  const nights = r.totalNights ? ` · ${r.totalNights} night${r.totalNights === 1 ? '' : 's'}` : '';
  // The year once, on the last date, when both dates fall in the same year
  const sameYear = checkIn.getFullYear() === checkOut.getFullYear();
  const start = checkIn.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const end = checkOut.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${start} → ${end}${nights}`;
}

/**
 * The hotel's "today" for the API. Staff phones are at the hotel, so the phone's own calendar
 * day and UTC offset stand in for the hotel's (hotels don't store a time zone yet).
 */
export function hotelDay(): { date: string; utcOffsetMinutes: number } {
  const now = new Date();
  return { date: toDateParam(now), utcOffsetMinutes: -now.getTimezoneOffset() };
}

/** 1234.5 → "1,235" for KPI tiles, where cents are noise */
export function formatWholeMoney(amount: number): string {
  return Math.round(amount).toLocaleString();
}
