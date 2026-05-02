/* milestones.js */

let streakData = { current_streak: 0, best_streak: 0 };

async function loadMilestones() {
  // Load streak
  try {
    streakData = await apiFetch('/api/habits/stats/streak');
  } catch(e) {}

  // Load milestones
  try {
    const milestones = await apiFetch('/api/milestones');
    renderNextMilestone(milestones);
    renderMilestones(milestones);
  } catch(e) {
    document.getElementById('milestones-grid').innerHTML =
      '<p class="text-muted">Failed to load milestones.</p>';
  }
}

function renderNextMilestone(milestones) {
  const cur = streakData.current_streak || 0;
  const next = milestones.find(m => m.streak_days > cur);

  if (!next) {
    document.getElementById('next-days').textContent = '🏅 All unlocked!';
    document.getElementById('next-progress-fill').style.width = '100%';
    return;
  }

  const prev = milestones.filter(m => m.streak_days <= cur).pop();
  const prevDays = prev ? prev.streak_days : 0;
  const range = next.streak_days - prevDays;
  const progress = cur - prevDays;
  const pct = Math.round((progress / range) * 100);

  document.getElementById('next-days').textContent = next.streak_days + ' Days';
  document.getElementById('next-label').textContent =
    `(${cur} / ${next.streak_days} — ${next.streak_days - cur} more to go)`;
  document.getElementById('next-progress-text').textContent = pct + '%';
  document.getElementById('next-progress-fill').style.width = pct + '%';
}

function renderMilestones(milestones) {
  const cur = streakData.current_streak || 0;
  const grid = document.getElementById('milestones-grid');

  grid.innerHTML = milestones.map(m => {
    const achieved = m.achieved_date || cur >= m.streak_days;
    const labels = {
      30:'One Month', 50:'50 Days', 75:'75 Days', 100:'100 Days',
      200:'200 Days', 365:'One Year', 500:'500 Days', 730:'Two Years',
      900:'900 Days', 1095:'Three Years'
    };

    return `<div class="milestone-card${achieved ? ' achieved' : ''}">
      <div class="milestone-days">${m.streak_days}</div>
      <div class="milestone-label">${labels[m.streak_days] || m.streak_days + ' Days'}</div>
      <div class="milestone-badge ${achieved ? 'badge-achieved' : 'badge-locked'}">
        ${achieved ? '🏅 Achieved' : '🔒 Locked'}
      </div>
      <div class="milestone-edit">
        <input class="milestone-input" type="text"
          placeholder="🎁 Your reward…"
          value="${m.reward || ''}"
          id="reward-${m.id}"/>
        <input class="milestone-input" type="date"
          value="${m.achieved_date ? m.achieved_date.split('T')[0] : ''}"
          id="date-${m.id}"/>
        <input class="milestone-input" type="text"
          placeholder="📝 Notes…"
          value="${m.notes || ''}"
          id="notes-${m.id}"/>
        <button class="milestone-save-btn" onclick="saveMilestone(${m.id})">💾 Save</button>
      </div>
    </div>`;
  }).join('');
}

async function saveMilestone(id) {
  const reward        = document.getElementById(`reward-${id}`).value;
  const achieved_date = document.getElementById(`date-${id}`).value || null;
  const notes         = document.getElementById(`notes-${id}`).value;
  try {
    await apiFetch(`/api/milestones/${id}`, {
      method:'PUT',
      body: JSON.stringify({ reward, achieved_date, notes })
    });
    toast('Milestone saved! 🏅', 'success');
  } catch(e) {
    toast(e.message, 'error');
  }
}

loadMilestones();
