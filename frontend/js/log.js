/* log.js — full CRUD daily log editor */

let currentDate = today();
let existingLog  = null;
const state = {};  // habit toggles state

// ── Init from URL param ────────────────────────────────────────────
const urlDate = new URLSearchParams(location.search).get('date');
if (urlDate) currentDate = urlDate;

// ── DOM refs ───────────────────────────────────────────────────────
const dateInput    = document.getElementById('date-input');
const ringPct      = document.getElementById('ring-pct');
const ringEl       = document.getElementById('ring-svg');
const logDisplay   = document.getElementById('log-date-display');
const logStatus    = document.getElementById('log-status');
const habitsGrid   = document.getElementById('habits-grid');
const notesArea    = document.getElementById('notes-area');
const saveBtn      = document.getElementById('save-btn');
const deleteBtn    = document.getElementById('delete-btn');
const moodGrid     = document.getElementById('mood-grid');

// ── Render habit cards ─────────────────────────────────────────────
function renderHabits() {
  habitsGrid.innerHTML = HABITS.map(h => {
    const done = !!state[h.key];
    return `<div class="habit-card${done?' done':''}" data-key="${h.key}">
      <div class="habit-emoji">${h.emoji}</div>
      <div class="habit-info">
        <div class="habit-name">${h.name}</div>
        <div class="habit-sub">${h.sub}</div>
      </div>
      <div class="habit-check">${done ? '✓' : ''}</div>
    </div>`;
  }).join('');

  habitsGrid.querySelectorAll('.habit-card').forEach(card => {
    card.addEventListener('click', () => {
      const k = card.dataset.key;
      state[k] = !state[k];
      renderHabits();
      updateRing();
    });
  });
}

function updateRing() {
  const done = HABITS.filter(h => state[h.key]).length;
  const pct  = Math.round((done / 10) * 100);
  ringPct.textContent = pct + '%';
  // ring SVG with r=42
  const r = 42, circ = 2 * Math.PI * r;
  const fill = ringEl.querySelector('.ring-fill');
  fill.style.strokeDasharray  = circ;
  fill.style.strokeDashoffset = circ - (circ * pct / 100);
}

// ── Mood ───────────────────────────────────────────────────────────
let selectedMood = '';
moodGrid.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    moodGrid.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedMood = btn.dataset.mood;
  });
});
function setMood(m) {
  selectedMood = m || '';
  moodGrid.querySelectorAll('.mood-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.mood === m);
  });
}

// ── Load log for date ──────────────────────────────────────────────
async function loadLog(date) {
  currentDate = date;
  dateInput.value = date;
  logDisplay.textContent = toDisplay(date);

  // Reset state
  HABITS.forEach(h => { state[h.key] = false; });
  notesArea.value = '';
  setMood('');
  existingLog = null;

  try {
    const log = await apiFetch(`/api/habits/${date}`);
    existingLog = log;
    HABITS.forEach(h => { state[h.key] = !!log[h.key]; });
    notesArea.value = log.daily_notes || '';
    setMood(log.mood);
    logStatus.textContent = `Saved — ${log.daily_percentage}% complete`;
    deleteBtn.style.display = 'flex';
  } catch(e) {
    logStatus.textContent = 'No log yet for this day';
    deleteBtn.style.display = 'none';
  }

  renderHabits();
  updateRing();
}

// ── Save ───────────────────────────────────────────────────────────
saveBtn.addEventListener('click', async () => {
  saveBtn.disabled = true;
  saveBtn.textContent = '⏳ Saving…';
  try {
    const payload = { date: currentDate, daily_notes: notesArea.value, mood: selectedMood };
    HABITS.forEach(h => { payload[h.key] = !!state[h.key]; });

    if (existingLog) {
      await apiFetch(`/api/habits/${currentDate}`, { method:'PUT', body:JSON.stringify(payload) });
    } else {
      await apiFetch('/api/habits', { method:'POST', body:JSON.stringify(payload) });
    }
    toast('Log saved! 🎉', 'success');
    await loadLog(currentDate);
  } catch(e) {
    toast(e.message || 'Save failed', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save Log';
  }
});

// ── Delete ─────────────────────────────────────────────────────────
deleteBtn.addEventListener('click', async () => {
  if (!confirm(`Delete log for ${currentDate}?`)) return;
  try {
    await apiFetch(`/api/habits/${currentDate}`, { method:'DELETE' });
    toast('Log deleted', 'info');
    await loadLog(currentDate);
  } catch(e) {
    toast(e.message, 'error');
  }
});

// ── Date navigation ────────────────────────────────────────────────
dateInput.addEventListener('change', () => loadLog(dateInput.value));
document.getElementById('date-prev').addEventListener('click', () => {
  const d = new Date(currentDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  loadLog(toISO(d));
});
document.getElementById('date-next').addEventListener('click', () => {
  const d = new Date(currentDate + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  loadLog(toISO(d));
});
document.getElementById('goto-today').addEventListener('click', () => loadLog(today()));

// ── Keyboard shortcut ──────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveBtn.click();
  }
});

// ── Boot ───────────────────────────────────────────────────────────
loadLog(currentDate);
