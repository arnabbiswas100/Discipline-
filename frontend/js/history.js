/* history.js — monthly calendar with day detail modal */

let curYear  = new Date().getFullYear();
let curMonth = new Date().getMonth() + 1; // 1-12
let monthData = {};  // { 'YYYY-MM-DD': row }

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

async function loadMonth(year, month) {
  curYear = year; curMonth = month;
  document.getElementById('cal-title').textContent =
    `${MONTH_NAMES[month-1]} ${year}`;

  try {
    const rows = await apiFetch(`/api/habits?year=${year}&month=${month}`);
    monthData = {};
    rows.forEach(r => { monthData[r.date.split('T')[0]] = r; });
  } catch(e) { monthData = {}; }

  // Monthly stats
  try {
    const stats = await apiFetch(`/api/habits/stats/monthly?year=${year}`);
    const m = stats.find(s => s.month === month);
    document.getElementById('h-avg').textContent     = m ? m.avg_percentage + '%' : '0%';
    document.getElementById('h-good').textContent    = m ? m.good_days : '0';
    document.getElementById('h-logged').textContent  = m ? m.days_logged : '0';
  } catch(e) {}

  renderCalendar(year, month);
}

function renderCalendar(year, month) {
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  // Day headers
  DAY_LABELS.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-day-label';
    el.textContent = d;
    grid.appendChild(el);
  });

  const todayStr   = today();
  const firstDay   = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-cell empty';
    grid.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const row = monthData[iso];
    const pct = row ? row.daily_percentage : null;

    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (row ? ' logged' : '') + (iso === todayStr ? ' today-cal' : '');

    const bar  = document.createElement('div'); bar.className  = 'pct-bar';
    const fill = document.createElement('div'); fill.className = 'pct-fill';

    if (pct !== null) {
      fill.style.width = pct + '%';
      fill.classList.add(pct >= 70 ? 'green' : pct >= 40 ? 'yellow' : 'red');
    }
    bar.appendChild(fill);

    cell.innerHTML = `<span>${d}</span>`;
    if (pct !== null) cell.innerHTML += `<small style="font-size:0.65rem;color:var(--text3)">${pct}%</small>`;
    cell.appendChild(bar);

    cell.addEventListener('click', () => openModal(iso, row));
    grid.appendChild(cell);
  }
}

// ── Modal ──────────────────────────────────────────────────────────
function openModal(iso, row) {
  document.getElementById('modal-date').textContent = toDisplay(iso);
  document.getElementById('modal-edit-btn').href = `log.html?date=${iso}`;
  const body = document.getElementById('modal-body');

  if (!row) {
    body.innerHTML = `<p class="text-muted">No log recorded for this day.</p>
      <p class="mt-8"><a href="log.html?date=${iso}" class="btn btn-primary mt-16">✏️ Create Log</a></p>`;
  } else {
    const habitList = HABITS.map(h =>
      `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
        <span>${h.emoji}</span>
        <span style="flex:1;font-size:0.85rem">${h.name}</span>
        <span>${row[h.key] ? '✅' : '❌'}</span>
      </div>`
    ).join('');
    body.innerHTML = `
      <div style="margin-bottom:16px">
        <span style="font-size:2rem;font-weight:900">${row.daily_percentage}%</span>
        <span class="text-muted text-sm" style="margin-left:8px">completion</span>
        ${row.mood ? `<span style="font-size:1.5rem;margin-left:12px">${row.mood}</span>` : ''}
      </div>
      ${habitList}
      ${row.daily_notes ? `<div class="mt-16 text-sm text-muted" style="white-space:pre-wrap">${row.daily_notes}</div>` : ''}
    `;
  }

  document.getElementById('day-modal').classList.add('open');
}

document.getElementById('modal-close').addEventListener('click',  () => document.getElementById('day-modal').classList.remove('open'));
document.getElementById('modal-close2').addEventListener('click', () => document.getElementById('day-modal').classList.remove('open'));
document.getElementById('day-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('day-modal')) document.getElementById('day-modal').classList.remove('open');
});

// ── Navigation ─────────────────────────────────────────────────────
document.getElementById('cal-prev').addEventListener('click', () => {
  curMonth--; if (curMonth < 1) { curMonth = 12; curYear--; }
  loadMonth(curYear, curMonth);
});
document.getElementById('cal-next').addEventListener('click', () => {
  curMonth++; if (curMonth > 12) { curMonth = 1; curYear++; }
  loadMonth(curYear, curMonth);
});
document.getElementById('cal-today').addEventListener('click', () => {
  const n = new Date();
  loadMonth(n.getFullYear(), n.getMonth() + 1);
});

loadMonth(curYear, curMonth);
