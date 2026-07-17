import { createServer } from 'node:http';
import { loadConfig } from './config.mjs';
import { dateWindow, todayIso } from './dates.mjs';
import { renderHtml } from './report.mjs';

const config = await loadConfig();
const startDate = config.startDateOverride || todayIso(config.tracker.timezone);
const dates = dateWindow({
  startDate,
  daysAhead: config.tracker.window.daysAhead,
  nights: config.tracker.stay.nights,
  includeToday: config.tracker.window.includeToday
});
const snapshot = {
  title: config.tracker.report.title,
  runStartedAt: new Date().toISOString(),
  timezone: config.tracker.timezone,
  stay: config.tracker.stay,
  dateWindow: dates,
  hotels: config.hotels.map(({ id, name }) => ({ id, name })),
  results: []
};
const html = renderHtml(snapshot);
const port = Number(process.env.PREVIEW_PORT || 4173);

createServer((request, response) => {
  if (request.url === '/' || request.url === '/index.html') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(html);
    return;
  }
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Not found');
}).listen(port, '127.0.0.1', () => {
  console.log(`Hotel tracker preview: http://127.0.0.1:${port}`);
});
