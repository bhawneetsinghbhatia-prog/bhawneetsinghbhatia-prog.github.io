import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadConfig, ROOT } from './config.mjs';
import { dateWindow, todayIso } from './dates.mjs';
import { buildSourceUrl } from './url-builders.mjs';
import { collectJobs } from './collect.mjs';
import { saveSnapshot } from './store.mjs';
import { writeReports } from './report.mjs';
import { sendEmailIfConfigured } from './notify.mjs';

const dryRun = process.argv.includes('--dry-run');
const config = await loadConfig();
const startDate = config.startDateOverride || todayIso(config.tracker.timezone);
const dates = dateWindow({
  startDate,
  daysAhead: config.tracker.window.daysAhead,
  nights: config.tracker.stay.nights,
  includeToday: config.tracker.window.includeToday,
  maxDates: config.maxDates
});
const jobs = dates.flatMap((stay) => config.hotels.flatMap((hotel) => config.sources.map((source) => ({ stay, hotel, source }))));

if (dryRun) {
  const manifest = jobs.map(({ stay, hotel, source }) => ({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    hotel: hotel.name,
    source: source.name,
    url: buildSourceUrl(source, hotel, stay, config.tracker.stay)
  }));
  await mkdir(path.join(ROOT, 'data'), { recursive: true });
  await writeFile(path.join(ROOT, 'data', 'dry-run-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Dry run created ${manifest.length} checks in data/dry-run-manifest.json`);
  process.exit(0);
}

console.log(`Starting ${jobs.length} checks for ${dates.length} check-in dates`);
const results = await collectJobs(jobs, config.tracker, ({ completed, total, result }) => {
  console.log(`[${completed}/${total}] ${result.checkIn} | ${result.hotelName} | ${result.sourceName} | ${result.status}`);
});
const snapshot = await saveSnapshot({
  schemaVersion: 1,
  title: config.tracker.report.title,
  runStartedAt: new Date().toISOString(),
  timezone: config.tracker.timezone,
  stay: config.tracker.stay,
  dateWindow: dates,
  hotels: config.hotels.map(({ id, name }) => ({ id, name })),
  results
});
const report = await writeReports(snapshot);
const email = await sendEmailIfConfigured({
  ...report,
  subject: `${snapshot.title} — ${snapshot.runStartedAt.slice(0, 10)}`
});
console.log(email.sent ? 'Email report sent' : email.reason);
