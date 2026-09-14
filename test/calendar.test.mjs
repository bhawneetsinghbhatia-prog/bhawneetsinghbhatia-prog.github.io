import test from 'node:test';
import assert from 'node:assert/strict';
import '../calendar-core.js';
const C = globalThis.WorkCalendar;
test('calendar uses India date at UTC day boundary and validates leap dates', () => {
  assert.equal(C.today('Asia/Kolkata', new Date('2026-09-10T20:00:00Z')), '2026-09-11');
  assert.equal(C.validDate('2026-02-29'), false);
  assert.equal(C.validDate('2028-02-29'), true);
});
test('completed and cancelled past tasks never become overdue; undated tasks remain visible', () => {
  for (const status of ['completed', 'cancelled']) assert.equal(C.status({ status, date: '2026-01-01' }, '2026-09-11'), status);
  assert.equal(C.status({ date: null }, '2026-09-11'), 'undated');
  assert.equal(C.status({ date: '2026-09-10' }, '2026-09-11'), 'overdue');
  assert.equal(C.status({ date: '2026-09-11' }, '2026-09-11'), 'today');
  assert.equal(C.status({ date: '2026-09-12' }, '2026-09-11'), 'upcoming');
});
test('calendar accepts only pending records produced by the scheduled Outlook task', () => {
  const items = [
    { id: 'outlook-1', title: 'Scheduled deadline', date: '2026-09-11', status: 'pending' },
    { id: 'outlook-2', title: 'Finished deadline', date: '2026-09-10', status: 'completed' },
    { id: 'manual-1', title: 'Pendency tracker task', date: '2026-09-12', status: 'pending' }
  ];
  assert.deepEqual(C.scheduledPending(items).map(t => t.id), ['outlook-1']);
  assert.equal(C.scheduledPending(items)[0].origin, 'Scheduled Outlook task');
});
test('feed rejects duplicate IDs, malformed dates, invalid states and timezone', () => {
  const t = { id: 'one', title: 'Test', date: null, status: 'pending' };
  const feed = { version: 1, timezone: 'Asia/Kolkata', tasks: [t] };
  assert.equal(C.validate(feed), feed);
  assert.throws(() => C.validate({ ...feed, tasks: [t, t] }));
  assert.throws(() => C.validate({ ...feed, tasks: [{ ...t, date: '2026-02-30' }] }));
  assert.throws(() => C.validate({ ...feed, timezone: 'Not/AZone' }));
  assert.throws(() => C.validate({ ...feed, tasks: [{ ...t, status: 'unknown' }] }));
});
test('filters all historical and future dates independently of the displayed month', () => {
  const items = [{ title: 'Audit', date: '2025-12-01' }, { title: 'AUDIT follow-up', date: '2027-01-01' }, { title: 'Meeting', date: '2026-09-11' }];
  assert.equal(C.filter(items, 'all', 'audit', '2026-09-11').length, 2);
  assert.equal(C.filter(items, 'upcoming', 'audit', '2026-09-11')[0].date, '2027-01-01');
});
