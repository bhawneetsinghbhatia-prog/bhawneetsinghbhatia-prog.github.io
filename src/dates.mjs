function datePartsInTimezone(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

export function todayIso(timezone, now = new Date()) {
  const { year, month, day } = datePartsInTimezone(now, timezone);
  return `${year}-${month}-${day}`;
}

export function addDays(isoDate, days) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function dateWindow({ startDate, daysAhead, nights, includeToday = true, maxDates = null }) {
  const firstOffset = includeToday ? 0 : 1;
  const dates = [];
  for (let offset = firstOffset; offset <= daysAhead; offset += 1) {
    const checkIn = addDays(startDate, offset);
    dates.push({ checkIn, checkOut: addDays(checkIn, nights), nights });
  }
  return maxDates ? dates.slice(0, maxDates) : dates;
}
