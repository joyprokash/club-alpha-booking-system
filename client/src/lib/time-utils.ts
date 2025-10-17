import { format, parse, addDays, startOfDay } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";

const APP_TIMEZONE = "America/Toronto";

/**
 * Convert HH:mm string to minutes from midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to HH:mm string (24-hour format)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Generate time slots in 15-minute increments
 */
export function generateTimeSlots(
  startMinutes: number,
  endMinutes: number,
  stepMinutes: number = 15
): number[] {
  const slots: number[] = [];
  for (let i = startMinutes; i < endMinutes; i += stepMinutes) {
    slots.push(i);
  }
  return slots;
}

/**
 * Check if two time ranges overlap
 * Returns true if there's ANY overlap (edge touch is OK)
 */
export function hasTimeConflict(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  // Edge touch is OK: end1 === start2 or end2 === start1
  return start1 < end2 && start2 < end1;
}

/**
 * Format time range for display
 */
export function formatTimeRange(startMinutes: number, endMinutes: number): string {
  return `${minutesToTime(startMinutes)}–${minutesToTime(endMinutes)}`;
}

/**
 * Get current date in Toronto timezone as YYYY-MM-DD
 */
export function getCurrentDateToronto(): string {
  const now = new Date();
  const torontoDate = toZonedTime(now, APP_TIMEZONE);
  return format(torontoDate, "yyyy-MM-dd");
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = parse(dateString, "yyyy-MM-dd", new Date());
  return format(date, "MMM d, yyyy");
}

/**
 * Get day of week (0=Sun, 6=Sat) for a date string
 */
export function getDayOfWeek(dateString: string): number {
  const date = parse(dateString, "yyyy-MM-dd", new Date());
  return date.getDay();
}

/**
 * Get dates 14 days ago (for reception history limit)
 */
export function get14DaysAgo(): string {
  const now = new Date();
  const torontoDate = toZonedTime(now, APP_TIMEZONE);
  const past = addDays(torontoDate, -14);
  return format(past, "yyyy-MM-dd");
}

/**
 * Check if date is within reception's allowed range (last 14 days)
 */
export function isWithinReceptionRange(dateString: string): boolean {
  const cutoff = get14DaysAgo();
  return dateString >= cutoff;
}

/**
 * Grid constants
 */
export const GRID_START_TIME = 10 * 60; // 10:00 AM
export const GRID_END_TIME = 23 * 60; // 11:00 PM
export const SLOT_DURATION = 15; // minutes
