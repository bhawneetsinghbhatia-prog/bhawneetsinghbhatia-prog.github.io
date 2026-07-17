import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dateWindow, todayIso } from '../src/dates.mjs';

test('adds days across month boundaries', () => {
  assert.equal(addDays('2026-07-31', 1), '2026-08-01');
});

test('today plus 30 days is inclusive and creates 31 check-in dates', () => {
  const dates = dateWindow({ startDate: '2026-07-17', daysAhead: 30, nights: 1, includeToday: true });
  assert.equal(dates.length, 31);
  assert.deepEqual(dates[0], { checkIn: '2026-07-17', checkOut: '2026-07-18', nights: 1 });
  assert.deepEqual(dates.at(-1), { checkIn: '2026-08-16', checkOut: '2026-08-17', nights: 1 });
});

test('uses the requested timezone for today', () => {
  assert.equal(todayIso('Asia/Kolkata', new Date('2026-07-16T20:00:00Z')), '2026-07-17');
});
