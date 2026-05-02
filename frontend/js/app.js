/* ── API Base ──────────────────────────────────────────────────── */
const API = '';  // same origin; change to 'http://localhost:3000' for separate dev

/* ── Fetch wrapper ─────────────────────────────────────────────── */
async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.status === 204 ? null : await res.json();
  } catch (e) {
    throw e;
  }
}

/* ── Date helpers ──────────────────────────────────────────────── */
function toISO(date) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}
function toDisplay(isoStr) {
  const d = new Date(isoStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}
function today() { return toISO(new Date()); }

/* ── Theme ─────────────────────────────────────────────────────── */
function initTheme() {
  const saved = localStorage.getItem('discipline-theme') || 'dark';
  applyTheme(saved);
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    const current = document.body.classList.contains('light') ? 'dark' : 'light';
    applyTheme(current);
    localStorage.setItem('discipline-theme', current);
  });
}
function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
}

/* ── Active Nav Link ───────────────────────────────────────────── */
function initNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === page ||
      (page === '' && a.getAttribute('href') === 'index.html'));
  });
}

/* ── Toast notifications ───────────────────────────────────────── */
function toast(msg, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  el.innerHTML = `${icons[type]||''} ${msg}`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    el.addEventListener('animationend', () => el.remove());
  }, duration);
}

/* ── Habit definitions ─────────────────────────────────────────── */
const HABITS = [
  { key:'sleep',         emoji:'💤', name:'Sleep 6-7 Hours',          sub:'22:00 – 05:00' },
  { key:'prayer',        emoji:'🙏', name:'Prayer & Reflection',       sub:'Daily Prayers' },
  { key:'eat_healthy',   emoji:'🥗', name:'Eat Healthy',               sub:'2000-2200 cal' },
  { key:'social_media',  emoji:'📱', name:'Social Media Limit',        sub:'≤ 2-3 hrs, no scroll' },
  { key:'no_bad_habits', emoji:'🚫', name:'No Bad Habits',             sub:'No porn/alcohol/drugs/smoke' },
  { key:'water',         emoji:'💧', name:'Drink Water',               sub:'3 – 3.5L per day' },
  { key:'study',         emoji:'💻', name:'Study',                     sub:'> 2-5 hours focused' },
  { key:'exercise',      emoji:'🏋️', name:'Exercise',                  sub:'30-45 minutes' },
  { key:'read',          emoji:'📖', name:'Read',                      sub:'30 min English' },
  { key:'journal',       emoji:'🖋️', name:'Journal & Self-Reflect',   sub:'Diary daily' },
];

/* ── Progress ring helper ──────────────────────────────────────── */
function setRing(svgEl, pct) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const fill = svgEl.querySelector('.ring-fill');
  fill.style.strokeDasharray = circ;
  fill.style.strokeDashoffset = circ - (circ * pct / 100);
}

/* ── Heatmap colour helper ─────────────────────────────────────── */
function pctToHeatClass(pct) {
  if (pct === 0) return '0';
  if (pct < 40)  return 'low';
  if (pct < 70)  return 'mid';
  if (pct < 90)  return 'good';
  return 'great';
}

/* ── Init shared ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
});
