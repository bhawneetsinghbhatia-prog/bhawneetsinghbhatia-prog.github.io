/* This view contains only sanitized pending items from the scheduled Outlook task. */
(function () {
  'use strict';
  const C = WorkCalendar;
  let feed = { timezone: 'Asia/Kolkata', tasks: [], updatedAt: null };
  let month = C.today().slice(0, 7), selected = '', loaded = false, loading = false, error = '';
  const $ = id => document.getElementById(id);
  function element(tag, text, cls) {
    const el = document.createElement(tag); el.textContent = text;
    if (cls) el.className = cls;
    return el;
  }
  async function load() {
    if (loading) return;
    loading = true; error = ''; render();
    try {
      const response = await fetch('./data/office-tasks.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Feed unavailable');
      feed = C.validate(await response.json()); loaded = true;
    } catch (e) { error = 'Could not refresh the scheduled-task feed. ' + (loaded ? 'Showing the last loaded copy.' : 'Please try again.'); }
    finally { loading = false; render(); }
  }
  function render() {
    if (!$('cal-grid')) return;
    const day = C.today(feed.timezone);
    const items = C.scheduledPending(feed.tasks);
    const filtered = C.filter(items, $('cal-filter').value, $('cal-search').value, day);
    $('cal-sync').textContent = error || (loading ? 'Refreshing scheduled pendency…' : feed.updatedAt ? 'Scheduled pendency updated ' + feed.updatedAt : 'Waiting for the next scheduled Outlook update.');
    $('cal-zone').textContent = 'Dates shown in ' + feed.timezone + '. Pending dates: red = overdue, orange = today, green = future.';
    $('cal-refresh').disabled = loading;
    $('cal-summary').textContent = ['overdue', 'today', 'upcoming', 'undated'].map(s => items.filter(t => C.status(t, day) === s).length + ' ' + (s === 'today' ? 'due today' : s === 'undated' ? 'without due date' : s)).join(' · ');
    const first = new Date(month + '-01T12:00:00Z');
    $('cal-month').textContent = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
    const grid = $('cal-grid'); grid.replaceChildren();
    for (const name of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) grid.append(element('div', name, 'cal-weekday'));
    for (let i = 0; i < (first.getUTCDay() + 6) % 7; i++) grid.append(element('div', ''));
    const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    for (let n = 1; n <= count; n++) {
      const date = month + '-' + String(n).padStart(2, '0');
      const matches = filtered.filter(t => t.date === date).length;
      const pending = filtered.filter(t => t.date === date && ['overdue', 'today', 'upcoming'].includes(C.status(t, day))).length;
      const dateState = date < day ? 'overdue' : date === day ? 'today' : 'upcoming';
      const cell = element('button', String(n), 'cal-day' + (date === day ? ' cal-today' : ''));
      cell.type = 'button'; cell.setAttribute('aria-label', date + ', ' + matches + ' tasks');
      cell.setAttribute('aria-pressed', String(selected === date));
      if (date === day) cell.setAttribute('aria-current', 'date');
      if (matches) {
        const marker = element('span', matches + (matches === 1 ? ' task' : ' tasks'), pending ? 'cal-date-marker cal-date-' + dateState : '');
        if (pending) marker.title = pending + ' pending: ' + (dateState === 'upcoming' ? 'future' : dateState === 'today' ? 'due today' : 'overdue');
        cell.append(marker);
      }
      cell.addEventListener('click', () => { selected = selected === date ? '' : date; render(); }); grid.append(cell);
    }
    $('cal-clear').hidden = !selected;
    const visible = selected ? filtered.filter(t => t.date === selected) : filtered;
    $('cal-list-title').textContent = (selected || 'All dates') + ' · ' + visible.length + (visible.length === 1 ? ' task' : ' tasks');
    const list = $('cal-list'); list.replaceChildren();
    if (!visible.length) list.append(element('p', selected ? 'No scheduled pending tasks on this date. Choose All dates to see the full list.' : 'No scheduled pending tasks match this view.', 'cal-empty'));
    for (const t of visible) {
      const card = element('article', '', 'cal-task'), state = C.status(t, day);
      card.append(element('span', state, 'cal-badge ' + state), element('h3', t.title));
      card.append(element('p', [t.date || 'No due date', t.dueTime, t.origin, t.assignedTo].filter(Boolean).join(' · '), 'cal-muted' + (['overdue', 'today', 'upcoming'].includes(state) ? ' cal-date-marker cal-date-' + state : '')));
      if (t.isDateRange && t.startDate) card.append(element('p', 'From ' + t.startDate + ' to ' + t.date, 'cal-muted'));
      if (t.desc) card.append(element('p', t.desc, 'cal-muted'));
      list.append(card);
    }
  }
  function move(delta) {
    const d = new Date(month + '-01T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + delta); month = d.toISOString().slice(0, 7); selected = ''; render();
  }
  $('cal-prev').addEventListener('click', () => move(-1));
  $('cal-next').addEventListener('click', () => move(1));
  $('cal-today').addEventListener('click', () => { month = C.today(feed.timezone).slice(0, 7); selected = C.today(feed.timezone); render(); });
  $('cal-clear').addEventListener('click', () => { selected = ''; render(); });
  $('cal-filter').addEventListener('change', render);
  $('cal-search').addEventListener('input', render);
  $('cal-refresh').addEventListener('click', load);
  window.renderWorkCalendar = render;
  window.openWorkCalendar = () => { render(); if (!loaded) load(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && currentTab === 'calendar') render(); });
  render();
})();
