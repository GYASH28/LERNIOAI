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
