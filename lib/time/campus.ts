// StudySlot Teams — Campus Time Utilities (Asia/Kolkata default)

export const DEFAULT_CAMPUS_TZ = process.env.NEXT_PUBLIC_CAMPUS_TZ || 'Asia/Kolkata';

/**
 * Format a Date or ISO string into YYYY-MM-DD in the campus timezone.
 */
export function getCampusDateString(date: Date | string, timeZone = DEFAULT_CAMPUS_TZ): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Format a Date or ISO string into HH:mm in the campus timezone.
 */
export function getCampusTimeString(date: Date | string, timeZone = DEFAULT_CAMPUS_TZ): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(d);
}

/**
 * Convert a campus local date (YYYY-MM-DD) and time (HH:mm) into a UTC Date object.
 * Note: Kolkata is UTC+5:30 (no DST).
 */
export function campusTimeToUtc(dateStr: string, timeStr: string, timeZone = DEFAULT_CAMPUS_TZ): Date {
  // Use ISO representation with timezone parsing
  // Create an initial guess in UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // We can construct an ISO string and use Intl to adjust for the timezone offset accurately
  // For Asia/Kolkata, offset is +05:30. Let's compute offset dynamically for any valid timeZone:
  const testDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const utcDateStr = testDate.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzDateStr = testDate.toLocaleString('en-US', { timeZone });
  const offsetDiffMs = new Date(tzDateStr).getTime() - new Date(utcDateStr).getTime();

  return new Date(testDate.getTime() - offsetDiffMs);
}

/**
 * Format a range for display: e.g. "Thu 12 Nov 2026, 14:00–15:00"
 */
export function formatSlotRangeDisplay(startsAt: string, endsAt: string, timeZone = DEFAULT_CAMPUS_TZ): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const datePart = dateFormatter.format(start);
  const startTime = timeFormatter.format(start);
  const endTime = timeFormatter.format(end);

  return `${datePart}, ${startTime}–${endTime}`;
}

/**
 * Check if two time intervals [s1, e1) and [s2, e2) overlap.
 * Adjacent intervals where e1 === s2 or e2 === s1 do NOT overlap.
 */
export function intervalsOverlap(
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string
): boolean {
  const s1 = typeof start1 === 'string' ? new Date(start1).getTime() : start1.getTime();
  const e1 = typeof end1 === 'string' ? new Date(end1).getTime() : end1.getTime();
  const s2 = typeof start2 === 'string' ? new Date(start2).getTime() : start2.getTime();
  const e2 = typeof end2 === 'string' ? new Date(end2).getTime() : end2.getTime();

  return s1 < e2 && s2 < e1;
}

/**
 * Calculate duration in hours between two ISO timestamps.
 */
export function durationInHours(startsAt: string, endsAt: string): number {
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  return ms / (1000 * 60 * 60);
}
