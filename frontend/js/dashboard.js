/* dashboard.js — today widget + heatmap */

let currentYear = new Date().getFullYear();
let allData = {};  // { 'YYYY-MM-DD': row }

async function loadDashboard() {
  // Set greeting & date
  const now = new Date();
  const h = now.getHours();
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('today-greeting').textContent = `${greet}, Alnos 👋`;
  document.getElementById('today-date-label').textContent = toDisplay(today());

  // Load streak stats
  try {
    const stats = await apiFetch('/api/habits/stats/streak');
    document.getElementById('stat-streak').textContent = stats.current_streak + ' days';
    document.getElementById('stat-best').textContent = stats.best_streak + ' days';
    document.getElementById('stat-good-days').textContent = stats.good_days;
  } catch(e) { console.warn('Stats error', e); }

  // Load this month avg
  try {
    const monthly = await apiFetch(`/api/habits/stats/monthly?year=${now.getFullYear()}`);
    const thisMonth = monthly.find(m => m.month === now.getMonth() + 1);
    document.getElementById('stat-month-avg').textContent =
      thisMonth ? thisMonth.avg_percentage + '%' : '0%';
  } catch(e) {}

  // Load today's log
  try {
    const log = await apiFetch(`/api/habits/${today()}`);
    renderHabits(log);
    renderRing(log.daily_percentage);
  } catch(e) {
    renderHabits(null);
    renderRing(0);
  }

  // Load heatmap
  await loadHeatmap(currentYear);
}

function renderRing(pct) {
  document.getElementById('ring-pct').textContent = pct + '%';
  setRing(document.getElementById('ring-svg'), pct);
}

function renderHabits(log) {
  const grid = document.getElementById('habits-grid');
  grid.innerHTML = HABITS.map(h => {
    const done = log ? !!log[h.key] : false;
    return `<div class="habit-card${done?' done':''}">
      <div class="habit-emoji">${h.emoji}</div>
      <div class="habit-info">
        <div class="habit-name">${h.name}</div>
        <div class="habit-sub">${h.sub}</div>
      </div>
      <div class="habit-check">${done ? '✓' : ''}</div>
    </div>`;
  }).join('');
}

async function loadHeatmap(year) {
  document.getElementById('year-label').textContent = year;
  try {
    const rows = await apiFetch(`/api/habits?year=${year}`);
    allData = {};
    rows.forEach(r => { allData[r.date.split('T')[0]] = r; });
    renderHeatmap(year);
  } catch(e) { console.warn('Heatmap error', e); }
}

function renderHeatmap(year) {
  const grid = document.getElementById('heatmap-grid');
  const monthLabels = document.getElementById('heatmap-months');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  monthLabels.innerHTML = months.map(m => `<div class="heatmap-month-label">${m}</div>`).join('');

  // Build a column-per-week grid
  grid.innerHTML = '';
  const start = new Date(`${year}-01-01`);
  const end   = new Date(`${year}-12-31`);
  const todayStr = today();

  // Pad to Monday
  let cur = new Date(start);
  const dayOfWeek = cur.getDay(); // 0=Sun
  cur.setDate(cur.getDate() - dayOfWeek); // start from Sunday

  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);

  while (cur <= end || cur.getDay() !== 0) {
    const col = document.createElement('div');
    col.className = 'heatmap-col';

    for (let d = 0; d < 7; d++) {
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      const iso = toISO(cur);
      const row = allData[iso];

      if (cur < start || cur > end) {
        cell.style.opacity = '0';
      } else {
        const pct = row ? row.daily_percentage : 0;
        cell.setAttribute('data-pct', pctToHeatClass(pct));
        cell.title = `${iso}: ${pct}%`;
        if (iso === todayStr) cell.classList.add('today-cell');
        cell.addEventListener('mouseenter', (e) => {
          tooltip.textContent = `${toDisplay(iso)} — ${pct}%`;
          tooltip.style.display = 'block';
        });
        cell.addEventListener('mousemove', (e) => {
          tooltip.style.left = (e.clientX + 12) + 'px';
          tooltip.style.top  = (e.clientY - 30) + 'px';
        });
        cell.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
        cell.addEventListener('click', () => {
          window.location.href = `log.html?date=${iso}`;
        });
      }

      col.appendChild(cell);
      cur.setDate(cur.getDate() + 1);
    }
    grid.appendChild(col);
    if (cur > end) break;
  }
}

// Year nav
document.getElementById('year-prev').addEventListener('click', () => {
  currentYear--;
  loadHeatmap(currentYear);
});
document.getElementById('year-next').addEventListener('click', () => {
  currentYear++;
  loadHeatmap(currentYear);
});

loadDashboard();
