import { format } from "date-fns";
import { de } from "date-fns/locale";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

const TIMEZONE = "Europe/Berlin";

/**
 * Formats a Unix timestamp (in seconds) to a Berlin timezone formatted string.
 *
 * @param timestampSeconds - The Unix timestamp in seconds.
 * @param formatStr - The date-fns format string (e.g. "dd.MM.yyyy HH:mm").
 * @returns The formatted date string in Berlin timezone.
 *
 * @example
 * formatBerlinDate(1700000000, "dd.MM.yyyy HH:mm") // "14.11.2023 22:13"
 */
export function formatBerlinDate(
  timestampSeconds: number,
  formatStr: string
): string {
  const zonedDate = toZonedTime(
    new Date(timestampSeconds * 1000),
    TIMEZONE
  );
  return format(zonedDate, formatStr, { locale: de });
}

/**
 * Formats a JS Date object to a Berlin timezone formatted string.
 *
 * @param date - A JS Date object.
 * @param formatStr - The date-fns format string.
 * @returns The formatted date string in Berlin timezone.
 */
export function formatDateBerlin(
  date: Date,
  formatStr: string
): string {
  const zonedDate = toZonedTime(date, TIMEZONE);
  return format(zonedDate, formatStr, { locale: de });
}

/**
 * Parses a datetime-local string (e.g. "2024-01-15T13:00") as Berlin time
 * and returns the corresponding UTC Date object.
 *
 * @param dateTimeStr - A datetime string to interpret as Berlin time.
 * @returns A Date object representing the UTC equivalent.
 */
export function parseBerlinDateTime(dateTimeStr: string): Date {
  return fromZonedTime(dateTimeStr, TIMEZONE);
}

/**
 * Converts a Unix timestamp (in seconds) to a datetime-local input value
 * in Berlin timezone (format: "yyyy-MM-dd'T'HH:mm").
 *
 * @param timestampSeconds - The Unix timestamp in seconds.
 * @returns A string suitable for a datetime-local input element.
 */
export function toBerlinDatetimeLocal(timestampSeconds: number): string {
  return formatBerlinDate(timestampSeconds, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Tries to parse an arbitrary date value and convert it to a
 * datetime-local string in Berlin timezone.
 *
 * @param value - Any value that can be parsed by `new Date()`.
 * @returns The datetime-local string, or null if the value is invalid.
 */
export function tryParseToBerlinDatetimeLocal(value: any): string | null {
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return formatDateBerlin(date, "yyyy-MM-dd'T'HH:mm");
}
