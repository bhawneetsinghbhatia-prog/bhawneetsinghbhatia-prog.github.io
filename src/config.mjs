import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8'));
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return number;
}

export async function loadConfig(env = process.env) {
  const [tracker, hotels, sources] = await Promise.all([
    readJson('config/tracker.json'),
    readJson('config/hotels.json'),
    readJson('config/sources.json')
  ]);

  tracker.stay.nights = positiveInteger(env.STAY_NIGHTS ?? tracker.stay.nights, 'stay.nights');
  tracker.window.daysAhead = positiveInteger(env.HORIZON_DAYS ?? tracker.window.daysAhead, 'window.daysAhead');
  tracker.collection.concurrency = positiveInteger(
    env.TRACKER_CONCURRENCY ?? tracker.collection.concurrency,
    'collection.concurrency'
  );

  const requestedHotelIds = new Set((env.HOTEL_IDS || '').split(',').map((value) => value.trim()).filter(Boolean));
  const requestedSourceIds = new Set((env.SOURCE_IDS || '').split(',').map((value) => value.trim()).filter(Boolean));
  const enabledHotels = hotels.filter((hotel) => hotel.enabled !== false && (requestedHotelIds.size === 0 || requestedHotelIds.has(hotel.id)));
  const enabledSources = sources.filter((source) => source.enabled !== false && (requestedSourceIds.size === 0 || requestedSourceIds.has(source.id)));
  if (enabledHotels.length === 0) throw new Error('At least one hotel must be enabled and match HOTEL_IDS');
  if (enabledSources.length === 0) throw new Error('At least one source must be enabled and match SOURCE_IDS');

  const hotelIds = new Set();
  for (const hotel of enabledHotels) {
    if (!hotel.id || !hotel.name || !hotel.location) throw new Error('Every hotel needs id, name, and location');
    if (hotelIds.has(hotel.id)) throw new Error(`Duplicate hotel id: ${hotel.id}`);
    hotelIds.add(hotel.id);
  }

  return {
    tracker,
    hotels: enabledHotels,
    allHotels: hotels.filter((hotel) => hotel.enabled !== false),
    sources: enabledSources,
    startDateOverride: env.START_DATE || null,
    maxDates: env.MAX_DATES ? positiveInteger(env.MAX_DATES, 'MAX_DATES') : null
  };
}

export { ROOT };
