export function getLocalDateStringInKolkata(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function getLocalDayStartInKolkata(date: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(date);
  const map = new Map(parts.map((p) => [p.type, p.value]));
  
  const year = map.get('year')!;
  const month = map.get('month')!.padStart(2, '0');
  const day = map.get('day')!.padStart(2, '0');
  
  // Construct the ISO date-time string at midnight in Asia/Kolkata timezone
  const dateString = `${year}-${month}-${day}T00:00:00+05:30`;
  return new Date(dateString);
}

/**
 * Get today's date in YYYY-MM-DD format using the user's local timezone.
 * This fixes the bug where `new Date().toISOString().slice(0, 10)` returns
 * the UTC date, which can be off by a day for users in timezones ahead of UTC
 * (like Asia/Kolkata, UTC+5:30).
 *
 * For example, at 2024-01-15 01:00 IST (2024-01-14 19:30 UTC):
 * - toISOString().slice(0,10) → "2024-01-14" (wrong — yesterday in IST)
 * - localDateString() → "2024-01-15" (correct — today in IST)
 */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a date string (YYYY-MM-DD) into a human-readable date in the user's
 * local timezone. Uses en-IN locale by default.
 */
export function formatLocalDate(dateStr: string, locale: string = 'en-IN'): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
}
