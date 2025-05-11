import { DateTime } from 'luxon';

// Set the default timezone to GMT+7
const TIMEZONE = 'Asia/Bangkok'; // GMT+7

/**
 * Get the current time in GMT+7
 */
export function getCurrentTime(): DateTime {
  return DateTime.now().setZone(TIMEZONE);
}

/**
 * Format a DateTime object to a readable string
 * @param dateTime The DateTime object to format
 * @param format The format string (optional)
 */
export function formatDateTime(dateTime: DateTime, format: string = 'HH:mm dd/MM/yyyy'): string {
  return dateTime.toFormat(format);
}

/**
 * Parse a time string in the format HH:mm to a DateTime object
 * @param timeString The time string to parse (e.g., "05:00")
 * @param referenceDate The reference date to use (defaults to today)
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
 * Calculate the time difference in milliseconds
 * @param start The start time
 * @param end The end time
 */
export function getTimeDifferenceMs(start: DateTime, end: DateTime): number {
  return end.diff(start).milliseconds;
}

/**
 * Check if the current time is between two times
 * @param startTimeString The start time string (e.g., "05:00")
 * @param endTimeString The end time string (e.g., "11:00")
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
