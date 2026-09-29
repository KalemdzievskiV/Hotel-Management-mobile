import { addDays, toDateParam } from '@/lib/format';
import { BookingType, type Room } from '@/lib/types';

/**
 * What a guest is looking for. It travels between Explore, the hotel and the review screen
 * as route params, so it only holds strings and numbers.
 */
export interface StaySearch {
  type: BookingType;
  /** YYYY-MM-DD, the hotel's calendar day */
  checkIn: string;
  /** YYYY-MM-DD; overnight stays only */
  checkOut: string;
  /** HH:mm; short stays only */
  startTime: string;
  /** Short stays only */
  hours: number;
  guests: number;
}

export const MAX_GUESTS = 20;
export const SHORT_STAY_HOURS = { min: 1, max: 24 };

export function defaultSearch(): StaySearch {
  const today = new Date();
  return {
    type: BookingType.Daily,
    checkIn: toDateParam(today),
    checkOut: toDateParam(addDays(today, 1)),
    startTime: nextStartTime(today),
    hours: 3,
    guests: 1,
  };
}

/** The next whole hour from now, e.g. "15:00" at 14:20; "08:00" when it's past 23:00 */
function nextStartTime(now: Date): string {
  const hour = now.getHours() + 1;
  return `${String(hour > 23 ? 8 : hour).padStart(2, '0')}:00`;
}

/** Parses a YYYY-MM-DD day as a local date (new Date('2026-10-01') would be UTC midnight) */
export function parseDay(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((parseDay(checkOut).getTime() - parseDay(checkIn).getTime()) / 86_400_000);
}

/** "2026-10-01T14:00:00": a wall-clock time at the hotel, sent without a time zone */
function wallClock(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${toDateParam(date)}T${hh}:${mm}:00`;
}

/** The stay as the API wants it: plain days for overnight stays, times for short ones */
export function stayWindow(search: StaySearch): { checkIn: string; checkOut: string } {
  if (search.type === BookingType.Daily) return { checkIn: search.checkIn, checkOut: search.checkOut };
  const [hour, minute] = search.startTime.split(':').map(Number);
  const start = parseDay(search.checkIn);
  start.setHours(hour!, minute!, 0, 0);
  const end = new Date(start.getTime() + search.hours * 3_600_000);
  return { checkIn: wallClock(start), checkOut: wallClock(end) };
}

/** Why the search can't be run as it is, or null when it can */
export function searchProblem(search: StaySearch, now = new Date()): string | null {
  const today = toDateParam(now);
  if (search.checkIn < today) return 'Pick a check-in day from today on';
  if (search.type === BookingType.Daily) {
    if (nightsBetween(search.checkIn, search.checkOut) < 1) return 'Pick a check-out day after check-in';
    return null;
  }
  const [hour] = search.startTime.split(':').map(Number);
  if (search.checkIn === today && hour! <= now.getHours()) return 'Pick a start time later today';
  return null;
}

/** The price of the stay in a room, as the API will charge it */
export function stayPrice(room: Room, search: StaySearch): number {
  if (search.type === BookingType.ShortStay) return search.hours * (room.shortStayHourlyRate ?? 0);
  return Math.max(1, nightsBetween(search.checkIn, search.checkOut)) * (room.pricePerNight ?? 0);
}

/** Short-stay rooms set their own minimum and maximum length */
export function fitsShortStay(room: Room, hours: number): boolean {
  if (room.minimumShortStayHours && hours < room.minimumShortStayHours) return false;
  if (room.maximumShortStayHours && hours > room.maximumShortStayHours) return false;
  return true;
}

/** The rooms a search can actually book, cheapest first */
export function bookableRooms(rooms: Room[], search: StaySearch): Room[] {
  return rooms
    .filter((room) => search.type === BookingType.Daily || fitsShortStay(room, search.hours))
    .sort((a, b) => stayPrice(a, search) - stayPrice(b, search));
}

/** "1 Oct → 3 Oct · 2 nights" or "1 Oct, 14:00 · 3 h" */
export function describeDates(search: StaySearch): string {
  const day = (value: string) => parseDay(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  if (search.type === BookingType.ShortStay) return `${day(search.checkIn)}, ${search.startTime} · ${search.hours} h`;
  const nights = nightsBetween(search.checkIn, search.checkOut);
  return `${day(search.checkIn)} → ${day(search.checkOut)} · ${nights} night${nights === 1 ? '' : 's'}`;
}

/** describeDates plus the guests: "1 Oct → 3 Oct · 2 nights · 2 guests" */
export function describeSearch(search: StaySearch): string {
  return `${describeDates(search)} · ${search.guests} guest${search.guests === 1 ? '' : 's'}`;
}

type Params = Record<string, string | string[] | undefined>;

export function searchToParams(search: StaySearch): Record<string, string> {
  return {
    type: String(search.type),
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    startTime: search.startTime,
    hours: String(search.hours),
    guests: String(search.guests),
  };
}

/** Reads a search back from route params; anything missing or malformed falls back to the default */
export function searchFromParams(params: Params): StaySearch {
  const fallback = defaultSearch();
  const text = (key: string) => {
    const value = params[key];
    return typeof value === 'string' ? value : undefined;
  };
  const day = (key: string, otherwise: string) => {
    const value = text(key);
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : otherwise;
  };
  const whole = (key: string, min: number, max: number, otherwise: number) => {
    const value = Number(text(key));
    return Number.isInteger(value) && value >= min && value <= max ? value : otherwise;
  };
  const time = text('startTime');
  return {
    type: text('type') === String(BookingType.ShortStay) ? BookingType.ShortStay : BookingType.Daily,
    checkIn: day('checkIn', fallback.checkIn),
    checkOut: day('checkOut', fallback.checkOut),
    startTime: time && /^\d{2}:\d{2}$/.test(time) ? time : fallback.startTime,
    hours: whole('hours', SHORT_STAY_HOURS.min, SHORT_STAY_HOURS.max, fallback.hours),
    guests: whole('guests', 1, MAX_GUESTS, fallback.guests),
  };
}
