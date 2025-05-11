import { DateTime, Duration, Interval } from 'luxon';
import type { DurationLike } from 'luxon';
import dotenv from 'dotenv';

// Load environment variables to ensure TZ is available
dotenv.config();

// Get timezone from environment variable directly to avoid circular dependencies
const TIMEZONE = process.env.TZ || 'UTC';

/**
 * Enum for common date/time formats
 */
export enum DateTimeFormat {
  TIME_ONLY = 'HH:mm',
  DATE_ONLY = 'dd/MM/yyyy',
  DATE_TIME = 'dd/MM/yyyy HH:mm',
  DATE_TIME_SECONDS = 'dd/MM/yyyy HH:mm:ss',
  ISO_DATE = 'yyyy-MM-dd',
  ISO_DATE_TIME = 'yyyy-MM-dd\'T\'HH:mm:ss',
  RELATIVE = 'relative',
  DISCORD = 'discord',
}

/**
 * Get the current time in the configured timezone
 * @returns DateTime object in the configured timezone
 */
export function getCurrentTime(): DateTime {
  return DateTime.now().setZone(TIMEZONE);
}

/**
 * Format a DateTime object to a readable string
 * @param dateTime The DateTime object to format
 * @param format The format string or enum value
 * @returns Formatted date/time string
 */
export function formatDateTime(dateTime: DateTime, format: string | DateTimeFormat = DateTimeFormat.DATE_TIME): string {
  if (format === DateTimeFormat.RELATIVE) {
    return dateTime.toRelative() || dateTime.toFormat(DateTimeFormat.DATE_TIME);
  }

  if (format === DateTimeFormat.DISCORD) {
    // Discord timestamp format: <t:1234567890:R> for relative time
    return `<t:${Math.floor(dateTime.toSeconds())}:R>`;
  }

  return dateTime.toFormat(format);
}

/**
 * Parse a time string in the format HH:mm to a DateTime object
 * @param timeString The time string to parse (e.g., "05:00")
 * @param referenceDate The reference date to use (defaults to today)
 * @returns DateTime object with the specified time
 */
export function parseTimeString(timeString: string, referenceDate?: DateTime): DateTime {
  const [hours, minutes] = timeString.split(':').map(Number);
  const reference = referenceDate || getCurrentTime();

  return reference.set({
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0
  });
}

/**
 * Calculate the next occurrence of a specific time
 * @param timeString The time string in format HH:mm
 * @returns DateTime object representing the next occurrence
 */
export function getNextOccurrence(timeString: string): DateTime {
  const targetTime = parseTimeString(timeString);
  const now = getCurrentTime();

  // If the target time is in the past, add one day
  if (targetTime < now) {
    return targetTime.plus({ days: 1 });
  }

  return targetTime;
}

/**
 * Calculate the next occurrence of a time that might be on the next day
 * @param timeString The time string in format HH:mm
 * @param referenceTimeString The reference time string in format HH:mm
 * @returns DateTime object representing the next occurrence
 */
export function getNextOccurrenceWithReference(timeString: string, referenceTimeString: string): DateTime {
  const targetTime = parseTimeString(timeString);
  const referenceTime = parseTimeString(referenceTimeString);

  // If the target time is earlier than the reference time, it's on the next day
  if (targetTime < referenceTime) {
    return targetTime.plus({ days: 1 });
  }

  return targetTime;
}

/**
 * Calculate the time difference in milliseconds
 * @param start The start time
 * @param end The end time
 * @returns Time difference in milliseconds
 */
export function getTimeDifferenceMs(start: DateTime, end: DateTime): number {
  return end.diff(start).milliseconds;
}

/**
 * Calculate the time difference as a Duration object
 * @param start The start time
 * @param end The end time
 * @returns Duration object representing the difference
 */
export function getTimeDifference(start: DateTime, end: DateTime): Duration {
  return end.diff(start, ['days', 'hours', 'minutes', 'seconds']);
}

/**
 * Format a duration to a human-readable string
 * @param duration The duration to format
 * @returns Formatted duration string
 */
export function formatDuration(duration: Duration): string {
  const parts = [];

  if (duration.days > 0) {
    parts.push(`${duration.days} day${duration.days !== 1 ? 's' : ''}`);
  }

  if (duration.hours > 0) {
    parts.push(`${duration.hours} hour${duration.hours !== 1 ? 's' : ''}`);
  }

  if (duration.minutes > 0) {
    parts.push(`${duration.minutes} minute${duration.minutes !== 1 ? 's' : ''}`);
  }

  if (duration.seconds > 0 && parts.length === 0) {
    parts.push(`${Math.floor(duration.seconds)} second${Math.floor(duration.seconds) !== 1 ? 's' : ''}`);
  }

  return parts.join(', ');
}

/**
 * Check if the current time is between two times
 * @param startTimeString The start time string (e.g., "05:00")
 * @param endTimeString The end time string (e.g., "11:00")
 * @returns True if current time is between start and end times
 */
export function isTimeBetween(startTimeString: string, endTimeString: string): boolean {
  const now = getCurrentTime();
  const startTime = parseTimeString(startTimeString);
  const endTime = parseTimeString(endTimeString);

  // Handle case where end time is on the next day
  if (endTime < startTime) {
    return now >= startTime || now <= endTime;
  }

  return now >= startTime && now <= endTime;
}

/**
 * Create an interval between two times
 * @param startTimeString The start time string (e.g., "05:00")
 * @param endTimeString The end time string (e.g., "11:00")
 * @returns Interval object representing the time range
 */
export function createTimeInterval(startTimeString: string, endTimeString: string): Interval {
  const startTime = parseTimeString(startTimeString);
  let endTime = parseTimeString(endTimeString);

  // Handle case where end time is on the next day
  if (endTime < startTime) {
    endTime = endTime.plus({ days: 1 });
  }

  return Interval.fromDateTimes(startTime, endTime);
}

/**
 * Check if a DateTime is within a specific interval
 * @param dateTime The DateTime to check
 * @param interval The interval to check against
 * @returns True if the DateTime is within the interval
 */
export function isDateTimeInInterval(dateTime: DateTime, interval: Interval): boolean {
  return interval.contains(dateTime);
}

/**
 * Add a duration to a DateTime
 * @param dateTime The DateTime to add to
 * @param duration The duration to add
 * @returns New DateTime with the duration added
 */
export function addDuration(dateTime: DateTime, duration: DurationLike): DateTime {
  return dateTime.plus(duration);
}

/**
 * Subtract a duration from a DateTime
 * @param dateTime The DateTime to subtract from
 * @param duration The duration to subtract
 * @returns New DateTime with the duration subtracted
 */
export function subtractDuration(dateTime: DateTime, duration: DurationLike): DateTime {
  return dateTime.minus(duration);
}

/**
 * Get the start of the day for a DateTime
 * @param dateTime The DateTime to get the start of day for
 * @returns DateTime at the start of the day
 */
export function getStartOfDay(dateTime: DateTime = getCurrentTime()): DateTime {
  return dateTime.startOf('day');
}

/**
 * Get the end of the day for a DateTime
 * @param dateTime The DateTime to get the end of day for
 * @returns DateTime at the end of the day
 */
export function getEndOfDay(dateTime: DateTime = getCurrentTime()): DateTime {
  return dateTime.endOf('day');
}

/**
 * Convert a DateTime to a Unix timestamp (seconds)
 * @param dateTime The DateTime to convert
 * @returns Unix timestamp in seconds
 */
export function toUnixTimestamp(dateTime: DateTime): number {
  return Math.floor(dateTime.toSeconds());
}

/**
 * Create a DateTime from a Unix timestamp (seconds)
 * @param timestamp The Unix timestamp in seconds
 * @returns DateTime object
 */
export function fromUnixTimestamp(timestamp: number): DateTime {
  return DateTime.fromSeconds(timestamp).setZone(TIMEZONE);
}

/**
 * Get the timezone identifier
 * @returns The timezone identifier string
 */
export function getTimezone(): string {
  return TIMEZONE;
}
