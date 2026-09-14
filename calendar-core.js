(function (root) {
  'use strict';
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  function today(zone = 'Asia/Kolkata', now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    return ['year', 'month', 'day'].map(key => parts.find(p => p.type === key).value).join('-');
  }
  function validate(feed) {
    if (feed?.version !== 1 || !Array.isArray(feed.tasks)) throw new Error('Unsupported task feed');
    today(feed.timezone);
    const ids = new Set();
    for (const t of feed.tasks) {
      if (!t.id || typeof t.id !== 'string' || ids.has(t.id) || typeof t.title !== 'string' || !t.title.trim() || (t.date !== null && !validDate(t.date)) || !['pending', 'completed', 'cancelled'].includes(t.status)) throw new Error('Invalid or duplicate task in feed');
      ids.add(t.id);
    }
    return feed;
  }
  function scheduledPending(items) {
    return items.filter(t => t.status === 'pending' && t.id.startsWith('outlook-')).map(t => ({ ...t, origin: 'Scheduled Outlook task', key: 'github:' + t.id }));
  }
  function status(t, day) {
    if (t.status === 'completed' || t.status === 'cancelled') return t.status;
    if (!validDate(t.date)) return 'undated';
    return t.date < day ? 'overdue' : t.date === day ? 'today' : 'upcoming';
  }
  function filter(items, scope, query, day) {
    return items.filter(t => (scope === 'all' || status(t, day) === scope) && [t.title, t.desc, t.category, t.assignedTo, t.origin].join(' ').toLowerCase().includes(query.toLowerCase())).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.title.localeCompare(b.title));
  }
  const api = { validDate, today, validate, scheduledPending, status, filter };
  root.WorkCalendar = api;
})(globalThis);
