'use strict';
/* Echo's modes. Buddy is the original Echo. Coach walks you through the 7 Baby Steps,
   Advisor grades your spending against common guidelines. Everything here is rules and
   arithmetic on what's stored on this phone: no AI, no network. */

// ---------- modes ----------
const MODES = {
  buddy: { ico: '🙂', name: 'Buddy', hello: "Classic me. I'll just watch and cheer. No lectures." },
  coach: { ico: '🧭', name: 'Coach', hello: "Coach mode! Let's work the Baby Steps together." },
  advisor: { ico: '🩺', name: 'Advisor', hello: "Advisor mode. I'll keep an eye on where it all goes." },
};
const mode = () => MODES[P.prefs.mode] ? P.prefs.mode : 'buddy';

function applyMode() {
  const m = mode();
  $('#echo .echo').dataset.mode = m;
  const tag = $('#modeTag');
  tag.textContent = m === 'buddy' ? '' : MODES[m].ico;
  tag.classList.toggle('hidden', m === 'buddy');
}

function setMode(m) {
  if (mode() === m) { echo.say(`Already in ${MODES[m].name} mode.`, 'thinking', 2500); return; }
  P.prefs.mode = m;
  saveProfiles();
  applyMode();
  route();
  echo.say(MODES[m].hello, m === 'buddy' ? 'happy' : 'proud', 4000);
  if (m === 'coach' && !S.money) setTimeout(() => ask('Want me to find your Baby Step? A few questions, two minutes.',
    [{ label: "Let's go", primary: true, fn: interview }, { label: 'Later' }], 'happy', true), 2200);
}

// ---------- tap and hold ----------
(function wireEchoButton() {
  const btn = $('#echo');
  let holdT, held = false, sx = 0, sy = 0;
  const cancel = () => { clearTimeout(holdT); btn.classList.remove('pressing'); };
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn.addEventListener('pointerdown', e => {
    held = false; sx = e.clientX; sy = e.clientY;
    btn.classList.add('pressing');
    clearTimeout(holdT);
    holdT = setTimeout(() => {
      held = true;
      btn.classList.remove('pressing');
      if (navigator.vibrate) navigator.vibrate(15);
      openEchoMenu();
    }, 450);
  });
  btn.addEventListener('pointermove', e => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 12) cancel(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, cancel));
  btn.addEventListener('click', () => { if (held) { held = false; return; } tapEcho(); });
})();

function tapEcho() {
  closeAsk();
  const md = mode(), path = location.hash.slice(1);
  if (md === 'coach' && !path.startsWith('/coach')) return go('/coach');
  if (md === 'advisor' && !path.startsWith('/checkup')) return go('/checkup');
  echo.set('thinking', 500);
  const line = md === 'coach' ? coachTip() : md === 'advisor' ? advisorTip() : insight();
  setTimeout(() => echo.say(line, 'proud', 5000), 250);
}

// ---------- the hold menu ----------
const MENU = [
  { k: 'buddy', ico: '🙂', label: 'Buddy' },
  { k: 'coach', ico: '🧭', label: 'Coach' },
  { k: 'advisor', ico: '🩺', label: 'Advisor' },
  { k: 'book', ico: '📖', label: 'Book' },
  { k: 'plan', ico: '🗂️', label: 'Plan' },
  { k: 'tools', ico: '🧮', label: 'Tools' },
  { k: 'quiet', ico: '🤫', label: 'Quiet' },
];

function openEchoMenu() {
  const root = $('#echoMenu');
  if (root.childElementCount || sheet) return;
  closeAsk();
  const r = $('#echo').getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  // Modes on an inner arc, places on an outer one, fanning right and down from Echo.
  const spots = [[115, [0, 45, 90]], [212, [0, 30, 60, 90]]]
    .flatMap(([rad, angs]) => angs.map(a => [cx + rad * Math.cos(a * Math.PI / 180), cy + rad * Math.sin(a * Math.PI / 180)]));
  const cur = mode(), talk = P.prefs.talk;
  const caption = `<div class="em-cap"><b>${MODES[cur].ico} ${MODES[cur].name} mode</b>
    Modes change how I act: Buddy is the classic me, Coach walks the Baby Steps, Advisor grades your spending. The rest are places to go.</div>`;
  $('#bubble').classList.remove('show');
  root.innerHTML = '<div class="em-back"></div>' + caption + MENU.map((it, i) => {
    const x = Math.max(8, Math.min(innerWidth - 72, spots[i][0] - 32));
    const y = Math.max(8, Math.min(innerHeight - 92, spots[i][1] - 32));
    const ico = it.k === 'quiet' ? (talk ? '🤫' : '🗣️') : it.ico;
    const label = it.k === 'quiet' ? (talk ? 'Quiet' : 'Talk') : it.label;
    return `<button class="em-b ${i < 3 ? 'is-mode' : ''} ${it.k === cur ? 'on' : ''}" data-em="${it.k}"
      style="left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;--fx:${(cx - x - 32).toFixed(0)}px;--fy:${(cy - y - 32).toFixed(0)}px;--d:${i * 30}ms">
      <span class="em-i">${ico}</span><span class="em-l">${label}</span></button>`;
  }).join('');
  document.body.classList.add('em-open');
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('em-show')));
  echo.set('surprised', 1500);
  $('.em-back', root).onclick = closeEchoMenu;
  $$('[data-em]', root).forEach(b => b.onclick = () => { closeEchoMenu(); pickMenu(b.dataset.em); });
}

function closeEchoMenu() {
  document.body.classList.remove('em-show');
  setTimeout(() => { document.body.classList.remove('em-open'); $('#echoMenu').innerHTML = ''; }, 200);
}

function pickMenu(k) {
  if (MODES[k]) return setMode(k);
  if (k === 'quiet') {
    P.prefs.talk = !P.prefs.talk;
    saveProfiles();
    echo.say(P.prefs.talk ? 'Yay, I can talk again.' : "Okay, zipping it 🤐 Hold me if you need me.", P.prefs.talk ? 'happy' : 'sleepy', 3000);
    if (location.hash === '#/settings') route();
    return;
  }
  go('/' + k);
}

// ---------- Echo asks ----------
let askT;
// A question bubble with answer chips. Proactive questions respect Quiet; `force` is for
// questions the person just asked for.
function ask(text, opts, mood = 'thinking', force = false) {
  if (!force && !P.prefs.talk) return;
  const el = $('#ask');
  el.innerHTML = `<p>${h(text)}</p><div class="ask-opts">${opts.map((o, i) =>
    `<button class="chip ${o.primary ? 'on' : ''}" data-ask="${i}">${h(o.label)}</button>`).join('')}</div>`;
  el.classList.add('show');
  $('#bubble').classList.remove('show');
  echo.set(mood, 6000);
  echo.lookAt(el);
  $$('[data-ask]', el).forEach(b => b.onclick = () => { closeAsk(); const o = opts[b.dataset.ask]; if (o.fn) o.fn(); });
  clearTimeout(askT);
  askT = setTimeout(closeAsk, 30000);
}
function closeAsk() { $('#ask').classList.remove('show'); clearTimeout(askT); }

// ---------- money math ----------
const MONTH = 30.44 * DAY;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pct = x => `${Math.round(x * 100)}%`;
const monthKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthStart = (offset = 0) => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + offset, 1).getTime(); };
const fmtMonth = t => new Date(t).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
const monthName = () => new Date().toLocaleDateString(undefined, { month: 'long' });
const isIncome = t => t.type === 'add' && t.reason !== 'Starting amount';
const UNITS = { '$': 'dollar', '€': 'euro', '£': 'pound', 'MAD': 'dirham', 'DH': 'dirham', '₹': 'rupee', '¥': 'yen', 'CHF': 'franc' };
const unit = () => UNITS[S.settings.currency] || 'coin';

function roundNice(n) {
  const a = Math.abs(n), step = a < 100 ? 5 : a < 1000 ? 10 : a < 10000 ? 50 : a < 100000 ? 500 : 1000;
  return Math.round(n / step) * step;
}
function monthsText(mo) {
  if (!isFinite(mo)) return 'never at this rate';
  if (mo < 1) { const w = Math.max(1, Math.ceil(mo * 4.35)); return `about ${w} week${w > 1 ? 's' : ''}`; }
  if (mo < 24) { const n = Math.ceil(mo); return `about ${n} month${n > 1 ? 's' : ''}`; }
  return `about ${(mo / 12).toFixed(1).replace(/\.0$/, '')} years`;
}

// Money in and out between two dates, with spending grouped by category.
function flows(from, to = Date.now() + 1) {
  const spend = {};
  let income = 0, out = 0;
  for (const t of S.tx) {
    if (t.date < from || t.date >= to) continue;
    if (isIncome(t)) income += t.amount;
    else if (t.type === 'sub') { const c = catOf(t); spend[c] = (spend[c] || 0) + t.amount; out += t.amount; }
  }
  for (const it of S.items) if (it.status === 'sold' && it.soldAt >= from && it.soldAt < to) income += it.soldPrice - it.cost;
  return { income: round2(income), out: round2(out), spend };
}
// Average per month over the last three full months that have anything logged.
function monthlyAvg(key) {
  let sum = 0, n = 0;
  for (let i = -3; i < 0; i++) {
    const from = monthStart(i), to = monthStart(i + 1);
    if (!S.tx.some(t => t.date >= from && t.date < to)) continue;
    sum += flows(from, to)[key];
    n++;
  }
  return n ? roundNice(sum / n) : 0;
}
const statedIncome = () => (S.money && S.money.income) || (S.plan && S.plan.income) || 0;
const grossIncome = () => (S.money && S.money.gross) || roundNice(statedIncome() * 1.25);
const surplus = () => S.money ? Math.max(0, roundNice((S.money.income || 0) - (S.money.expenses || 0))) : 0;

// ---------- emergency fund ----------
const STARTER_LOCAL = { '$': 1000, '€': 1000, '£': 1000, 'CHF': 1000, 'MAD': 10000, 'DH': 10000, '₹': 85000 };
const EF_NAME = /emergenc|urgence|rainy|safety|secours/i;
const efStash = () => (S.money && accById(S.money.ef)) || null;
function efBalance() {
  const a = efStash();
  if (a) return Math.max(0, cashOf(a.id));
  return Math.max(0, S.accounts.filter(x => EF_NAME.test(x.name)).reduce((s, x) => s + cashOf(x.id), 0));
}
const efMonths = () => (S.money && S.money.efMonths) || 3;
const efFull = () => roundNice(((S.money && S.money.expenses) || 0) * efMonths());
function starterGuess(m = S.money || {}) {
  const cur = S.settings.currency, pay = m.low || m.income || m.expenses || 0;
  if (['$', '€', '£', 'CHF'].includes(cur)) return 1000;
  if (pay) return roundNice(pay / 2);
  return STARTER_LOCAL[cur] || 1000;
}
const starterTarget = () => (S.money && S.money.starter) || starterGuess();
const suggestEfMonths = m => m.work === 'self' || m.work === 'part' || m.irregular || m.household === 'solo' ? 6 : m.household === 'family' ? 4 : 3;

function efPace() {
  const ef = efStash();
  if (!ef) return 0;
  const from = Date.now() - 90 * DAY;
  let net = 0;
  for (const t of S.tx) if (t.date >= from && t.reason !== 'Starting amount') net += delta(t, ef.id);
  const days = clamp((Date.now() - (ef.createdAt || from)) / DAY, 30, 90);
  return net > 0 ? net / days * 30.44 : 0;
}
function etaFor(remaining) {
  if (remaining <= 0) return '';
  const pace = efPace();
  if (pace > 0) return `At your pace (${fmt(roundNice(pace))}/mo): ${monthsText(remaining / pace)} to go`;
  const spare = surplus();
  if (spare > 0) return `If you save your spare ${fmt(spare)}/mo: ${monthsText(remaining / spare)}`;
  return 'Nothing flowing in yet. Even small moves count.';
}
function createEfStash() {
  let a = S.accounts.find(x => EF_NAME.test(x.name));
  if (!a) {
    a = { id: uid(), name: 'Emergency', icon: '☂️', color: '#e34948', goal: 0, createdAt: Date.now() };
    S.accounts.push(a);
  }
  if (S.money) S.money.ef = a.id;
  commit();
  react(`${a.name} is your emergency stash now ☂️`, 'proud');
  return a;
}

// ---------- debts ----------
const DEBT_KINDS = {
  card: ['💳', 'Credit card'], loan: ['🏦', 'Loan'], car: ['🚗', 'Car loan'], student: ['🎓', 'Student loan'],
  family: ['🤝', 'Family or friends'], bnpl: ['🛍️', 'Pay later'], medical: ['🏥', 'Medical'], phone: ['📱', 'Phone or plan'],
  other: ['🧾', 'Other'], house: ['🏠', 'Mortgage'],
};
function guessKind(name) {
  const n = norm(name);
  if (/mortgage|hypothe|house|home/.test(n)) return 'house';
  if (/card|visa|master|amex|carte/.test(n)) return 'card';
  if (/\bcar\b|auto|voiture|moto/.test(n)) return 'car';
  if (/student|school|etudiant|univ/.test(n)) return 'student';
  if (/klarna|afterpay|later|bnpl|tabby|tamara|affirm/.test(n)) return 'bnpl';
  if (/phone|mobile|iphone|samsung|telephone/.test(n)) return 'phone';
  if (/medical|hospital|doctor|clinic|dentist/.test(n)) return 'medical';
  if (/mom|mum|dad|uncle|aunt|brother|sister|friend|family|cousin|famille|ami|khal|3am|khoya|okhti/.test(n)) return 'family';
  if (/loan|pret|credit|bank|banque|salaf/.test(n)) return 'loan';
  return 'other';
}
const debtById = id => S.debts.find(d => d.id === id);
function debtBal(d) {
  let b = d.base;
  for (const t of S.tx) if (t.debtId === d.id && t.type === 'sub' && t.date >= d.baseAt) b -= t.amount;
  return round2(Math.max(0, b));
}
// Open debts, smallest balance first: the snowball order.
const openDebts = (house = false) => S.debts.filter(d => (d.kind === 'house') === house && debtBal(d) > 0.004)
  .sort((a, b) => debtBal(a) - debtBal(b));
const houseDebt = () => openDebts(true)[0] || null;
const snowExtra = () => (S.money && S.money.snowball != null) ? S.money.snowball : surplus();
function debtProgress() {
  const all = S.debts.filter(d => d.kind !== 'house');
  const orig = all.reduce((s, d) => s + (d.original || d.base), 0);
  return orig ? clamp(1 - all.reduce((s, d) => s + debtBal(d), 0) / orig, 0, 1) : 1;
}
function payDebt(d) { txSheet('sub', { cat: 'debt', debtId: d.id, reason: `${d.name} payment` }); }

// Month by month: interest accrues, every debt gets its minimum, and everything left
// (the extra plus each minimum already freed up) goes to the smallest balance.
function snowball(debts, extra) {
  const ds = debts.map(d => ({ id: d.id, bal: debtBal(d), min: d.min || 0, r: (d.rate || 0) / 1200 })).sort((a, b) => a.bal - b.bal);
  const budget = ds.reduce((s, d) => s + d.min, 0) + Math.max(0, extra);
  const done = {};
  let month = 0, interest = 0;
  while (ds.some(d => d.bal > 0.005) && month < 600) {
    month++;
    let pool = budget;
    for (const d of ds) if (d.bal > 0.005) { const i = d.bal * d.r; d.bal += i; interest += i; }
    for (const d of ds) if (d.bal > 0.005) { const p = Math.min(d.min, d.bal, pool); d.bal -= p; pool -= p; }
    for (const d of ds) if (d.bal > 0.005 && pool > 0) { const p = Math.min(pool, d.bal); d.bal -= p; pool -= p; }
    for (const d of ds) if (d.bal <= 0.005 && !done[d.id]) done[d.id] = month;
  }
  const stuck = ds.some(d => d.bal > 0.005);
  return { months: stuck ? Infinity : month, done, interest: round2(interest), budget: round2(budget) };
}

// Months to pay off one loan, and the interest along the way.
function payoff(bal, ratePct, pay) {
  const r = (ratePct || 0) / 1200;
  let m = 0, interest = 0;
  while (bal > 0.005 && m < 1200) {
    const i = bal * r;
    if (pay <= i) return { months: Infinity, interest: Infinity };
    bal += i - pay;
    interest += i;
    m++;
  }
  return { months: m, interest: round2(interest) };
}
const pvLoan = (pmt, r, n) => r ? pmt * (1 - Math.pow(1 + r, -n)) / r : pmt * n;
const fv = (pmt, r, n, pv = 0) => r ? pv * Math.pow(1 + r, n) + pmt * (Math.pow(1 + r, n) - 1) / r : pv + pmt * n;

// ---------- the 7 Baby Steps ----------
const STEPS = [null,
  { ico: '☂️', short: 'Starter fund', title: 'Save a starter emergency fund', lesson: 'bs1' },
  { ico: '❄️', short: 'Debt snowball', title: 'Pay off all debt except the house', lesson: 'bs2' },
  { ico: '🏦', short: 'Full emergency fund', title: 'Save 3–6 months of expenses', lesson: 'bs3' },
  { ico: '🌱', short: 'Invest 15%', title: 'Invest 15% of income for retirement', lesson: 'bs4' },
  { ico: '🎓', short: 'College fund', title: "Save for your kids' college", lesson: 'bs5' },
  { ico: '🏠', short: 'Pay off the house', title: 'Pay off your home early', lesson: 'bs6' },
  { ico: '💎', short: 'Build wealth & give', title: 'Build wealth and give', lesson: 'bs7' },
];

// Where you are on the map, how far along, and roughly when you'll be through.
function stepState() {
  const m = S.money;
  if (!m) return null;
  const ef = efBalance(), starter = starterTarget(), full = Math.max(efFull(), starter);
  const debts = openDebts(), house = houseDebt();
  const done = { 1: ef >= starter, 2: !debts.length, 3: !debts.length && ef >= full,
    4: (m.retire || 0) >= 15, 5: !m.kids || m.college === 'ontrack', 6: !house, 7: false };
  const n = !done[1] ? 1 : !done[2] ? 2 : !done[3] ? 3 : !done[4] ? 4 : !done[5] ? 5 : !done[6] ? 6 : 7;
  const s = { n, done, crisis: m.work === 'none', ef, starter, full, debts, house, p: 0, text: '', eta: '' };
  if (n === 1) {
    s.p = ef / starter;
    s.text = `${fmt(ef)} of ${fmt(starter)}`;
    s.eta = etaFor(starter - ef);
  } else if (n === 2) {
    const left = debts.reduce((x, d) => x + debtBal(d), 0);
    s.p = debtProgress();
    s.text = `${fmt(left)} left on ${debts.length} debt${debts.length > 1 ? 's' : ''}`;
    const sb = snowball(debts, snowExtra());
    s.eta = sb.months === Infinity ? 'Not shrinking yet. The snowball needs more per month.'
      : `Debt-free in ${monthsText(sb.months)} (${fmtMonth(Date.now() + sb.months * MONTH)})`;
  } else if (n === 3) {
    s.p = ef / full;
    s.text = `${fmt(ef)} of ${fmt(full)} (${efMonths()} months)`;
    s.eta = etaFor(full - ef);
  } else if (n === 4) {
    s.p = (m.retire || 0) / 15;
    s.text = `Investing ${m.retire || 0}% of income. The goal is 15%.`;
  } else if (n === 5) {
    s.p = m.college === 'started' ? 0.5 : 0;
    s.text = m.college === 'started' ? 'College savings started' : 'No college savings yet';
  } else if (n === 6) {
    const bal = debtBal(house), orig = house.original || house.base;
    s.p = orig ? 1 - bal / orig : 0;
    s.text = `${fmt(bal)} left on the house`;
    if (house.min) { const po = payoff(bal, house.rate, house.min); s.eta = po.months === Infinity ? '' : `Paid off in ${monthsText(po.months)} at ${fmt(house.min)}/mo. Extra payments cut that.`; }
  } else {
    s.p = 1;
    s.text = 'Every step done. Keep building, keep giving.';
  }
  s.p = clamp(s.p || 0, 0, 1);
  return s;
}

// The to-do list: rules that turn your numbers into the next few concrete moves.
let coachTodos = [];
function todos(s) {
  const m = S.money, out = [];
  const add = (ico, text, btn, fn) => out.push({ ico, text, btn, fn });
  const ef = efStash();
  if (s.crisis) {
    add('🧱', 'Cover the Four Walls first: food, utilities, shelter, transport.', 'Read', () => go('/book/four-walls'));
    add('💵', 'Pay minimums only. Keep every spare coin as cash for now.');
    add('🏷️', "Sell what you don't need. Track it as an item to flip.", 'Add item', sellSomething);
    add('📞', 'Behind on a bill? Call before the due date and ask for a hardship plan.', 'Read', () => go('/book/behind'));
    add('🔎', 'Any honest income counts: gigs, deliveries, temp work. Apply every day.');
    return out;
  }
  if (!planSet()) add('🗂️', `Give every ${unit()} a job: make ${monthName()}'s plan.`, 'Plan', () => go('/plan'));
  if (s.n === 1 || s.n === 3) {
    const target = s.n === 1 ? s.starter : s.full;
    if (!ef) add('☂️', 'Make an Emergency stash so this money has its own home.', 'Create', createEfStash);
    else add('⇄', `Move money into ${ef.name}: ${fmt(Math.max(0, target - s.ef))} to go.`, 'Move', () => txSheet('move', { to: ef.id }));
  }
  if (s.n === 1) {
    add('⏸️', 'Pause investing and extra debt payments until this is done. Minimums only.');
    add('⚡', 'Go fast: sell something, take an extra shift. Aim for about a month.', 'Sell', sellSomething);
  }
  if (s.n === 2) {
    const t = s.debts[0], rest = s.debts.slice(1);
    add('🎯', `Attack ${t.name}: ${fmt(debtBal(t))} left. Every extra ${unit()} goes here.`, 'Pay', () => payDebt(t));
    if (rest.length) add('➖', `Minimums on the other ${rest.length}: ${fmt(rest.reduce((x, d) => x + (d.min || 0), 0))}/mo.`);
    const sb = snowball(s.debts, snowExtra());
    add('❄️', sb.months === Infinity ? 'Your snowball is too small to beat the interest. Find more per month.'
      : `Snowball: ${fmt(sb.budget)}/mo makes you debt-free by ${fmtMonth(Date.now() + sb.months * MONTH)}.`, 'Planner', () => go('/debts'));
    add('✂️', 'No new debt. Cut up the cards, skip buy-now-pay-later.');
  }
  if (s.n === 3) {
    const freed = S.debts.filter(d => d.kind !== 'house' && d.paidAt).reduce((x, d) => x + (d.min || 0), 0);
    if (freed) add('🔁', `Your old debt payments (${fmt(freed)}/mo) now go straight to ${ef ? ef.name : 'the fund'}.`);
    add('🏦', 'Keep it in plain savings, not investments. Boring is the point.');
  }
  if (s.n >= 4 && s.n <= 6) {
    if (!s.done[4]) add('🌱', `Invest 15% of gross income: about ${fmt(roundNice(grossIncome() * 0.15))}/mo. Take any employer match first.`, 'Grow', () => go('/tools'));
    if (m.kids && !s.done[5]) add('🎓', `College: after the 15%, set a monthly amount for ${m.kids > 1 ? 'the kids' : 'your kid'}.`, 'Read', () => go('/book/bs5'));
    if (s.house) add('🏠', `Everything left over goes to the house: ${fmt(debtBal(s.house))} to go.`, 'Pay', () => payDebt(s.house));
  }
  if (s.n === 7) {
    add('🤲', 'Give generously. Plan it first in your budget.', 'Plan', () => go('/plan'));
    add('💎', 'Keep investing, enjoy it, and plan an inheritance.', 'Read', () => go('/book/bs7'));
  }
  // Data-driven nudge: what this month's wants cost the current goal.
  if (s.n <= 2) {
    const f = flows(Date.now() - 30 * DAY);
    const wants = round2((f.spend.eatout || 0) + (f.spend.fun || 0));
    if (wants > 0 && s.n === 1) add('🍚', `${fmt(wants)} went to eating out and fun in 30 days. That's ${pct(wants / s.starter)} of your starter fund.`);
    if (wants > 0 && s.n === 2) {
      const base = snowball(s.debts, snowExtra()), fast = snowball(s.debts, snowExtra() + wants);
      const saved = base.months - fast.months;
      if (isFinite(saved) && saved > 0) add('🍚', `${fmt(wants)} went to eating out and fun in 30 days. Redirected, you'd be debt-free ${saved} month${saved > 1 ? 's' : ''} sooner.`);
    }
  }
  return out;
}
function sellSomething() {
  const id = currentAccId() || (S.accounts[0] && S.accounts[0].id);
  if (id) itemSheet(id); else accountSheet();
}

const COACH_TIPS = {
  all: ['Live like no one else now, so later you can live and give like no one else.', 'Personal finance is mostly behavior. You know what to do. Do it.',
    "One step at a time. Focus beats spreading thin.", 'Cash feels real. Cards don\'t. That\'s the point.', `Every ${'{u}'} gets a job before the month starts.`],
  1: ['Sell something today. Look around, really.', 'This fund is a wall between you and new debt.', 'Fast beats perfect. Aim for a month.'],
  2: ['Smallest debt first. Quick wins build momentum.', 'Beans and rice, rice and beans. It ends.', 'Gazelle intensity: run like something is chasing you.'],
  3: ['Those old debt payments? Savings now. Feels good.', 'An emergency becomes an inconvenience with this fund.'],
  4: ['15% of gross. Not more, not less, for now.', 'Time in the market grows money. Start, then wait.'],
  5: ['Scholarships exist for school, not for retirement.', 'Small monthly amounts add up over a childhood.'],
  6: ['Every extra payment goes straight to principal.', 'Picture no house payment. Now go get it.'],
  7: ['Give like crazy. You earned this freedom.', 'Build wealth on purpose, then leave a legacy.'],
};
function coachTip() {
  const s = stepState();
  if (!s) return "Tap Start and I'll find your Baby Step.";
  if (s.crisis) return pickOne(['Four Walls first. Everything else waits.', "You'll get through this. Cash is your oxygen right now.", 'Apply somewhere today. Then apply again.']);
  return pickOne([...COACH_TIPS.all, ...COACH_TIPS[s.n], ...COACH_TIPS[s.n]]).replace('{u}', unit());
}

// ---------- milestones ----------
const MILES = [
  { id: 'setup', ico: '🧭', name: 'Found my step', test: () => true },
  { id: 'plan', ico: '🗂️', name: 'Made a plan', test: () => planTotal() > 0 },
  { id: 'starterHalf', ico: '🌗', name: 'Halfway to starter', test: () => efBalance() >= starterTarget() / 2 },
  { id: 'starter', ico: '☂️', name: 'Starter fund done', test: () => efBalance() >= starterTarget() },
  { id: 'firstDebt', ico: '✂️', name: 'First debt gone', test: () => S.debts.some(d => d.kind !== 'house' && d.paidAt) },
  { id: 'debtHalf', ico: '❄️', name: 'Half the debt gone', test: () => S.debts.some(d => d.kind !== 'house') && debtProgress() >= 0.5 },
  { id: 'debtFree', ico: '🎉', name: 'Debt-free but the house', test: () => S.debts.some(d => d.kind !== 'house') && !openDebts().length },
  { id: 'ef1', ico: '📅', name: 'One month saved', test: () => S.money.expenses > 0 && efBalance() >= S.money.expenses },
  { id: 'efFull', ico: '🏦', name: 'Full emergency fund', test: () => efFull() > 0 && efBalance() >= efFull() },
  { id: 'invest', ico: '🌱', name: 'Investing 15%', test: () => (S.money.retire || 0) >= 15 },
  { id: 'saver', ico: '💪', name: 'Kept 20% in a month', test: () => { const f = flows(monthStart(-1), monthStart(0)); return f.income > 0 && (f.income - f.out) / f.income >= 0.2; } },
  { id: 'giver', ico: '🤲', name: 'Gave this month', test: () => (flows(monthStart(0)).spend.giving || 0) > 0 },
  { id: 'house', ico: '🏡', name: 'House paid off', test: () => S.debts.some(d => d.kind === 'house') && !houseDebt() },
];
function syncDebts() {
  let changed = false;
  for (const d of S.debts) {
    const paid = debtBal(d) <= 0.004;
    if (paid && !d.paidAt) { d.paidAt = Date.now(); changed = true; }
    if (!paid && d.paidAt) { delete d.paidAt; changed = true; }
  }
  return changed;
}
function checkMilestones(celebrate = true) {
  let changed = syncDebts();
  const fresh = S.money ? MILES.filter(m => { try { return !S.milestones[m.id] && m.test(); } catch (e) { return false; } }) : [];
  for (const m of fresh) S.milestones[m.id] = Date.now();
  if (changed || fresh.length) save();
  if (fresh.length && celebrate && mode() === 'coach') {
    setTimeout(() => react(`🏅 Milestone: ${fresh[fresh.length - 1].name}!`, 'proud', 5000), 4600);
  }
}

// ---------- coach page ----------
const FINE = '<p class="fine">Based on the 7 Baby Steps popularized by Dave Ramsey, retold in our own words. Not affiliated with Ramsey Solutions. General education, not personal financial advice.</p>';

function mapHTML(s) {
  const m = S.money || {};
  const rows = STEPS.slice(1).map((st, i) => {
    const n = i + 1;
    const skip = s && ((n === 5 && !m.kids) || (n === 6 && !s.house && m.home !== 'mortgage'));
    const state = !s ? 'todo' : n === s.n ? 'now' : skip ? 'skip' : n < s.n || s.done[n] ? 'done' : 'todo';
    const left = i % 2 === 0;
    const note = state === 'now' ? 'You are here' : state === 'skip' ? (n === 5 ? 'No kids: skip' : 'No mortgage: skip') : state === 'done' ? 'Done ✓' : '';
    return `<button class="map-node ${state} ${left ? 'l' : 'r'}" data-step="${n}" style="top:${i * 78}px">
      <span class="mn-dot">${state === 'done' ? '✓' : st.ico}</span>
      <span class="mn-txt"><b>${n}. ${h(st.short)}</b>${note ? `<small>${note}</small>` : ''}</span></button>`;
  }).join('');
  let path = '';
  for (let i = 0; i < 6; i++) {
    const x0 = i % 2 === 0 ? 16 : 84, x1 = i % 2 === 0 ? 84 : 16, y0 = i * 78 + 27, y1 = y0 + 78;
    const doneSeg = s && (i + 2 <= s.n);
    path += `<path class="${doneSeg ? 'seg done' : 'seg'}" d="M${x0} ${y0} C${x0} ${y0 + 46} ${x1} ${y1 - 46} ${x1} ${y1}" />`;
  }
  return `<div class="map"><svg viewBox="0 0 100 ${6 * 78 + 54}" preserveAspectRatio="none" aria-hidden="true">${path}</svg>${rows}</div>`;
}

function numbersHTML(s) {
  const m = S.money, ef = efStash();
  const debts = openDebts();
  const chip = (attr, v, label, on) => `<button class="chip ${on ? 'on' : ''}" data-${attr}="${v}">${label}</button>`;
  return `
    <div class="kv"><span>Take-home pay</span><button class="link num" data-num="income">${fmt(m.income || 0)}/mo ✎</button></div>
    ${m.irregular ? `<div class="kv"><span>A lean month</span><button class="link num" data-num="low">${fmt(m.low || 0)} ✎</button></div>` : ''}
    <div class="kv"><span>A normal month costs</span><button class="link num" data-num="expenses">${fmt(m.expenses || 0)} ✎</button></div>
    <div class="kv"><span>Starter fund</span><button class="link num" data-num="starter">${fmt(starterTarget())} ✎</button></div>
    <div class="kv"><span>Emergency stash</span><button class="link" id="pickEf">${ef ? `${h(ef.icon)} ${h(ef.name)}` : 'Pick one'} ✎</button></div>
    <div class="kv"><span>Debts (not the house)</span><button class="link" data-go="/debts">${debts.length ? `${debts.length} · ${fmt(debts.reduce((x, d) => x + debtBal(d), 0))}` : 'None'} ›</button></div>
    <div class="field" style="margin:12px 0 0"><span class="label">Full emergency fund: ${fmt(efFull())}</span>
      <div class="chips">${[3, 4, 5, 6].map(n => chip('efm', n, `${n} months`, efMonths() === n)).join('')}</div></div>
    <div class="field" style="margin:12px 0 0"><span class="label">Work</span>
      <div class="chips">${[['full', 'Full-time'], ['part', 'Part-time'], ['self', 'Self-employed'], ['none', 'Between jobs'], ['student', 'Student'], ['retired', 'Retired']]
        .map(([k, l]) => chip('work', k, l, m.work === k)).join('')}</div></div>
    <div class="field" style="margin:12px 0 0"><span class="label">Going to retirement now</span>
      <div class="chips">${[[0, 'Nothing'], [3, 'Under 5%'], [8, '5–10%'], [12, '10–15%'], [15, '15%+']].map(([v, l]) => chip('ret', v, l, (m.retire || 0) === v)).join('')}</div></div>
    ${m.kids ? `<div class="field" style="margin:12px 0 0"><span class="label">College savings</span>
      <div class="chips">${[['none', 'Not yet'], ['started', 'Started'], ['ontrack', 'On track']].map(([k, l]) => chip('col', k, l, (m.college || 'none') === k)).join('')}</div></div>` : ''}`;
}

function coachView() {
  const s = stepState();
  if (!s) return `
    <button class="back" data-go="/">‹ Home</button>
    <section class="card coach-hello">
      <h2>Let's find your Baby Step</h2>
      <p class="label">I'll ask about work, home and what you owe. Two minutes. Everything stays on this phone.</p>
      <button class="btn" id="startQ">Start</button>
    </section>
    <div class="sec-title"><span>The 7 Baby Steps</span><a href="#/book/map">Read ›</a></div>
    <section class="card">${mapHTML(null)}</section>
    ${FINE}`;
  const st = STEPS[s.n];
  coachTodos = todos(s);
  const got = MILES.filter(m => S.milestones[m.id]).length;
  return `
  <button class="back" data-go="/">‹ Home</button>
  ${s.crisis ? `<section class="card crisis"><b>🧯 Pause mode</b>
    <p>You're between jobs, so the normal steps wait. Protect the Four Walls, pay minimums if you can, and stack cash. Your step below is where you'll pick up again.</p>
    <button class="btn small ghost" data-go="/book/crisis">When life hits ›</button></section>` : ''}
  <section class="card step-card">
    <div class="row between"><span class="label">Baby Step ${s.n} of 7${s.n >= 4 && s.n <= 6 ? ' · 4, 5, 6 run together' : ''}</span><a class="link" href="#/book/${st.lesson}">Why? ›</a></div>
    <h2>${st.ico} ${h(st.title)}</h2>
    <div class="progress"><i style="width:${(s.p * 100).toFixed(1)}%"></i></div>
    <div class="row between label"><span class="num">${h(s.text)}</span><span class="num">${Math.round(s.p * 100)}%</span></div>
    ${s.eta ? `<div class="eta">${h(s.eta)}</div>` : ''}
  </section>
  <div class="sec-title"><span>Do this next</span></div>
  <section class="card list">${coachTodos.map((t, i) => `
    <div class="todo"><span class="todo-i">${t.ico}</span><div class="todo-t">${h(t.text)}</div>${t.btn ? `<button class="btn small ghost" data-todo="${i}">${h(t.btn)}</button>` : ''}</div>`).join('')}</section>
  <div class="sec-title"><span>Your map</span><a href="#/book/map">All steps ›</a></div>
  <section class="card">${mapHTML(s)}</section>
  <div class="sec-title"><span>Milestones</span><span class="label">${got} of ${MILES.length}</span></div>
  <section class="card"><div class="badges">${MILES.map(m => { const at = S.milestones[m.id]; return `
    <div class="badge ${at ? 'got' : ''}"><span>${m.ico}</span><b>${h(m.name)}</b><small>${at ? h(fmtDay(at)) : 'Not yet'}</small></div>`; }).join('')}</div></section>
  <div class="sec-title"><span>Your numbers</span></div>
  <section class="card">${numbersHTML(s)}</section>
  <button class="btn ghost" id="redoQ">Redo the questions</button>
  ${FINE}`;
}

function wireCoach(root) {
  const start = $('#startQ', root);
  if (start) start.onclick = () => interview();
  const redo = $('#redoQ', root);
  if (redo) redo.onclick = () => interview('work');
  $$('[data-todo]', root).forEach(b => b.onclick = () => { const t = coachTodos[b.dataset.todo]; if (t && t.fn) t.fn(); });
  $$('[data-step]', root).forEach(b => b.onclick = () => stepSheet(+b.dataset.step));
  $$('[data-num]', root).forEach(b => b.onclick = () => {
    const k = b.dataset.num;
    const labels = { income: 'Take-home pay per month', low: 'A lean month brings in', expenses: 'A normal month costs', starter: 'Starter emergency fund' };
    numberSheet(labels[k], k === 'starter' ? starterTarget() : S.money[k], v => { S.money[k] = v; S.money.answeredAt = Date.now(); commit(); });
  });
  $$('[data-efm]', root).forEach(b => b.onclick = () => { S.money.efMonths = +b.dataset.efm; commit(); });
  $$('[data-ret]', root).forEach(b => b.onclick = () => { S.money.retire = +b.dataset.ret; commit(); });
  $$('[data-col]', root).forEach(b => b.onclick = () => { S.money.college = b.dataset.col; commit(); });
  $$('[data-work]', root).forEach(b => b.onclick = () => {
    const was = S.money.work;
    S.money.work = b.dataset.work;
    commit();
    if (was === 'none' && S.money.work !== 'none') react('Back to work! Pause mode over 🎉', 'proud', 4500);
    else if (S.money.work === 'none') react("Okay. Four Walls first. We'll get through this.", 'worried', 4500);
  });
  const pe = $('#pickEf', root);
  if (pe) pe.onclick = efPickSheet;
}

function stepSheet(n) {
  const st = STEPS[n], l = lessonById(st.lesson);
  openSheet(`
    <div class="sheet-head"><h2>${st.ico} Step ${n}</h2><button class="x" data-close aria-label="Close">✕</button></div>
    <article class="lesson">${lessonHTML(l.body)}</article>
    <button class="btn ghost" id="read" style="margin-top:12px">Open in the book</button>`, sh => {
    $('#read', sh).onclick = () => { closeSheet(); setTimeout(() => go('/book/' + st.lesson), 60); };
  });
}

function numberSheet(title, value, onSave) {
  openSheet(`
    <div class="sheet-head"><h2>${h(title)}</h2><button class="x" data-close aria-label="Close">✕</button></div>
    <div class="field"><div class="amount-wrap"><span class="cur">${h(S.settings.currency)}</span>
      <input class="amount num" id="v" inputmode="decimal" value="${value || ''}" placeholder="0" aria-label="${h(title)}"></div></div>
    <button class="btn" id="save">Save</button>`, sh => {
    const inp = $('#v', sh);
    setTimeout(() => inp.focus(), 300);
    inp.onkeydown = e => { if (e.key === 'Enter') $('#save', sh).click(); };
    $('#save', sh).onclick = () => {
      const v = parseAmt(inp.value);
      if (!(v >= 0)) return toast('Enter a number');
      closeSheet();
      onSave(v);
    };
  });
}

function efPickSheet() {
  const cur = S.money.ef;
  openSheet(`
    <div class="sheet-head"><h2>Emergency stash</h2><button class="x" data-close aria-label="Close">✕</button></div>
    <p class="label">Which stash holds money only for emergencies?</p>
    <div class="pick wrap" id="p">${S.accounts.map(a => `
      <button data-pick="${a.id}" class="${a.id === cur ? 'on' : ''}"><span class="dot" style="--c:${a.color}">${h(a.icon)}</span>
      <span>${h(a.name)}<br><span class="amt num">${fmt(cashOf(a.id))}</span></span></button>`).join('')}</div>
    <button class="btn ghost" id="mk" style="margin-top:12px">＋ Make an Emergency stash</button>`, sh => {
    $$('[data-pick]', sh).forEach(b => b.onclick = () => { S.money.ef = b.dataset.pick; closeSheet(); commit(); });
    $('#mk', sh).onclick = () => { closeSheet(); createEfStash(); };
  });
}

// ---------- the questions: a small decision tree ----------
// Each node says something, then offers choices (`opts`), asks for a number (`num`),
// or shows a form. `next` is a node id or a function of the answers so far.
function starterHints(m) {
  const out = [], cur = S.settings.currency, pay = m.low || m.income || m.expenses || 0;
  if (STARTER_LOCAL[cur]) out.push({ label: cur === '$' ? "Ramsey's $1,000" : `≈ $1,000: ${fmt(STARTER_LOCAL[cur])}`, value: STARTER_LOCAL[cur] });
  if (pay) {
    out.push({ label: `½ month of pay: ${fmt(roundNice(pay / 2))}`, value: roundNice(pay / 2) });
    out.push({ label: `1 month of pay: ${fmt(roundNice(pay))}`, value: roundNice(pay) });
  }
  return out;
}
const afterRetire = m => m.kids ? 'college' : 'giving';
const QS = {
  hello: { mood: 'happy', say: () => "Let's find your Baby Step. I'll ask about work, home and what you owe. Nothing leaves this phone.",
    opts: [{ label: "Let's go", next: 'work' }] },
  work: { say: () => 'Are you working right now?', opts: [
    { label: 'Full-time job', set: { work: 'full' }, next: 'income' },
    { label: 'Part-time', set: { work: 'part' }, next: 'income' },
    { label: 'Self-employed', set: { work: 'self' }, next: 'income' },
    { label: 'Between jobs', set: { work: 'none' }, next: 'crisis' },
    { label: 'Student', set: { work: 'student' }, next: 'income' },
    { label: 'Retired', set: { work: 'retired' }, next: 'income' }] },
  crisis: { mood: 'worried', say: () => "Okay. Breathe. We'll pause the normal steps and protect the Four Walls: food, utilities, shelter, transport. A few numbers first.",
    opts: [{ label: 'Okay', next: 'income' }] },
  income: {
    say: m => m.work === 'none' ? 'Any money coming in each month? A partner, benefits, gigs. Zero is a fine answer.'
      : m.work === 'self' ? 'In an average month, what do you keep after tax and business costs?'
        : 'How much lands in your pocket each month, after tax?',
    num: 'income', zeroOk: m => m.work === 'none' || m.work === 'student' || m.work === 'retired',
    hints: () => { const a = monthlyAvg('income'); return a ? [{ label: `What I've seen: ${fmt(a)}/mo`, value: a }] : []; },
    next: m => m.income > 0 ? 'steady' : 'household' },
  steady: { say: () => 'Is it about the same every month?', opts: [
    { label: 'Pretty steady', set: { irregular: false, low: 0 }, next: 'gross' },
    { label: 'Changes a lot', set: { irregular: true }, next: 'low' }] },
  low: { say: () => 'Then we plan on a lean month and treat anything extra as a bonus. What does a low month bring in?', num: 'low', next: 'gross' },
  gross: { say: () => 'And before tax, roughly? I only use it for the 15% retirement rule.', num: 'gross', skip: 'Not sure',
    hints: m => [{ label: `About ${fmt(roundNice(m.income * 1.25))}`, value: roundNice(m.income * 1.25) }], next: 'household' },
  household: { say: () => 'Who does this money take care of?', opts: [
    { label: 'Just me', set: { household: 'single', kids: 0 }, next: 'home' },
    { label: 'Me and a partner', set: { household: 'couple', kids: 0 }, next: 'home' },
    { label: 'Family with kids', set: { household: 'family' }, next: 'kids' },
    { label: 'Single parent', set: { household: 'solo' }, next: 'kids' }] },
  kids: { say: () => 'How many kids?', opts: [1, 2, 3, 4].map(n => ({ label: n === 4 ? '4 or more' : String(n), set: { kids: n }, next: 'home' })) },
  home: { say: () => 'Where do you live?', opts: [
    { label: 'Renting', set: { home: 'rent' }, next: 'rent' },
    { label: 'Own, with a mortgage', set: { home: 'mortgage' }, next: 'mortBal' },
    { label: 'Own, paid off', set: { home: 'owned' }, next: 'expenses' },
    { label: 'With family, or free', set: { home: 'family' }, next: 'expenses' }] },
  rent: { say: () => "What's the rent each month?", num: 'rent', next: 'expenses' },
  mortBal: { say: () => "What's left to pay on the mortgage?", num: 'mortBal', next: 'mortPay' },
  mortPay: { say: () => 'And the monthly payment?', num: 'mortPay', next: 'expenses' },
  expenses: { say: () => 'What does a normal month cost, all in? Rent, food, bills, transport, minimum debt payments, everything.',
    num: 'expenses', hints: m => {
      const out = [], seen = monthlyAvg('out');
      if (seen) out.push({ label: `What I've seen: ${fmt(seen)}/mo`, value: seen });
      if (m.income) out.push({ label: `About 80% of pay: ${fmt(roundNice(m.income * 0.8))}`, value: roundNice(m.income * 0.8) });
      return out;
    }, next: 'hasDebt' },
  hasDebt: { say: () => 'Do you owe money to anyone, apart from a house? Cards, loans, a car, phone plans, pay-later, family…', opts: [
    { label: 'Yes', next: 'debt' }, { label: 'No debt 🙌', next: 'ef' }] },
  debt: { say: m => m._debts.length || openDebts().length ? 'Got it. Another one? Add it, or tap "That\'s all".'
    : 'List them one at a time. A name, the balance and the minimum payment are enough.', form: 'debt', next: 'ef' },
  ef: { say: () => 'Which stash holds money only for emergencies?', opts: () => [
    ...[...S.accounts].sort((a, b) => EF_NAME.test(b.name) - EF_NAME.test(a.name)).map(a => ({ label: `${a.icon} ${a.name}`, set: { ef: a.id }, next: 'starter' })),
    { label: '＋ Make me one', set: { ef: 'new' }, next: 'starter' }] },
  starter: { say: () => `Step 1 is a small cushion, saved fast. Ramsey's number is $1,000 in the US, enough for a flat tire or a broken phone. What's right for you?`,
    num: 'starter', hints: starterHints, prefill: m => m.starter || starterGuess(m), next: 'retire' },
  retire: { say: () => 'Are you putting anything toward retirement right now?', opts: [
    [0, 'No'], [3, 'A little (under 5%)'], [8, '5 to 10%'], [12, '10 to 15%'], [15, '15% or more']].map(([v, l]) => ({ label: l, set: { retire: v }, next: afterRetire })) },
  college: { say: () => "Saving anything for the kids' education?", opts: [
    { label: 'Not yet', set: { college: 'none' }, next: 'giving' },
    { label: 'Started', set: { college: 'started' }, next: 'giving' },
    { label: 'On track', set: { college: 'ontrack' }, next: 'giving' }] },
  giving: { say: () => 'Last one. Do you give regularly? Charity, zakat, church, helping family…', opts: [
    { label: 'Yes, regularly', set: { giving: 'yes' }, next: 'done' },
    { label: 'Sometimes', set: { giving: 'some' }, next: 'done' },
    { label: 'Not right now', set: { giving: 'no' }, next: 'done' }] },
  done: { mood: 'proud', say: () => '' },
};

function saveAnswers(m) {
  const draft = m._debts || [];
  delete m._debts;
  if (m.ef === 'new') {
    const a = { id: uid(), name: 'Emergency', icon: '☂️', color: '#e34948', goal: 0, createdAt: Date.now() };
    S.accounts.push(a);
    m.ef = a.id;
  }
  if (!m.efMonths) m.efMonths = suggestEfMonths(m);
  m.answeredAt = Date.now();
  for (const d of draft) if (!debtById(d.id)) S.debts.push(d);
  const hd = S.debts.find(d => d.kind === 'house');
  if (m.home === 'mortgage' && m.mortBal > 0) {
    if (hd) {
      if (Math.abs(debtBal(hd) - m.mortBal) > 0.5) Object.assign(hd, { base: m.mortBal, baseAt: Date.now(), original: Math.max(hd.original || 0, m.mortBal) });
      hd.min = m.mortPay || hd.min;
    } else {
      S.debts.push({ id: uid(), name: 'Mortgage', kind: 'house', base: m.mortBal, baseAt: Date.now(), original: m.mortBal, min: m.mortPay || 0, rate: 0, createdAt: Date.now() });
    }
  }
  S.money = m;
  commit();
}

function interview(startAt = 'hello') {
  const m = JSON.parse(JSON.stringify(S.money || {}));
  m._debts = [];
  const log = [], stack = [];
  let node = QS[startAt] ? startAt : 'hello', face = null;
  openSheet(`
    <div class="sheet-head"><button class="x" id="qBack" aria-label="Back">‹</button>
      <svg class="echo q-echo" viewBox="0 0 120 72" aria-hidden="true">${$('#echo .echo').innerHTML}</svg>
      <h2>Find my step</h2><button class="x" data-close aria-label="Close">✕</button></div>
    <div class="chat" id="chat"></div>
    <div class="q-ctl" id="ctl"></div>`, (sh, ctl) => {
    face = makeEcho($('.q-echo', sh), null);
    ctl.onClose = () => face && face.destroy();
    const chat = $('#chat', sh), box = $('#ctl', sh);

    const answer = (label, set, next) => {
      stack.push({ node, m: JSON.stringify(m), logLen: log.length });
      log.push({ q: QS[node].say(m), a: label });
      Object.assign(m, set || {});
      node = typeof next === 'function' ? next(m) : next;
      draw();
    };
    $('#qBack', sh).onclick = () => {
      const prev = stack.pop();
      if (!prev) return;
      node = prev.node;
      Object.keys(m).forEach(k => delete m[k]);
      Object.assign(m, JSON.parse(prev.m));
      log.length = prev.logLen;
      draw();
    };

    function draw() {
      const q = QS[node];
      $('#qBack', sh).style.visibility = stack.length ? 'visible' : 'hidden';
      face.set(q.mood || 'thinking');
      if (node === 'done') return drawDone();
      chat.innerHTML = log.map(x => `<div class="msg from-echo">${h(x.q)}</div><div class="msg from-me">${h(x.a)}</div>`).join('') +
        `<div class="msg from-echo now">${h(q.say(m))}</div>`;
      if (q.opts) {
        const opts = typeof q.opts === 'function' ? q.opts(m) : q.opts;
        box.innerHTML = `<div class="q-opts">${opts.map((o, i) => `<button class="q-opt" data-o="${i}">${h(o.label)}</button>`).join('')}</div>`;
        $$('[data-o]', box).forEach(b => b.onclick = () => { const o = opts[b.dataset.o]; answer(o.label, o.set, o.next); });
      } else if (q.num) {
        const hints = q.hints ? q.hints(m) : [];
        const pre = q.prefill ? q.prefill(m) : m[q.num];
        box.innerHTML = `
          <div class="amount-wrap"><span class="cur">${h(S.settings.currency)}</span>
            <input class="amount num" id="qn" inputmode="decimal" placeholder="0" value="${pre || ''}" aria-label="Amount"></div>
          ${hints.length ? `<div class="chips" style="margin-top:8px;flex-wrap:wrap">${hints.map((x, i) => `<button class="chip" data-hint="${i}">${h(x.label)}</button>`).join('')}</div>` : ''}
          <div class="btn-row" style="margin-top:10px">${q.skip ? `<button class="btn ghost" id="qSkip">${h(q.skip)}</button>` : ''}<button class="btn" id="qNext">Next</button></div>`;
        const inp = $('#qn', box);
        const submit = () => {
          const v = parseAmt(inp.value);
          const zero = q.zeroOk && q.zeroOk(m);
          if (!(v > 0) && !(zero && v === 0) && !(zero && inp.value.trim() === '')) { inp.focus(); face.set('thinking'); return toast('Type a number'); }
          answer(fmt(v || 0), { [q.num]: v || 0 }, q.next);
        };
        $('#qNext', box).onclick = submit;
        inp.onkeydown = e => { if (e.key === 'Enter') submit(); };
        $$('[data-hint]', box).forEach(b => b.onclick = () => { inp.value = hints[b.dataset.hint].value; submit(); });
        const sk = $('#qSkip', box);
        if (sk) sk.onclick = () => answer(q.skip, { [q.num]: 0 }, q.next);
        setTimeout(() => inp.focus(), 250);
      } else if (q.form === 'debt') drawDebtForm();
      chat.lastElementChild.scrollIntoView({ block: 'nearest' });
    }

    function drawDebtForm() {
      const listed = [...openDebts().map(d => ({ ...d, base: debtBal(d) })), ...m._debts];
      box.innerHTML = `
        ${listed.length ? `<div class="card" style="padding:4px 14px;margin-bottom:10px">${listed.map(d => `<div class="kv"><span>${DEBT_KINDS[d.kind][0]} ${h(d.name)}</span><span class="num">${fmt(d.base)} · ${fmt(d.min || 0)}/mo</span></div>`).join('')}</div>` : ''}
        <input class="input" id="dName" maxlength="40" placeholder="Name: Visa card, car loan, Uncle Ali…">
        <div class="row" style="margin-top:8px"><input class="input num" id="dBal" inputmode="decimal" placeholder="Balance"><input class="input num" id="dMin" inputmode="decimal" placeholder="Minimum / month"></div>
        <input class="input num" id="dRate" inputmode="decimal" placeholder="Interest % per year (optional)" style="margin-top:8px">
        <div class="btn-row" style="margin-top:10px"><button class="btn ghost" id="dAdd">Add</button><button class="btn" id="dDone">That's all</button></div>`;
      const read = () => {
        const name = $('#dName', box).value.trim(), base = parseAmt($('#dBal', box).value);
        if (!name && !$('#dBal', box).value) return null;
        if (!name) { toast('Give it a name'); return false; }
        if (!(base > 0)) { toast("What's the balance?"); return false; }
        const now = Date.now();
        return { id: uid(), name, kind: guessKind(name), base, baseAt: now, original: base, min: parseAmt($('#dMin', box).value) || 0,
          rate: parseAmt($('#dRate', box).value) || 0, createdAt: now };
      };
      $('#dAdd', box).onclick = () => {
        const d = read();
        if (!d) { if (d === null) toast('Fill in a debt first'); return; }
        m._debts.push(d);
        face.set('happy', 800);
        draw();
      };
      $('#dDone', box).onclick = () => {
        const d = read();
        if (d === false) return;
        if (d) m._debts.push(d);
        const n = m._debts.length;
        answer(n ? `${n} debt${n > 1 ? 's' : ''}` : 'That\'s all', null, 'ef');
      };
      setTimeout(() => $('#dName', box).focus(), 250);
    }

    function drawDone() {
      const old = S.money;
      saveAnswers(JSON.parse(JSON.stringify(m)));
      m._debts = [];
      const s = stepState();
      const st = STEPS[s.n];
      chat.innerHTML = log.map(x => `<div class="msg from-echo">${h(x.q)}</div><div class="msg from-me">${h(x.a)}</div>`).join('') +
        `<div class="msg from-echo now">${s.crisis
          ? `Thanks for telling me. For now we're in pause mode: Four Walls first. When work comes back, you'll pick up at Baby Step ${s.n}: ${h(st.short)}.`
          : `You're on <b>Baby Step ${s.n}: ${h(st.title)}</b>. ${h(s.text)}. I made you a map and a to-do list.`}</div>`;
      box.innerHTML = '<button class="btn" id="qGo">Show me the plan</button>';
      $('#qGo', box).onclick = () => { closeSheet(); setTimeout(() => go('/coach'), 60); };
      face.set('proud');
      chat.lastElementChild.scrollIntoView({ block: 'nearest' });
      if (!old) setTimeout(() => react(`Baby Step ${s.n}. Let's go get it.`, 'proud', 4000), 400);
    }

    draw();
  });
}

// ---------- debts page ----------
function debtRow(d, target, month) {
  const k = DEBT_KINDS[d.kind] || DEBT_KINDS.other, bal = debtBal(d), paid = bal <= 0.004;
  const sub = paid ? `Paid off${d.paidAt ? ' ' + fmtDay(d.paidAt) : ''}`
    : `${fmt(d.min || 0)}/mo${d.rate ? ` · ${d.rate}%` : ''}${month ? ` · gone ~${fmtMonth(Date.now() + month * MONTH)}` : ''}`;
  return `<button class="li ${target ? 'target' : ''}" data-debt="${d.id}"><span class="li-ico">${paid ? '✅' : k[0]}</span>
    <div class="li-main"><div class="li-title">${target ? '🎯 ' : ''}${h(d.name)}</div><div class="li-sub">${h(sub)}</div></div>
    <div class="li-amt num">${fmt(bal)}</div></button>`;
}

function debtsView() {
  const open = openDebts(), house = houseDebt();
  const paid = S.debts.filter(d => d.kind !== 'house' && debtBal(d) <= 0.004);
  const extra = snowExtra(), sb = snowball(open, extra);
  const total = open.reduce((x, d) => x + debtBal(d), 0);
  const prog = debtProgress();
  return `
  <button class="back" data-go="/coach">‹ Coach</button>
  <section class="card">
    <div class="label">Debt, not counting the house</div>
    <div class="big num">${fmt(total)}</div>
    ${S.debts.some(d => d.kind !== 'house') ? `<div class="progress"><i style="width:${(prog * 100).toFixed(1)}%"></i></div><div class="label">${pct(prog)} paid off</div>` : ''}
    ${open.length ? `<div class="eta">${sb.months === Infinity ? "At this rate the debt isn't shrinking. Raise the extra below."
      : `Snowball of ${fmt(sb.budget)}/mo: debt-free in ${monthsText(sb.months)} (${fmtMonth(Date.now() + sb.months * MONTH)}). Interest along the way: about ${fmt(sb.interest)}.`}</div>` : ''}
  </section>
  ${open.length ? `<section class="card">
    <h3>Extra per month</h3>
    <p class="label" style="margin-top:-4px">On top of the minimums. Everything you can find.${surplus() ? ` Your numbers leave about ${fmt(surplus())} spare.` : ''}</p>
    <div class="row"><input class="input num" id="extra" inputmode="decimal" value="${extra || ''}" placeholder="0"><button class="btn small" id="setExtra">Update</button></div>
  </section>` : ''}
  <div class="sec-title"><span>Smallest first</span><button class="link" id="addDebt">＋ Add a debt</button></div>
  <section class="card list">${open.length ? open.map((d, i) => debtRow(d, i === 0, sb.done[d.id])).join('') : '<div class="empty">No debts here 🙌</div>'}</section>
  ${house ? `<div class="sec-title"><span>The house (Baby Step 6)</span></div><section class="card list">${debtRow(house)}</section>` : ''}
  ${paid.length ? `<div class="sec-title"><span>Paid off</span></div><section class="card list">${paid.map(d => debtRow(d)).join('')}</section>` : ''}
  <p class="fine">The planner simulates every month: interest is added, each debt gets its minimum, and everything left goes to the smallest balance.</p>`;
}

function wireDebts(root) {
  $$('[data-debt]', root).forEach(b => b.onclick = () => debtSheet(debtById(b.dataset.debt)));
  $('#addDebt', root).onclick = () => debtSheet();
  const se = $('#setExtra', root);
  if (se) se.onclick = () => {
    const v = parseAmt($('#extra', root).value);
    if (!(v >= 0)) return toast('Enter an amount');
    if (!S.money) return toast('Answer the Coach questions first');
    S.money.snowball = v;
    commit();
    echo.set('thinking', 1200);
  };
}

function debtSheet(d) {
  const isNew = !d;
  const st = d ? { ...d, bal: debtBal(d) } : { name: '', kind: 'card', bal: '', min: '', rate: '' };
  openSheet(`
    <div class="sheet-head"><h2>${isNew ? 'Add a debt' : h(d.name)}</h2><button class="x" data-close aria-label="Close">✕</button></div>
    <div class="field"><span class="label">Name</span><input class="input" id="name" maxlength="40" placeholder="Visa card, car loan, Uncle Ali…" value="${h(st.name)}"></div>
    <div class="field"><span class="label">Kind</span><div class="chips" style="flex-wrap:wrap" id="kinds"></div></div>
    <div class="field"><span class="label">Balance now</span><div class="amount-wrap"><span class="cur">${h(S.settings.currency)}</span>
      <input class="amount num" id="bal" inputmode="decimal" value="${st.bal || ''}" placeholder="0" aria-label="Balance"></div></div>
    <div class="row"><div class="field" style="flex:1"><span class="label">Minimum / month</span><input class="input num" id="min" inputmode="decimal" value="${st.min || ''}" placeholder="0"></div>
      <div class="field" style="flex:1"><span class="label">Interest % / year</span><input class="input num" id="rate" inputmode="decimal" value="${st.rate || ''}" placeholder="optional"></div></div>
    <button class="btn" id="save">${isNew ? 'Add debt' : 'Save'}</button>
    ${isNew ? '' : `<div class="btn-row" style="margin-top:8px"><button class="btn ghost" id="pay">Log a payment</button><button class="btn danger" id="del">Delete</button></div>`}`, sh => {
    const drawKinds = () => {
      $('#kinds', sh).innerHTML = Object.entries(DEBT_KINDS).map(([k, [ico, name]]) =>
        `<button class="chip ${st.kind === k ? 'on' : ''}" data-kind="${k}">${ico} ${h(name)}</button>`).join('');
      $$('[data-kind]', sh).forEach(b => b.onclick = () => { st.kind = b.dataset.kind; st.kindPicked = true; drawKinds(); });
    };
    drawKinds();
    $('#name', sh).oninput = e => { if (!st.kindPicked && isNew) { st.kind = guessKind(e.target.value); drawKinds(); } };
    $('#save', sh).onclick = () => {
      const name = $('#name', sh).value.trim(), bal = parseAmt($('#bal', sh).value);
      if (!name) return toast('Give it a name');
      if (!(bal >= 0)) return toast("What's the balance?");
      const min = parseAmt($('#min', sh).value) || 0, rate = parseAmt($('#rate', sh).value) || 0;
      const now = Date.now();
      if (isNew) S.debts.push({ id: uid(), name, kind: st.kind, base: bal, baseAt: now, original: bal, min, rate, createdAt: now });
      else {
        Object.assign(d, { name, kind: st.kind, min, rate });
        // A new statement balance resets the starting point; payments before it are already counted.
        if (Math.abs(bal - debtBal(d)) > 0.004) Object.assign(d, { base: bal, baseAt: now, original: Math.max(d.original || d.base, bal) });
      }
      closeSheet();
      commit();
      if (isNew) react(st.kind === 'house' ? 'Mortgage noted. That one waits for Step 6.' : `${name} is on the list. It's going down.`, 'thinking');
    };
    if (!isNew) {
      $('#pay', sh).onclick = () => payDebt(d);
      $('#del', sh).onclick = () => {
        if (!confirm(`Remove "${d.name}" from your debts? Payments you logged stay in your history.`)) return;
        S.debts = S.debts.filter(x => x.id !== d.id);
        closeSheet();
        commit();
      };
    }
  });
}

// ---------- plan: a zero-based budget ----------
const PLAN_LINES = ['giving', 'save', 'housing', 'utilities', 'food', 'transport', 'health', 'insurance', 'debt', 'kids', 'personal', 'eatout', 'fun', 'other'];
const lineInfo = k => k === 'save' ? { icon: '🏦', name: 'Saving' } : CATS[k];
const planIncome = () => (S.plan && S.plan.income) || (S.money && S.money.income) || 0;
const planTotal = () => Object.values((S.plan && S.plan.lines) || {}).reduce((s, v) => s + (+v || 0), 0);
const planSet = () => S.plan && S.plan.month === monthKey() && planTotal() > 0;

// Guideline shares, adjusted for your Baby Step, then whatever's left goes to that step.
function suggestPlan(income) {
  const m = S.money || {}, s = stepState(), n = s ? s.n : 3;
  const lean = n <= 2 || m.work === 'none';
  const pctOf = { giving: m.giving === 'no' ? 0 : m.giving === 'some' ? 5 : 10, housing: 25, utilities: 7, food: 12, transport: 10,
    health: 5, insurance: 5, kids: m.kids ? 5 : 0, personal: lean ? 3 : 5, eatout: lean ? 1 : 4, fun: lean ? 1 : 5, other: 4 };
  const L = {};
  for (const k in pctOf) L[k] = roundNice(income * pctOf[k] / 100);
  if (m.home === 'rent' && m.rent) L.housing = m.rent;
  else if (m.home === 'mortgage') { const hd = houseDebt(); if (hd && hd.min) L.housing = hd.min; }
  else if (m.home === 'family') L.housing = 0;
  else if (m.home === 'owned') L.housing = roundNice(income * 0.05);
  L.debt = round2(openDebts().reduce((x, d) => x + (d.min || 0), 0));
  L.save = 0;
  let rest = income - Object.values(L).reduce((a, b) => a + b, 0);
  // Over budget: wants go first, then up to 40% of the flexible needs.
  for (const [k, max] of [['fun', 1], ['eatout', 1], ['personal', 1], ['other', 1], ['transport', 0.4], ['utilities', 0.4], ['food', 0.4]]) {
    if (rest >= 0) break;
    const cut = Math.min(L[k] * max, -rest);
    L[k] = round2(L[k] - cut);
    rest += cut;
  }
  if (rest > 0) {
    if (n === 2 || n === 6) L.debt = round2(L.debt + rest);
    else L.save = round2(L.save + rest);
  }
  return L;
}

function planView() {
  const inc = planIncome(), lines = (S.plan && S.plan.lines) || {}, total = planTotal(), left = round2(inc - total);
  const f = flows(monthStart(0));
  const actual = k => k === 'save' ? Math.max(0, f.income - f.out) : (f.spend[k] || 0);
  const has = total > 0, fresh = planSet();
  const zero = Math.abs(left) < 0.5;
  return `
  <button class="back" data-go="/">‹ Home</button>
  <section class="card">
    <div class="row between"><h3 style="margin:0">${h(monthName())} plan</h3><button class="btn small" id="editPlan">${has ? (fresh ? 'Edit' : 'Review') : 'Make my plan'}</button></div>
    <div class="label" style="margin-top:10px">Money coming in</div>
    <div class="big num">${fmt(inc)}</div>
    ${has ? `<div class="zero ${zero ? 'ok' : left > 0 ? 'left' : 'over'}">${zero ? `✓ Every ${unit()} has a job` : left > 0 ? `${fmt(left)} still needs a job` : `${fmt(-left)} more planned than comes in`}</div>`
      : `<p class="label">A zero-based plan gives every ${unit()} a job before the month starts. I'll fill it from healthy guidelines and your Baby Step, then you adjust.</p>`}
    ${has && !fresh ? `<div class="eta">This plan is from an earlier month. New month, quick review?</div>` : ''}
  </section>
  ${has ? `<section class="card"><h3>Planned vs. this month</h3><div class="bars">${PLAN_LINES.filter(k => lines[k] || actual(k)).map(k => {
    const p = lines[k] || 0, a = actual(k), r = p ? a / p : a ? 2 : 0, info = lineInfo(k);
    const color = k === 'save' ? 'var(--good)' : r > 1 ? 'var(--bad)' : r > 0.85 ? 'var(--warn)' : 'var(--accent)';
    return `<div class="bar-row"><span>${info.icon} ${h(info.name)}</span><span class="num"><b>${fmt(a)}</b> <span class="muted">of ${fmt(p)}</span></span>
      <span class="bar-track"><i style="width:${Math.min(100, r * 100).toFixed(1)}%;background:${color}"></i></span></div>`;
  }).join('')}</div></section>` : ''}
  <p class="fine">"Saving" here is what came in minus what went out this month. Categories come from the "What for?" on each spend.</p>`;
}

function wirePlan(root) { $('#editPlan', root).onclick = planSheet; }

function planSheet() {
  const draft = { income: planIncome(), lines: { ...((S.plan && S.plan.lines) || {}) } };
  if (!Object.values(draft.lines).some(v => v) && draft.income) draft.lines = suggestPlan(draft.income);
  openSheet(`
    <div class="sheet-head"><h2>Plan ${h(monthName())}</h2><button class="x" data-close aria-label="Close">✕</button></div>
    <div class="field"><span class="label">Money coming in this month</span><div class="amount-wrap"><span class="cur">${h(S.settings.currency)}</span>
      <input class="amount num" id="pInc" inputmode="decimal" value="${draft.income || ''}" placeholder="0" aria-label="Income"></div></div>
    <div class="zero" id="pLeft"></div>
    <div class="plan-lines">${PLAN_LINES.map(k => `<label class="plan-line"><span>${lineInfo(k).icon} ${h(lineInfo(k).name)}<small id="pg-${k}"></small></span>
      <input class="input num" data-line="${k}" inputmode="decimal" value="${draft.lines[k] || ''}" placeholder="0"></label>`).join('')}</div>
    <div class="btn-row" style="margin-top:12px"><button class="btn ghost" id="pFill">Fill from guidelines</button><button class="btn" id="pSave">Save plan</button></div>`, sh => {
    const lean = leanNow(), s = stepState();
    const hint = k => k === 'debt' && s && s.n === 2 ? 'Step 2: as much as you can' : lean && GUIDE[k].lean != null ? `Steps 1–2: under ${GUIDE[k].lean}%` : `guide ${guideText(k)}`;
    const update = () => {
      const total = Object.values(draft.lines).reduce((s, v) => s + (+v || 0), 0), left = round2(draft.income - total);
      const el = $('#pLeft', sh);
      el.className = 'zero ' + (Math.abs(left) < 0.5 ? 'ok' : left > 0 ? 'left' : 'over');
      el.textContent = Math.abs(left) < 0.5 ? `✓ Every ${unit()} has a job` : left > 0 ? `${fmt(left)} still needs a job` : `${fmt(-left)} over what comes in`;
      for (const k of PLAN_LINES) {
        const v = draft.lines[k] || 0;
        $('#pg-' + k, sh).textContent = draft.income && v ? ` ${Math.round(v / draft.income * 100)}% · ${hint(k)}` : ` ${hint(k)}`;
      }
    };
    $('#pInc', sh).oninput = e => { draft.income = parseAmt(e.target.value) || 0; update(); };
    $$('[data-line]', sh).forEach(i => i.oninput = () => { draft.lines[i.dataset.line] = parseAmt(i.value) || 0; update(); });
    $('#pFill', sh).onclick = () => {
      if (!draft.income) { $('#pInc', sh).focus(); return toast('How much comes in this month?'); }
      draft.lines = suggestPlan(draft.income);
      $$('[data-line]', sh).forEach(i => { i.value = draft.lines[i.dataset.line] || ''; });
      update();
      echo.set('thinking', 1200);
    };
    $('#pSave', sh).onclick = () => {
      if (!draft.income) { $('#pInc', sh).focus(); return toast('How much comes in this month?'); }
      const lines = {};
      for (const k of PLAN_LINES) if (draft.lines[k] > 0) lines[k] = round2(draft.lines[k]);
      S.plan = { income: draft.income, lines, month: monthKey() };
      const left = round2(draft.income - planTotal());
      closeSheet();
      commit();
      react(Math.abs(left) < 0.5 ? `Every ${unit()} has a job. That's a real budget.` : left > 0 ? `Saved. ${fmt(left)} still has no job, though.` : 'Saved, but it plans more than comes in. Trim something?', Math.abs(left) < 0.5 ? 'proud' : 'thinking', 4500);
    };
    update();
  });
}

// ---------- advisor: the check-up ----------
// Shares of take-home pay. Housing ≤25%, giving 10% and ~5% miscellaneous are Ramsey's;
// the rest are common planner guidelines. `lean` applies during Baby Steps 1–2.
const GUIDE = {
  housing: { lo: 0, hi: 25 }, utilities: { lo: 5, hi: 10 }, food: { lo: 10, hi: 15 }, eatout: { lo: 0, hi: 5, lean: 2 },
  transport: { lo: 5, hi: 15 }, health: { lo: 5, hi: 10 }, insurance: { lo: 5, hi: 10 }, debt: { lo: 0, hi: 10, free: true },
  kids: { lo: 0, hi: 10 }, personal: { lo: 5, hi: 10, lean: 3 }, fun: { lo: 5, hi: 10, lean: 1 }, giving: { lo: 10, hi: 15, floor: true },
  other: { lo: 0, hi: 5 }, save: { lo: 10, hi: 20, floor: true },
};
const NEEDS = ['housing', 'utilities', 'food', 'transport', 'health', 'insurance', 'debt', 'kids'];
const WANTS = ['eatout', 'fun', 'personal', 'other'];
function guideText(k) {
  const g = GUIDE[k];
  if (!g) return '';
  if (g.floor) return `${g.lo}%+`;
  return g.lo ? `${g.lo}–${g.hi}%` : `up to ${g.hi}%`;
}
const leanNow = () => { const s = stepState(); return !!s && (s.n <= 2 || s.crisis); };

// Pay arrives in lumps, so the current month counts as a whole month, not a prorated one.
function periodOf(k) {
  if (k === 'last') return { from: monthStart(-1), to: monthStart(0), months: 1, label: 'Last month' };
  if (k === '3m') return { from: monthStart(-3), to: monthStart(0), months: 3, label: 'Last 3 months' };
  return { from: monthStart(0), to: Date.now() + 1, months: 1, label: 'This month so far' };
}

// A 0–100 score from five things that matter most, each with a plain-language reason.
function health(f, income, months) {
  const sp = k => (f.spend[k] || 0) / income;
  const sr = (income - f.out) / income, housing = sp('housing');
  const wants = WANTS.reduce((s, k) => s + sp(k), 0);
  const debts = openDebts(), debtLeft = debts.reduce((s, d) => s + debtBal(d), 0);
  const monthly = (S.money && S.money.expenses) || f.out / months;
  const ef = efBalance(), efm = monthly ? ef / monthly : 0;
  const parts = [
    { name: 'Saving', max: 25, v: 25 * clamp(sr / 0.2, 0, 1),
      good: sr >= 0.15 && `You kept ${pct(sr)} of what came in. Excellent.`,
      bad: sr < 0 ? `You spent ${fmt(f.out - income)} more than came in.` : sr < 0.1 && `You kept ${pct(sr)} of income. Aim for 10–20%.` },
    { name: 'Housing', max: 20, v: housing <= 0.25 ? 20 : 20 * clamp((0.45 - housing) / 0.2, 0, 1),
      good: housing > 0 && housing <= 0.25 && `Housing is ${pct(housing)} of income, inside the 25% line.`,
      bad: housing > 0.25 && `Housing takes ${pct(housing)}. Ramsey's line is 25%.` },
    { name: 'Debt', max: 20, v: debts.length ? 6 + 10 * debtProgress() : 20,
      good: !debts.length && 'No consumer debt. Huge.',
      bad: debts.length && `${debts.length} debt${debts.length > 1 ? 's' : ''} left: ${fmt(debtLeft)}. The snowball fixes this.` },
    { name: 'Safety net', max: 20, v: efm >= efMonths() ? 20 : efm >= 3 ? 16 : efm >= 1 ? 11 : ef >= starterTarget() ? 7 : ef > 0 ? 3 : 0,
      good: efm >= 3 && `${efm.toFixed(1)} months of expenses saved.`,
      bad: efm < 1 && (ef > 0 ? `Emergency savings cover about ${Math.max(1, Math.round(efm * 30))} days.` : 'No emergency savings found yet.') },
    { name: 'Wants', max: 15, v: wants <= 0.3 ? 15 : 15 * clamp((0.5 - wants) / 0.2, 0, 1),
      good: wants <= 0.2 && f.out > 0 && `Wants are a modest ${pct(wants)} of income.`,
      bad: wants > 0.3 && `Eating out, fun and personal take ${pct(wants)}. 50/30/20 says 30% max.` },
  ];
  const score = Math.round(parts.reduce((s, p) => s + p.v, 0));
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
  return { score, grade, parts, sr, housing, wants };
}
const VERDICT = {
  A: "Honestly? You're crushing it.", B: "Solid. A couple of tweaks and you're elite.", C: "Not bad. There's real room to grow.",
  D: "We've got work to do, and I've got ideas.", F: "Rough patch. Let's fix the basics first: the Four Walls.",
};

// The check-up for a period, or null when there's no income to measure against.
function checkup(k) {
  const per = periodOf(k), f = flows(per.from, per.to);
  const stated = statedIncome() * per.months;
  const tracked = f.income > 0 && (!stated || f.income >= stated * 0.5);
  const income = tracked ? f.income : stated;
  if (!income) return null;
  return { per, f, income, tracked, monthly: income / per.months, hs: health(f, income, per.months) };
}

function advisorTip() {
  const c = checkup('month') || checkup('last');
  if (!c) return 'Tell me your take-home pay and I can grade your month.';
  const bad = c.hs.parts.filter(p => p.bad).map(p => p.bad), good = c.hs.parts.filter(p => p.good).map(p => p.good);
  return pickOne([`${c.per.label}: ${c.hs.grade} (${c.hs.score}/100). ${VERDICT[c.hs.grade]}`, ...bad, ...bad, ...good]);
}

function checkupView() {
  const k = ui.ck || 'month';
  const chips = `<div class="chips">${[['month', 'This month'], ['last', 'Last month'], ['3m', '3 months']].map(([v, l]) =>
    `<button class="chip ${k === v ? 'on' : ''}" data-ck="${v}">${l}</button>`).join('')}</div>`;
  const c = checkup(k);
  if (!c) return `
    <button class="back" data-go="/">‹ Home</button>
    <section class="card">
      <h3>Check-up</h3>${chips}
      <p class="label" style="margin-top:12px">To grade your spending I need to know what comes in. Log your pay with + Add, or tell me your monthly take-home:</p>
      <div class="row"><input class="input num" id="ckInc" inputmode="decimal" placeholder="${h(S.settings.currency)} per month"><button class="btn small" id="ckSave">Save</button></div>
    </section>
    <section class="card"><h3>Guidelines</h3>${lessonHTML(lessonById('guidelines').body)}</section>`;
  const { per, f, income, hs, monthly } = c;
  const lean = leanNow();
  const share = k2 => (f.spend[k2] || 0) / income;
  const needs = NEEDS.reduce((s, x) => s + share(x), 0), wants = WANTS.reduce((s, x) => s + share(x), 0), giving = share('giving');
  const saved = Math.max(0, 1 - needs - wants - giving), over = Math.max(0, needs + wants + giving - 1);
  const cats = Object.keys(CATS).filter(x => f.spend[x] || ['housing', 'food', 'giving'].includes(x));
  const row = x => {
    const g = GUIDE[x], p = share(x) * 100, hi = lean && g.lean != null ? g.lean : g.hi;
    const st = g.free && lean ? 'ok' : g.floor ? (p >= g.lo ? 'ok' : 'low') : p <= hi + 0.5 ? 'ok' : p <= hi * 1.3 + 1 ? 'watch' : 'high';
    const scale = Math.max(hi * 2, p, 10);
    return `<div class="ck-row ${st}">
      <div class="row between"><span>${CATS[x].icon} ${h(CATS[x].name)}</span><span class="num"><b>${fmt(f.spend[x] || 0)}</b> · ${p.toFixed(p < 10 ? 1 : 0)}%</span></div>
      <div class="ck-track"><span class="ck-band" style="left:${(g.lo / scale * 100).toFixed(1)}%;width:${((hi - g.lo) / scale * 100).toFixed(1)}%"></span>
        <i style="width:${Math.min(100, p / scale * 100).toFixed(1)}%"></i></div>
      <div class="label">${g.free && lean ? 'In Baby Step 2: as much as you can' : `Guide: ${lean && g.lean != null ? `under ${hi}% while in Baby Steps 1–2` : guideText(x)}`}</div></div>`;
  };
  return `
  <button class="back" data-go="/">‹ Home</button>
  <section class="card">
    ${chips}
    <div class="ck-top"><div class="grade g-${hs.grade}">${hs.grade}</div>
      <div><div class="big num">${hs.score}<span class="muted" style="font-size:18px">/100</span></div><div>${h(VERDICT[hs.grade])}</div></div></div>
    <div class="label">${h(per.label)} · ${c.tracked ? `${fmt(income)} came in` : `using your stated pay of ${fmt(statedIncome())}/mo`}</div>
  </section>
  ${hs.parts.some(p => p.good) ? `<section class="card"><h3>What's working</h3>${hs.parts.filter(p => p.good).map(p => `<div class="todo"><span class="todo-i">✅</span><div class="todo-t">${h(p.good)}</div></div>`).join('')}</section>` : ''}
  ${hs.parts.some(p => p.bad) ? `<section class="card"><h3>Fix next</h3>${hs.parts.filter(p => p.bad).map(p => `<div class="todo"><span class="todo-i">👉</span><div class="todo-t">${h(p.bad)}</div></div>`).join('')}</section>` : ''}
  <section class="card">
    <h3>Score breakdown</h3>
    <div class="bars">${hs.parts.map(p => `<div class="bar-row"><span>${h(p.name)}</span><b class="num">${Math.round(p.v)}/${p.max}</b>
      <span class="bar-track"><i style="width:${(p.v / p.max * 100).toFixed(1)}%;background:${p.v / p.max >= 0.75 ? 'var(--good)' : p.v / p.max >= 0.4 ? 'var(--warn)' : 'var(--bad)'}"></i></span></div>`).join('')}</div>
  </section>
  <section class="card">
    <h3>Needs, wants, giving, kept</h3>
    <div class="stack">${[[needs, 'var(--s1)'], [wants, 'var(--s2)'], [giving, 'var(--s3)'], [saved, 'var(--good)']].map(([v, col]) =>
      v > 0 ? `<i style="width:${(Math.min(1, v) * 100).toFixed(2)}%;background:${col}"></i>` : '').join('')}</div>
    <div class="legend"><span><i style="background:var(--s1)"></i>Needs ${pct(needs)}</span><span><i style="background:var(--s2)"></i>Wants ${pct(wants)}</span>
      <span><i style="background:var(--s3)"></i>Giving ${pct(giving)}</span><span><i style="background:var(--good)"></i>Kept ${pct(saved)}</span>${over ? `<span class="neg">Over by ${pct(over)}</span>` : ''}</div>
    <p class="label" style="margin:10px 0 0">The 50/30/20 rule of thumb: about 50% needs, 30% wants, 20% kept.</p>
  </section>
  <section class="card"><h3>Category by category</h3>${cats.map(row).join('')}</section>
  <section class="card">
    <h3>A healthy month on ${fmt(roundNice(monthly))}</h3>
    ${Object.keys(GUIDE).filter(x => x !== 'debt' && x !== 'kids').map(x => {
      const g = GUIDE[x], info = lineInfo(x), lo = roundNice(monthly * g.lo / 100), hi = roundNice(monthly * g.hi / 100);
      return `<div class="kv"><span>${info.icon} ${h(info.name)}</span><span class="num">${g.floor ? `${fmt(lo)} or more` : g.lo ? `${fmt(lo)} – ${fmt(hi)}` : `up to ${fmt(hi)}`}</span></div>`;
    }).join('')}
    <button class="btn ghost small" data-go="/plan" style="margin-top:12px">Turn this into my plan ›</button>
  </section>
  <p class="fine">Housing up to 25% of take-home, giving 10% and about 5% miscellaneous follow Dave Ramsey. The other ranges are common planner guidelines, and 50/30/20 is a popular rule of thumb. They aren't laws: if one runs high, another has to run lower.</p>`;
}

function wireCheckup(root) {
  $$('[data-ck]', root).forEach(b => b.onclick = () => { ui.ck = b.dataset.ck; route(); });
  const sv = $('#ckSave', root);
  if (sv) sv.onclick = () => {
    const v = parseAmt($('#ckInc', root).value);
    if (!(v > 0)) return toast('How much per month?');
    if (S.money) S.money.income = v;
    else S.plan = { ...S.plan, income: v };
    commit();
  };
}

// ---------- tools ----------
const TOOLS = [
  { id: 'ef', ico: '☂️', name: 'Emergency fund', fields: [
    ['costs', 'A normal month costs', () => (S.money && S.money.expenses) || monthlyAvg('out')],
    ['months', 'Months to cover', () => efMonths(), 'n'],
    ['have', 'Saved already', () => efBalance()],
    ['per', 'You can save per month', () => roundNice(efPace()) || surplus()]],
    calc: v => {
      const target = v.costs * v.months, gap = Math.max(0, target - v.have);
      return `<b class="num">${fmt(target)}</b> covers ${v.months} months.<br>${gap ? `${fmt(gap)} to go: ${v.per ? monthsText(gap / v.per) : 'set a monthly amount'}.` : 'You already have it 🎉'}`;
    } },
  { id: 'goal', ico: '🎯', name: 'Save for something', fields: [
    ['goal', 'It costs', () => 0], ['have', 'Saved already', () => 0], ['per', 'Per month', () => 0], ['by', 'Or: months until you need it', () => 0, 'n']],
    calc: v => {
      const gap = Math.max(0, v.goal - v.have);
      if (!v.goal) return 'Enter what it costs.';
      if (!gap) return 'Already there 🎉';
      return [v.per ? `At ${fmt(v.per)}/mo: ${monthsText(gap / v.per)} (${fmtMonth(Date.now() + gap / v.per * MONTH)}).` : '',
        v.by ? `To have it in ${v.by} months: <b class="num">${fmt(Math.ceil(gap / v.by))}</b>/mo.` : ''].filter(Boolean).join('<br>') || 'Add a monthly amount or a deadline.';
    } },
  { id: 'debts', ico: '❄️', name: 'Debt snowball planner', go: '/debts' },
  { id: 'house', ico: '🏠', name: 'How much house?', fields: [
    ['pay', 'Take-home pay per month', () => statedIncome()], ['down', 'Down payment saved', () => 0],
    ['rate', 'Interest rate % per year', () => 6, 'n'], ['years', 'Years (Ramsey: 15)', () => 15, 'n']],
    calc: v => {
      const max = v.pay * 0.25, pi = max * 0.8, loan = pvLoan(pi, v.rate / 1200, v.years * 12), price = loan + v.down;
      const down = price ? v.down / price : 0;
      return `Payment up to <b class="num">${fmt(roundNice(max))}</b>/mo (25% of take-home, including about 20% for taxes and insurance).<br>
        That buys about <b class="num">${fmt(roundNice(price))}</b> with ${fmt(v.down)} down.<br>${down >= 0.2 ? 'Down payment ≥20%: great.' : down >= 0.1 ? 'Down payment ≥10%: okay. 20% is better.' : 'Save at least 10% down first, ideally 20%.'}`;
    } },
  { id: 'car', ico: '🚗', name: 'Car check', fields: [
    ['income', 'Yearly income', () => statedIncome() * 12], ['value', 'Value of everything with a motor', () => 0]],
    calc: v => {
      const max = v.income / 2;
      return `Ramsey's rule: under <b class="num">${fmt(roundNice(max))}</b> total.<br>${!v.value ? '' : v.value <= max ? '✅ You are inside the line.' : `⚠️ ${fmt(v.value - max)} over the line. Consider selling down.`}`;
    } },
  { id: 'grow', ico: '🌱', name: 'Watch it grow', fields: [
    ['per', 'Invest per month', () => roundNice(grossIncome() * 0.15)], ['years', 'Years', () => 30, 'n'],
    ['rate', 'Yearly return % (guess)', () => 7, 'n'], ['start', 'Starting amount', () => 0]],
    calc: v => {
      const n = v.years * 12, end = fv(v.per, v.rate / 1200, n, v.start), put = v.start + v.per * n;
      const marks = [10, 20, 30, 40].filter(y => y < v.years).map(y => `${y} yrs: ${fmtShort(fv(v.per, v.rate / 1200, y * 12, v.start))}`).join(' · ');
      return `After ${v.years} years: <b class="num">${fmt(roundNice(end))}</b>.<br>You put in ${fmt(put)}; growth adds ${fmt(roundNice(end - put))}.${marks ? `<br><span class="muted">${marks}</span>` : ''}<br><span class="muted">Returns aren't guaranteed. This is an illustration.</span>`;
    } },
  { id: 'mort', ico: '🔨', name: 'Pay the house off early', fields: [
    ['bal', 'Left on the mortgage', () => { const hd = houseDebt(); return hd ? debtBal(hd) : 0; }],
    ['rate', 'Interest rate % per year', () => { const hd = houseDebt(); return (hd && hd.rate) || 6; }, 'n'],
    ['pay', 'Monthly payment', () => { const hd = houseDebt(); return (hd && hd.min) || 0; }], ['extra', 'Extra per month', () => 0]],
    calc: v => {
      if (!v.bal || !v.pay) return 'Enter the balance and the payment.';
      const a = payoff(v.bal, v.rate, v.pay), b = payoff(v.bal, v.rate, v.pay + v.extra);
      if (a.months === Infinity) return "That payment doesn't cover the interest.";
      return `Now: paid off in ${monthsText(a.months)}, ${fmt(roundNice(a.interest))} interest.${v.extra ? `<br>With ${fmt(v.extra)} extra: <b>${monthsText(b.months)}</b>, saving ${fmt(roundNice(a.interest - b.interest))} and ${monthsText(a.months - b.months).replace('about ', '')}.` : ''}`;
    } },
  { id: 'hours', ico: '⏱️', name: 'What it really costs', fields: [
    ['price', 'Price', () => 0], ['pay', 'Take-home per month', () => statedIncome()], ['hours', 'Hours you work per week', () => 40, 'n']],
    calc: v => {
      if (!v.price || !v.pay || !v.hours) return 'Enter a price, your pay and your hours.';
      const hourly = v.pay * 12 / 52 / v.hours, hrs = v.price / hourly;
      return `You earn about ${fmt(round2(hourly))} an hour.<br>That's <b>${hrs < 1 ? `${Math.round(hrs * 60)} minutes` : `${hrs.toFixed(1).replace(/\.0$/, '')} hours`}</b> of work${hrs >= 8 ? `, about ${(hrs / 8).toFixed(1).replace(/\.0$/, '')} work days` : ''}.`;
    } },
  { id: 'split', ico: '📊', name: 'Healthy budget for any income', fields: [['inc', 'Take-home per month', () => statedIncome()]],
    calc: v => !v.inc ? 'Enter an income.' : Object.keys(GUIDE).filter(x => x !== 'debt' && x !== 'kids').map(x => {
      const g = GUIDE[x], lo = roundNice(v.inc * g.lo / 100), hi = roundNice(v.inc * g.hi / 100);
      return `${lineInfo(x).icon} ${h(lineInfo(x).name)}: <b class="num">${g.floor ? `${fmt(lo)}+` : g.lo ? `${fmt(lo)}–${fmt(hi)}` : `up to ${fmt(hi)}`}</b>`;
    }).join('<br>') },
];

function toolsView() {
  return `
  <button class="back" data-go="/">‹ Home</button>
  <div class="sec-title"><span>🧮 Tools</span></div>
  ${TOOLS.map(t => t.go ? `<button class="card tool-link" data-go="${t.go}"><span>${t.ico} ${h(t.name)}</span><span class="muted">›</span></button>` : `
  <details class="card tool" data-tool="${t.id}">
    <summary>${t.ico} ${h(t.name)}</summary>
    <div class="tool-fields">${t.fields.map(([k, label, def, kind]) => {
      const v = def();
      return `<label><span class="label">${h(label)}</span><input class="input num" data-f="${k}" inputmode="decimal" value="${v ? (kind === 'n' ? v : round2(v)) : ''}" placeholder="0"></label>`;
    }).join('')}</div>
    <div class="tool-out" id="out-${t.id}"></div>
  </details>`).join('')}
  <p class="fine">Quick math to help you think. Real loans, taxes and returns vary.</p>`;
}

function wireTools(root) {
  for (const t of TOOLS) {
    const box = $(`[data-tool="${t.id}"]`, root);
    if (!box) continue;
    const run = () => {
      const v = {};
      $$('[data-f]', box).forEach(i => { v[i.dataset.f] = parseAmt(i.value) || 0; });
      $('#out-' + t.id, box).innerHTML = t.calc(v);
    };
    $$('[data-f]', box).forEach(i => i.oninput = run);
    run();
  }
}

// ---------- home card, reactions, greeting, check-ins ----------
function modeCard() {
  const md = mode();
  if (md === 'coach') {
    const s = stepState();
    if (!s) return `<section class="card mode-card"><div class="mc-head">🧭 Coach</div>
      <p>Coach mode is on. Let's find your Baby Step: a few questions, two minutes.</p>
      <div class="btn-row"><button class="btn small" data-go="/coach">Start</button><button class="btn small ghost" data-go="/book">Read the book</button></div></section>`;
    const st = STEPS[s.n], next = todos(s)[0];
    return `<section class="card mode-card">
      <div class="row between"><div class="mc-head">${s.crisis ? '🧯 Pause mode' : `🧭 Baby Step ${s.n}`} · ${h(st.short)}</div><a class="link" href="#/coach">Open ›</a></div>
      <div class="progress"><i style="width:${(s.p * 100).toFixed(1)}%"></i></div>
      <div class="label num">${h(s.text)}</div>
      ${next ? `<div class="mc-next">${next.ico} ${h(next.text)}</div>` : ''}</section>`;
  }
  if (md === 'advisor') {
    const c = checkup('month');
    if (!c) return `<section class="card mode-card"><div class="mc-head">🩺 Advisor</div>
      <p>Log your pay, or tell me your take-home, and I'll grade your month against healthy guidelines.</p>
      <div class="btn-row"><button class="btn small" data-go="/checkup">Check-up</button><button class="btn small ghost" data-go="/plan">Plan</button></div></section>`;
    const bad = c.hs.parts.find(p => p.bad);
    return `<section class="card mode-card">
      <div class="row between"><div class="mc-head">🩺 This month: <span class="grade-inline g-${c.hs.grade}">${c.hs.grade}</span> ${c.hs.score}/100</div><a class="link" href="#/checkup">Check-up ›</a></div>
      <div class="mc-next">${h(bad ? bad.bad : VERDICT[c.hs.grade])}</div>
      <div class="btn-row" style="margin-top:10px"><button class="btn small ghost" data-go="/plan">${planSet() ? 'My plan' : 'Make a plan'}</button><button class="btn small ghost" data-go="/tools">Tools</button></div></section>`;
  }
  return '';
}

let nagAt = 0;
function coachReact(t) {
  const s = stepState();
  if (!s) return false;
  const amt = fmt(t.amount), ef = efStash();
  if (t.type === 'sub' && t.debtId) {
    const d = debtById(t.debtId);
    if (!d) return false;
    const bal = debtBal(d);
    if (bal <= 0.004) {
      const next = openDebts()[0];
      react(next ? `💥 ${d.name} is GONE! Roll its ${fmt(d.min || 0)} into ${next.name}.` : `💥 ${d.name} is gone. That was the last one!`, 'proud', 6000);
    } else react(`${d.name}: ${fmt(bal)} left. Keep swinging.`, 'proud', 4000);
    return true;
  }
  if (t.type === 'sub' && s.n <= 2 && ['eatout', 'fun', 'personal'].includes(catOf(t)) && Date.now() - nagAt > 10 * 60e3) {
    nagAt = Date.now();
    const target = s.n === 1 ? (ef ? ef.name : 'your starter fund') : s.debts[0].name;
    react(pickOne([`Beans and rice 🍚 That ${amt} could have gone to ${target}.`, `${amt} on ${CATS[catOf(t)].name.toLowerCase()}… Baby Step ${s.n} says not yet.`,
      `Hmm, ${amt}. ${target} is still waiting.`]), 'worried', 4500);
    return true;
  }
  if (t.type === 'move' && ef && t.to === ef.id && s.n !== 2 && s.n <= 3) {
    const target = s.n === 1 ? s.starter : s.full;
    react(`${ef.name}: ${pct(clamp(s.ef / target, 0, 1))} of the way. ${fmt(Math.max(0, target - s.ef))} to go.`, 'proud', 4500);
    return true;
  }
  if (isIncome(t) && s.n <= 3 && !s.crisis) {
    if (s.n === 2) {
      const d = s.debts[0];
      setTimeout(() => ask(`${amt} in! Throw some at ${d.name}?`, [{ label: 'Pay it now', primary: true, fn: () => payDebt(d) }, { label: 'Later' }], 'happy'), 700);
      return true;
    }
    if (ef && t.acc !== ef.id) {
      setTimeout(() => ask(`${amt} in! Move some to ${ef.name}?`, [{ label: 'Move now', primary: true, fn: () => txSheet('move', { acc: t.acc, to: ef.id }) }, { label: 'Later' }], 'happy'), 700);
      return true;
    }
  }
  return false;
}

function advisorReact(t) {
  if (t.type === 'sub') {
    const c = catOf(t), spent = flows(monthStart(0)).spend[c] || 0, info = CATS[c];
    const planned = planSet() && S.plan.lines[c];
    if (planned) {
      const r = spent / planned;
      react(r > 1 ? `${info.icon} ${info.name} is over plan by ${fmt(spent - planned)} this month.` : `${info.icon} ${info.name}: ${fmt(spent)} of ${fmt(planned)} planned (${pct(r)}).`,
        r > 1 ? 'worried' : r > 0.85 ? 'thinking' : 'happy', 4500);
      return true;
    }
    const inc = statedIncome(), g = GUIDE[c];
    if (inc && g && !g.floor) {
      const p = spent / inc * 100;
      react(`${info.icon} ${info.name} this month: ${fmt(spent)}, ${Math.round(p)}% of pay (guide: ${guideText(c)}).`, p > g.hi ? 'worried' : 'thinking', 4500);
      return true;
    }
    return false;
  }
  if (isIncome(t)) {
    const f = flows(monthStart(0));
    if (!f.income) return false;
    const sr = (f.income - f.out) / f.income;
    react(`${fmt(t.amount)} in. This month you've kept ${pct(Math.max(0, sr))} of what came in so far.`, sr >= 0.1 ? 'happy' : 'thinking', 4500);
    return true;
  }
  return false;
}

// Called by afterTx; returns true when the mode had something to say.
function modeReact(t) {
  if (!P.prefs.talk) return false;
  if (mode() === 'coach') return coachReact(t);
  if (mode() === 'advisor') return advisorReact(t);
  return false;
}

// Called at startup; returns true when the mode greeted instead of Buddy.
function modeGreet() {
  const md = mode();
  if (md === 'coach') {
    const s = stepState();
    if (!s) {
      setTimeout(() => ask("Coach mode is on, but I don't know your numbers yet. Find your Baby Step?", [{ label: "Let's go", primary: true, fn: interview }, { label: 'Later' }], 'happy'), 900);
      return true;
    }
    setTimeout(() => react(s.crisis ? 'Pause mode: Four Walls first. You got this.' : `Baby Step ${s.n}: ${STEPS[s.n].short}. ${Math.round(s.p * 100)}% there.`, 'proud', 4500), 600);
    setTimeout(checkin, 6000);
    return true;
  }
  if (md === 'advisor') {
    const c = checkup('month');
    if (!c) return false;
    setTimeout(() => react(`This month so far: ${c.hs.grade}, ${c.hs.score}/100. Tap me for the check-up.`, 'thinking', 4500), 600);
    return true;
  }
  return false;
}

// Coach check-ins: at most one question per visit, each on its own schedule.
const CHECKINS = [
  { id: 'plan', when: () => !planSet(),
    q: () => [`New month, new plan. Give every ${unit()} a job?`, [{ label: 'Plan it', primary: true, fn: () => go('/plan') }, { label: 'Later' }]] },
  { id: 'job', every: 5 * DAY, when: s => s.crisis,
    q: () => ['How is the job hunt going?', [
      { label: 'Got a job! 🎉', primary: true, fn: () => { S.money.work = 'full'; commit(); react("YES! Pause mode over. Let's update your pay.", 'proud'); setTimeout(() => interview('income'), 1400); } },
      { label: 'Still looking', fn: () => react("Keep at it. Four Walls first, and apply every day. I'm rooting for you.", 'happy', 5000) }]] },
  { id: 'newdebt', every: 7 * DAY, when: s => s.n <= 2,
    q: () => ['Quick one: any new debt this week? Cards, loans, pay-later…', [
      { label: 'Nope 🙌', primary: true, fn: () => react('Proud of you. Keep it that way.', 'proud') },
      { label: 'Yes, add it', fn: () => debtSheet() }]] },
  { id: 'income', every: 21 * DAY, when: () => !S.tx.some(t => isIncome(t) && t.date > Date.now() - 35 * DAY),
    q: () => ['Did you get paid lately? Log it so my math uses real numbers.', [{ label: 'Log income', primary: true, fn: () => txSheet('add') }, { label: 'Later' }]] },
  { id: 'sell', every: 30 * DAY, when: s => s.n <= 2,
    q: () => ["Anything you could sell? Ramsey says sell so much the kids think they're next 😅", [{ label: 'Add an item', primary: true, fn: sellSomething }, { label: 'Not now' }]] },
  { id: 'stale', every: 90 * DAY, when: () => Date.now() - (S.money.answeredAt || 0) > 90 * DAY,
    q: () => [`Still bringing home about ${fmt(S.money.income || 0)} a month?`, [
      { label: 'Yes', primary: true, fn: () => { S.money.answeredAt = Date.now(); save(); } },
      { label: 'It changed', fn: () => interview('income') }]] },
  { id: 'give', every: 30 * DAY, when: s => s.n >= 4 && S.money.giving !== 'no' && !flows(monthStart(0)).spend.giving,
    q: () => ['Giving is part of the plan. Anyone you want to help this month?', [{ label: 'Log a gift', primary: true, fn: () => txSheet('sub', { cat: 'giving' }) }, { label: 'Later' }]] },
];
function checkin() {
  if (mode() !== 'coach' || !P.prefs.talk || sheet || $('#ask').classList.contains('show')) return;
  const s = stepState();
  if (!s) return;
  const c = S.coach;
  c.asked = c.asked || {};
  if (Date.now() - (c.lastAsk || 0) < 6 * 3600e3) return;
  for (const q of CHECKINS) {
    const due = q.every ? Date.now() - (c.asked[q.id] || 0) > q.every : c.asked[q.id] !== monthKey();
    if (!due || !q.when(s)) continue;
    c.asked[q.id] = q.every ? Date.now() : monthKey();
    c.lastAsk = Date.now();
    save();
    const [text, opts] = q.q();
    ask(text, opts);
    return;
  }
}

PAGES.coach = { view: coachView, wire: wireCoach, bar: true };
PAGES.debts = { view: debtsView, wire: wireDebts, bar: true };
PAGES.plan = { view: planView, wire: wirePlan, bar: true };
PAGES.checkup = { view: checkupView, wire: wireCheckup, bar: true };
PAGES.tools = { view: toolsView, wire: wireTools, bar: false };
