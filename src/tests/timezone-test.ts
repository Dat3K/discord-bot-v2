import * as timeUtils from '../utils/timeUtils';
import { DateTime, Interval } from 'luxon';

console.log('=== Timezone Handling Test ===');

// Test timezone configuration
console.log('\nTimezone Configuration:');
console.log('Current Timezone:', timeUtils.getTimezone());

// Test current time
console.log('\nCurrent Time:');
const now = timeUtils.getCurrentTime();
console.log('Current Time (ISO):', now.toISO());
console.log('Current Time (Formatted):', timeUtils.formatDateTime(now, timeUtils.DateTimeFormat.DATE_TIME));
console.log('Current Time (Discord):', timeUtils.formatDateTime(now, timeUtils.DateTimeFormat.DISCORD));
console.log('Current Time (Relative):', timeUtils.formatDateTime(now, timeUtils.DateTimeFormat.RELATIVE));

// Test time parsing
console.log('\nTime Parsing:');
const timeString = '05:00';
const parsedTime = timeUtils.parseTimeString(timeString);
console.log(`Parsed Time (${timeString}):`, timeUtils.formatDateTime(parsedTime, timeUtils.DateTimeFormat.DATE_TIME));

// Test next occurrence
console.log('\nNext Occurrence:');
const nextOccurrence = timeUtils.getNextOccurrence(timeString);
console.log(`Next Occurrence of ${timeString}:`, timeUtils.formatDateTime(nextOccurrence, timeUtils.DateTimeFormat.DATE_TIME));

// Test next occurrence with reference
console.log('\nNext Occurrence with Reference:');
const referenceTimeString = '22:00';
const nextOccurrenceWithRef = timeUtils.getNextOccurrenceWithReference(timeString, referenceTimeString);
console.log(`Next Occurrence of ${timeString} with reference ${referenceTimeString}:`, 
  timeUtils.formatDateTime(nextOccurrenceWithRef, timeUtils.DateTimeFormat.DATE_TIME));

// Test time difference
console.log('\nTime Difference:');
const futureTime = now.plus({ hours: 3, minutes: 30 });
const timeDiff = timeUtils.getTimeDifference(now, futureTime);
console.log('Time Difference (Duration):', timeDiff.toObject());
console.log('Time Difference (Formatted):', timeUtils.formatDuration(timeDiff));
console.log('Time Difference (Milliseconds):', timeUtils.getTimeDifferenceMs(now, futureTime));

// Test time between
console.log('\nTime Between:');
const startTimeString = '08:00';
const endTimeString = '17:00';
const isBetween = timeUtils.isTimeBetween(startTimeString, endTimeString);
console.log(`Is current time between ${startTimeString} and ${endTimeString}:`, isBetween);

// Test time interval
console.log('\nTime Interval:');
const interval = timeUtils.createTimeInterval(startTimeString, endTimeString);
console.log('Interval Start:', timeUtils.formatDateTime(interval.start as DateTime, timeUtils.DateTimeFormat.DATE_TIME));
console.log('Interval End:', timeUtils.formatDateTime(interval.end as DateTime, timeUtils.DateTimeFormat.DATE_TIME));
console.log('Is current time in interval:', timeUtils.isDateTimeInInterval(now, interval));

// Test duration operations
console.log('\nDuration Operations:');
const futureDateTime = timeUtils.addDuration(now, { days: 1, hours: 2 });
console.log('Future DateTime (add 1 day, 2 hours):', timeUtils.formatDateTime(futureDateTime, timeUtils.DateTimeFormat.DATE_TIME));
const pastDateTime = timeUtils.subtractDuration(now, { hours: 5 });
console.log('Past DateTime (subtract 5 hours):', timeUtils.formatDateTime(pastDateTime, timeUtils.DateTimeFormat.DATE_TIME));

// Test day boundaries
console.log('\nDay Boundaries:');
const startOfDay = timeUtils.getStartOfDay();
console.log('Start of Day:', timeUtils.formatDateTime(startOfDay, timeUtils.DateTimeFormat.DATE_TIME));
const endOfDay = timeUtils.getEndOfDay();
console.log('End of Day:', timeUtils.formatDateTime(endOfDay, timeUtils.DateTimeFormat.DATE_TIME));

// Test timestamp conversion
console.log('\nTimestamp Conversion:');
const timestamp = timeUtils.toUnixTimestamp(now);
console.log('Unix Timestamp:', timestamp);
const fromTimestamp = timeUtils.fromUnixTimestamp(timestamp);
console.log('DateTime from Timestamp:', timeUtils.formatDateTime(fromTimestamp, timeUtils.DateTimeFormat.DATE_TIME));

// Test cross-day time range
console.log('\nCross-Day Time Range:');
const lateStart = '22:00';
const earlyEnd = '03:00';
const crossDayInterval = timeUtils.createTimeInterval(lateStart, earlyEnd);
console.log('Cross-Day Interval Start:', timeUtils.formatDateTime(crossDayInterval.start as DateTime, timeUtils.DateTimeFormat.DATE_TIME));
console.log('Cross-Day Interval End:', timeUtils.formatDateTime(crossDayInterval.end as DateTime, timeUtils.DateTimeFormat.DATE_TIME));
const isInCrossDayInterval = timeUtils.isTimeBetween(lateStart, earlyEnd);
console.log(`Is current time between ${lateStart} and ${earlyEnd}:`, isInCrossDayInterval);

console.log('\n=== Timezone Handling Test Complete ===');
