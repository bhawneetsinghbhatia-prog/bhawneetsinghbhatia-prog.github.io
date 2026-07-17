import { loadConfig } from './config.mjs';
import { dateWindow, todayIso } from './dates.mjs';
import { collectJobs } from './collect.mjs';

const config = await loadConfig({
  ...process.env,
  HOTEL_IDS: process.env.HOTEL_IDS || 'fairmont-udaipur-palace',
  SOURCE_IDS: process.env.SOURCE_IDS || 'official',
  MAX_DATES: '1'
});
const [stay] = dateWindow({
  startDate: config.startDateOverride || todayIso(config.tracker.timezone),
  daysAhead: config.tracker.window.daysAhead,
  nights: config.tracker.stay.nights,
  includeToday: config.tracker.window.includeToday,
  maxDates: 1
});
const [result] = await collectJobs([
  { hotel: config.hotels[0], source: config.sources[0], stay }
], config.tracker);
console.log(JSON.stringify(result, null, 2));
