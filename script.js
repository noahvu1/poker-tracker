/* ============================================
   POKER LEDGER — app logic
   All session data lives in this browser's localStorage.
   (SHIFT OPTION F FOR FORMAT)
   ============================================ */

const STORAGE_KEY = 'pokerLedger.sessions.v1';
const LOCAL_VISITS_KEY = 'pokerLedger.localVisits.v1';
const STARTING_NET_KEY = 'pokerLedger.startingNet.v1';
const STARTING_WINS_KEY = 'pokerLedger.startingWins.v1';
const STARTING_LOSSES_KEY = 'pokerLedger.startingLosses.v1';
const STARTING_STREAK_KEY = 'pokerLedger.startingStreak.v1';
const STARTING_NET_SET_KEY = 'pokerLedger.startingNetConfigured.v1';

// Change this to something unique to you before you deploy the site publicly —
// it's the "folder name" your visit count lives under on the free counting
// service. See README.md for details and for swap-in alternatives.
const VISIT_NAMESPACE = 'poker-ledger-change-me';

/* ---------- storage: sessions ---------- */

function loadSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Could not read saved sessions', err);
    return [];
  }
}

function saveSessions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

let sessions = loadSessions();

/* ---------- storage: starting net ---------- */

function getStartingNet() {
  const v = localStorage.getItem(STARTING_NET_KEY);
  return v !== null ? (parseFloat(v) || 0) : 0;
}

function getStartingWins() {
  return parseInt(localStorage.getItem(STARTING_WINS_KEY), 10) || 0;
}

function getStartingLosses() {
  return parseInt(localStorage.getItem(STARTING_LOSSES_KEY), 10) || 0;
}

function getStartingStreak() {
  return parseInt(localStorage.getItem(STARTING_STREAK_KEY), 10) || 0;
}

function setStartingStats(net, wins, losses, streak) {
  localStorage.setItem(STARTING_NET_KEY, String(net));
  localStorage.setItem(STARTING_WINS_KEY, String(wins));
  localStorage.setItem(STARTING_LOSSES_KEY, String(losses));
  localStorage.setItem(STARTING_STREAK_KEY, String(streak));
  localStorage.setItem(STARTING_NET_SET_KEY, 'true');
}

function hasConfiguredStartingNet() {
  return localStorage.getItem(STARTING_NET_SET_KEY) === 'true';
}

/* ---------- helpers ---------- */

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDateLabel(dateStr) {
  return parseLocalDate(dateStr).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric'
  });
}

function formatDateShort(dateStr) {
  return parseLocalDate(dateStr).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function formatMoney(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  })}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function sessionDurationHours(s) {
  return (Number(s.hours) || 0) + (Number(s.minutes) || 0) / 60;
}

function sessionNet(s) {
  return (Number(s.cashOut) || 0) - (Number(s.buyIn) || 0);
}

function sortedSessionsDesc() {
  return [...sessions].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return b.timestamp - a.timestamp;
  });
}

function sortedSessionsAsc() {
  return sortedSessionsDesc().reverse();
}

/* ---------- stats ----------
   The starting net (if any) is folded into Lifetime Net only. Hourly rate,
   win streak, and win/loss are all derived purely from logged sessions, so
   a starting balance never distorts them. */

function computeStats() {
  const sessionsNet = sessions.reduce((sum, s) => sum + sessionNet(s), 0);
  const startingNet = getStartingNet();
  const startingWins = getStartingWins();
  const startingLosses = getStartingLosses();
  const startingStreak = getStartingStreak();
  const totalNet = startingNet + sessionsNet;

  const totalHours = sessions.reduce((sum, s) => sum + sessionDurationHours(s), 0);
  const sessionWins = sessions.filter(s => sessionNet(s) > 0).length;
  const sessionLosses = sessions.filter(s => sessionNet(s) < 0).length;
  const wins = startingWins + sessionWins;
  const losses = startingLosses + sessionLosses;
  const hourlyRate = totalHours > 0 ? sessionsNet / totalHours : 0;

  // Count current win streak from logged sessions
  let streak = 0;
  for (const s of sortedSessionsDesc()) {
    if (sessionNet(s) > 0) streak++;
    else break;
  }
  // If every logged session is a win (streak unbroken since we started tracking),
  // carry over the starting streak too
  if (streak === sessions.length) streak += startingStreak;

  return { totalNet, sessionsNet, startingNet, totalHours, wins, losses, hourlyRate, streak, count: sessions.length };
}

/* ---------- number count-up ---------- */

let lastNetValue = 0;

function animateNumber(el, from, to, formatFn, duration = 550) {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = formatFn(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---------- render ---------- */

function renderAutoDate() {
  document.getElementById('autoDateLabel').textContent = formatDateLabel(getLocalDateString());
}

function renderStats() {
  const stats = computeStats();

  const netEl = document.getElementById('netAmount');
  netEl.classList.toggle('positive', stats.totalNet >= 0);
  netEl.classList.toggle('negative', stats.totalNet < 0);
  animateNumber(netEl, lastNetValue, stats.totalNet, formatMoney);
  lastNetValue = stats.totalNet;

  const startingLink = document.getElementById('editStartingNetBtn');
  startingLink.textContent = stats.startingNet !== 0
    ? `Includes ${formatMoney(stats.startingNet)} starting net \u00B7 Edit`
    : 'Set a starting net';

  document.getElementById('streakValue').textContent =
    stats.streak > 0 ? `${stats.streak} \u{1F525}` : '0';

  const totalGames = stats.wins + stats.losses;
  const winPct = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;
  document.getElementById('winLossValue').textContent = `${stats.wins}\u2013${stats.losses} (${winPct}%)`;

  const hourlyEl = document.getElementById('hourlyValue');
  hourlyEl.classList.toggle('positive', stats.hourlyRate >= 0);
  hourlyEl.classList.toggle('negative', stats.hourlyRate < 0);
  hourlyEl.textContent = `${formatMoney(stats.hourlyRate)}/hr`;

  document.getElementById('sessionsValue').textContent = stats.count;
}

function renderChipTrail() {
  const trail = document.getElementById('chipTrail');
  trail.innerHTML = '';
  const recent = sortedSessionsAsc().slice(-14);

  if (recent.length === 0) {
    trail.innerHTML = '<span class="chip-trail-empty">Your chip trail appears here after your first session.</span>';
    return;
  }

  recent.forEach((s, i) => {
    const net = sessionNet(s);
    const chip = document.createElement('span');
    chip.className = 'chip-dot ' + (net > 0 ? 'win' : net < 0 ? 'loss' : 'push');
    chip.style.animationDelay = `${i * 40}ms`;
    chip.title = `${formatDateShort(s.date)} \u2014 ${formatMoney(net)}`;
    trail.appendChild(chip);
  });
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('emptyState');
  const countLabel = document.getElementById('historyCount');
  const sorted = sortedSessionsDesc();

  const totalHours = sessions.reduce((sum, s) => sum + sessionDurationHours(s), 0);
  countLabel.textContent = `${sorted.length} session${sorted.length === 1 ? '' : 's'} · ${totalHours.toFixed(1)} hrs`;
  list.innerHTML = '';

  if (sorted.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  sorted.forEach(s => {
    const net = sessionNet(s);
    const hours = sessionDurationHours(s);
    const netClass = net > 0 ? 'positive' : net < 0 ? 'negative' : '';

    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `
      <div class="hr-date">
        <span class="hr-date-main">${formatDateShort(s.date)}</span>
        ${s.location ? `<span class="hr-location">${escapeHtml(s.location)}</span>` : ''}
      </div>
      <div class="hr-figures">
        <div class="hr-figure"><span class="hr-label">Buy-in</span><span>${formatMoney(s.buyIn)}</span></div>
        <div class="hr-figure"><span class="hr-label">Cash-out</span><span>${formatMoney(s.cashOut)}</span></div>
        <div class="hr-figure"><span class="hr-label">Duration</span><span>${hours.toFixed(1)}h</span></div>
        <div class="hr-figure"><span class="hr-label">Net</span><span class="${netClass}">${formatMoney(net)}</span></div>
      </div>
      <div class="hr-actions">
        <button type="button" class="icon-btn edit-btn" data-id="${s.id}" aria-label="Edit session">\u270E</button>
        <button type="button" class="icon-btn delete-btn" data-id="${s.id}" aria-label="Delete session">\u{1F5D1}</button>
      </div>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', () => startEdit(btn.dataset.id)));
  list.querySelectorAll('.delete-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteSession(btn.dataset.id)));
}

function renderAll() {
  renderStats();
  renderChipTrail();
  renderHistory();
}

/* ---------- form: create / edit ---------- */

const form = document.getElementById('sessionForm');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

function resetFormToNew() {
  form.reset();
  document.getElementById('sessionId').value = '';
  document.getElementById('dateInput').value = getLocalDateString();
  document.getElementById('hoursInput').value = 0;
  document.getElementById('minutesInput').value = 0;
  formTitle.textContent = "Log Today\u2019s Session";
  submitBtn.textContent = 'Save Session';
  cancelEditBtn.hidden = true;
}

function startEdit(id) {
  const s = sessions.find(s => s.id === id);
  if (!s) return;

  document.getElementById('sessionId').value = s.id;
  document.getElementById('dateInput').value = s.date;
  document.getElementById('locationInput').value = s.location || '';
  document.getElementById('buyInInput').value = s.buyIn;
  document.getElementById('cashOutInput').value = s.cashOut;
  document.getElementById('hoursInput').value = s.hours;
  document.getElementById('minutesInput').value = s.minutes;
  document.getElementById('notesInput').value = s.notes || '';

  formTitle.textContent = 'Edit Session';
  submitBtn.textContent = 'Update Session';
  cancelEditBtn.hidden = false;

  document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deleteSession(id) {
  if (!confirm("Delete this session? This can't be undone.")) return;
  sessions = sessions.filter(s => s.id !== id);
  saveSessions();
  renderAll();
}

form.addEventListener('submit', e => {
  e.preventDefault();

  const id = document.getElementById('sessionId').value;
  const data = {
    date: document.getElementById('dateInput').value || getLocalDateString(),
    location: document.getElementById('locationInput').value.trim(),
    buyIn: parseFloat(document.getElementById('buyInInput').value) || 0,
    cashOut: parseFloat(document.getElementById('cashOutInput').value) || 0,
    hours: parseInt(document.getElementById('hoursInput').value, 10) || 0,
    minutes: parseInt(document.getElementById('minutesInput').value, 10) || 0,
    notes: document.getElementById('notesInput').value.trim(),
  };

  if (id) {
    const idx = sessions.findIndex(s => s.id === id);
    if (idx > -1) sessions[idx] = { ...sessions[idx], ...data };
  } else {
    sessions.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: Date.now(),
      ...data,
    });
  }

  saveSessions();
  resetFormToNew();
  renderAll();
});

cancelEditBtn.addEventListener('click', resetFormToNew);

/* ---------- starting net (one-time onboarding, editable later) ---------- */

const onboardingCard = document.getElementById('onboardingCard');
const startingNetInput = document.getElementById('startingNetInput');
const startingWinsInput = document.getElementById('startingWinsInput');
const startingLossesInput = document.getElementById('startingLossesInput');
const startingStreakInput = document.getElementById('startingStreakInput');
const saveStartingNetBtn = document.getElementById('saveStartingNetBtn');
const cancelStartingNetBtn = document.getElementById('cancelStartingNetBtn');
const editStartingNetBtn = document.getElementById('editStartingNetBtn');

function openOnboarding(isEdit) {
  startingNetInput.value = getStartingNet();
  startingWinsInput.value = getStartingWins();
  startingLossesInput.value = getStartingLosses();
  startingStreakInput.value = getStartingStreak();
  onboardingCard.hidden = false;
  cancelStartingNetBtn.hidden = !isEdit;
  onboardingCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeOnboarding() {
  onboardingCard.hidden = true;
}

saveStartingNetBtn.addEventListener('click', () => {
  const net = parseFloat(startingNetInput.value) || 0;
  const wins = parseInt(startingWinsInput.value, 10) || 0;
  const losses = parseInt(startingLossesInput.value, 10) || 0;
  const streak = parseInt(startingStreakInput.value, 10) || 0;
  setStartingStats(net, wins, losses, streak);
  closeOnboarding();
  renderAll();
});

cancelStartingNetBtn.addEventListener('click', closeOnboarding);
editStartingNetBtn.addEventListener('click', () => openOnboarding(true));

/* ---------- visit counter ----------
   Tries a free, no-login hit-counter API so the number reflects everyone
   who opens the deployed site, not just you. If that service is
   unreachable (offline, blocked, or down) it falls back to a per-browser
   count stored locally, and says so honestly in the footer. See README.md
   for swap-in alternatives if you want something more resume-grade. */

async function trackVisit() {
  const pillCount = document.getElementById('visitCount');
  const footerNote = document.getElementById('footerVisit');

  const localVisits = (parseInt(localStorage.getItem(LOCAL_VISITS_KEY), 10) || 0) + 1;
  localStorage.setItem(LOCAL_VISITS_KEY, String(localVisits));

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://api.countapi.xyz/hit/${VISIT_NAMESPACE}/visits`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();
    pillCount.textContent = data.value.toLocaleString();
    footerNote.textContent = 'Counting every visit from everyone who opens this page.';
  } catch (err) {
    pillCount.textContent = localVisits.toLocaleString();
    footerNote.textContent = 'Showing visits from this browser only — deploy the site to count everyone (see README).';
  }
}

/* ---------- init ---------- */

renderAutoDate();
resetFormToNew();
renderAll();
trackVisit();

document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const status = document.getElementById('contactStatus');
  const btn = form.querySelector('button[type="submit"]');
  btn.textContent = 'Sending...';
  btn.disabled = true;
  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    });
    if (res.ok) {
      status.textContent = '✓ Message sent!';
      form.reset();
    } else {
      status.style.color = 'var(--loss)';
      status.textContent = 'Something went wrong — try again.';
    }
  } catch {
    status.style.color = 'var(--loss)';
    status.textContent = 'Something went wrong — try again.';
  }
  btn.textContent = 'Send Message';
  btn.disabled = false;
});

if (!hasConfiguredStartingNet()) {
  openOnboarding(false);
}
