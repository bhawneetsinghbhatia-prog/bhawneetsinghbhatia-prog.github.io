import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './config.mjs';

const money = (amount, currency = 'INR') => amount == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
const escapeHtml = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function bestByHotelAndDate(results) {
  const best = new Map();
  for (const result of results.filter((item) => item.status === 'VERIFIED')) {
    const key = `${result.hotelId}|${result.checkIn}`;
    if (!best.has(key) || result.finalAmount < best.get(key).finalAmount) best.set(key, result);
  }
  return best;
}

function changeText(item) {
  if (item.changeAmount == null) return 'New';
  if (item.changeAmount === 0) return 'No change';
  const arrow = item.changeAmount > 0 ? '▲' : '▼';
  return `${arrow} ${money(Math.abs(item.changeAmount), item.currency)} (${Math.abs(item.changePercent).toFixed(1)}%)`;
}

export function renderMarkdown(snapshot) {
  const best = bestByHotelAndDate(snapshot.results);
  const lines = [
    `# ${snapshot.title}`,
    '',
    `Checked: ${snapshot.runStartedAt} · Stay: ${snapshot.stay.nights} night(s) · ${snapshot.stay.adults} adults + ${snapshot.stay.children.length} child (age ${snapshot.stay.children.join(', ')})`,
    '',
    '| Check-in | Hotel | Lowest verified final price | Best website | Change | Booking |',
    '|---|---|---:|---|---:|---|'
  ];
  for (const stay of snapshot.dateWindow) {
    for (const hotel of snapshot.hotels) {
      const item = best.get(`${hotel.id}|${stay.checkIn}`);
      if (item) {
        lines.push(`| ${stay.checkIn} | ${hotel.name} | ${money(item.finalAmount, item.currency)} | ${item.sourceName} | ${changeText(item)} | [Book](${item.bookingUrl}) |`);
      } else {
        lines.push(`| ${stay.checkIn} | ${hotel.name} | Not verified | — | — | — |`);
      }
    }
  }

  const failures = snapshot.results.filter((item) => item.status !== 'VERIFIED');
  lines.push('', '## Unverified checks', '', '| Date | Hotel | Website | Status | Reason |', '|---|---|---|---|---|');
  for (const item of failures) {
    lines.push(`| ${item.checkIn} | ${item.hotelName} | ${item.sourceName} | ${item.status} | ${(item.failureReason || '').replaceAll('|', '\\|')} |`);
  }
  lines.push('', '> “Not verified” means no confirmed final payable price was obtained. Candidate or estimated prices are deliberately excluded.', '');
  return lines.join('\n');
}

export function renderHtml(snapshot) {
  const best = bestByHotelAndDate(snapshot.results);
  const verifiedCount = snapshot.results.filter((item) => item.status === 'VERIFIED').length;
  const unverifiedCount = snapshot.results.filter((item) => item.status !== 'VERIFIED').length;
  const rows = snapshot.dateWindow.flatMap((stay) => snapshot.hotels.map((hotel) => {
    const item = best.get(`${hotel.id}|${stay.checkIn}`);
    return `<tr><td>${stay.checkIn}</td><td>${escapeHtml(hotel.name)}</td><td>${item ? money(item.finalAmount, item.currency) : '<span class="muted">Not verified</span>'}</td><td>${item ? escapeHtml(item.sourceName) : '—'}</td><td>${item ? escapeHtml(changeText(item)) : '—'}</td><td>${item ? `<a href="${escapeHtml(item.bookingUrl)}">Book</a>` : '—'}</td></tr>`;
  })).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(snapshot.title)}</title><style>:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#17211d;background:#f4f7f5}*{box-sizing:border-box}body{margin:0}.hero{background:linear-gradient(135deg,#123c34,#256b59);color:white;padding:48px max(24px,calc((100vw - 1180px)/2)) 76px}.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#b9ddd3;font-weight:700}.hero h1{font-size:clamp(30px,5vw,52px);letter-spacing:-.04em;margin:10px 0 8px}.hero p{margin:0;color:#d4e9e3}.wrap{max-width:1180px;margin:-42px auto 48px;padding:0 24px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.card{background:white;border:1px solid #dfe8e3;border-radius:14px;padding:19px;box-shadow:0 8px 24px #163b3120}.card span{display:block;color:#66756f;font-size:13px;margin-bottom:7px}.card strong{font-size:25px}.panel{margin-top:22px;background:white;border:1px solid #dfe8e3;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px #163b3114}.panel-head{display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid #e5ece8}.panel-head h2{font-size:18px;margin:0}.badge{font-size:12px;background:#eef5f2;color:#406057;border-radius:999px;padding:7px 10px}.table-wrap{overflow:auto;max-height:62vh}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:13px 18px;border-bottom:1px solid #edf1ef;text-align:left;white-space:nowrap}th{position:sticky;top:0;background:#fafcfb;color:#52635d;font-size:12px;text-transform:uppercase;letter-spacing:.04em}tbody tr:hover{background:#f7faf8}.muted{color:#84908c}.note{color:#64716c;font-size:13px;padding:18px 22px;margin:0;background:#fafcfb}a{color:#176953;font-weight:650}@media(max-width:760px){.cards{grid-template-columns:repeat(2,1fr)}.hero{padding-top:34px}.wrap{padding:0 14px}}</style></head><body><header class="hero"><div class="eyebrow">Daily verified-rate monitor</div><h1>${escapeHtml(snapshot.title)}</h1><p>Fresh public prices, compared across official and travel websites.</p></header><main class="wrap"><section class="cards"><div class="card"><span>Check-in dates</span><strong>${snapshot.dateWindow.length}</strong></div><div class="card"><span>Hotels tracked</span><strong>${snapshot.hotels.length}</strong></div><div class="card"><span>Verified offers</span><strong>${verifiedCount}</strong></div><div class="card"><span>Unverified checks</span><strong>${unverifiedCount}</strong></div></section><section class="panel"><div class="panel-head"><h2>Date-wise lowest verified rates</h2><span class="badge">${snapshot.stay.nights} night(s) · ${snapshot.stay.adults} adults + ${snapshot.stay.children.length} child, age ${snapshot.stay.children.join(', ')}</span></div><div class="table-wrap"><table><thead><tr><th>Check-in</th><th>Hotel</th><th>Lowest verified final price</th><th>Best website</th><th>Change</th><th>Booking</th></tr></thead><tbody>${rows}</tbody></table></div><p class="note">Last checked ${escapeHtml(snapshot.runStartedAt)}. Estimated and incomplete prices are never shown as confirmed.</p></section></main></body></html>`;
}

export async function writeReports(snapshot) {
  const directory = path.join(ROOT, 'reports');
  await mkdir(directory, { recursive: true });
  const markdown = renderMarkdown(snapshot);
  const html = renderHtml(snapshot);
  const name = snapshot.runStartedAt.slice(0, 10);
  await Promise.all([
    writeFile(path.join(directory, 'latest.md'), markdown),
    writeFile(path.join(directory, 'latest.html'), html),
    writeFile(path.join(directory, `${name}.md`), markdown),
    writeFile(path.join(directory, `${name}.html`), html)
  ]);
  return { markdown, html };
}
