'use strict';
/* PocketStash — a fully offline pocket budget.
   State lives in localStorage, photos in IndexedDB. Nothing ever leaves the phone. */

// ---------- tiny helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const round2 = n => Math.round(n * 100) / 100;
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const DAY = 864e5;
// True inside the Android APK (Capacitor), false in a regular browser.
const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948', '#5b6170', '#8a5a3c'];
const DARK_INK = new Set(['#1baf7a', '#eda100', '#e87ba4']);
const ICONS = ['💳', '🏦', '🐷', '🎂', '📱', '🛍️', '🛟', '✈️', '🏠', '🚗', '🎮', '🎁', '🍔', '👟', '💻', '📚',
  '💍', '🐶', '🎓', '💊', '🎸', '🧾', '💼', '🌱', '⚽', '🎨', '🧳', '🪙', '💎', '📦', '🔧', '☕'];
const TEMPLATES = [
  { name: 'Main', icon: '💳', color: '#2a78d6' },
  { name: 'Savings', icon: '🏦', color: '#008300' },
  { name: 'Birthday money', icon: '🎂', color: '#e87ba4' },
  { name: 'New phone', icon: '📱', color: '#6250d6' },
  { name: 'Side hustle', icon: '🛍️', color: '#eb6834' },
  { name: 'Emergency', icon: '🛟', color: '#e34948' },
  { name: 'Trip', icon: '✈️', color: '#1baf7a' },
  { name: 'Fun', icon: '🎮', color: '#eda100' },
];
const CURRENCIES = ['$', '€', '£', '¥', '₹', 'MAD', 'DH', 'CHF'];
const RANGES = { '1M': 30, '3M': 91, '1Y': 365, 'All': 0 };
const TYPE = {
  add: { ico: '+', label: 'Added' },
  sub: { ico: '−', label: 'Spent' },
  move: { ico: '⇄', label: 'Moved' },
  buy: { ico: '📦', label: 'Bought' },
  sell: { ico: '🏷️', label: 'Sold' },
};

// ---------- state ----------
const KEY = 'pocketstash.v1';
const defaults = () => ({
  v: 1,
  settings: { currency: '$', theme: 'auto', view: 'all', talk: true, tutorialDone: false },
  accounts: [], // {id, name, icon, color, goal, createdAt}
  tx: [],       // {id, type, acc, to?, amount, reason, details, photos[], date, itemId?}
  items: [],    // {id, acc, name, cost, value, tag, status, boughtAt, soldAt?, soldPrice?, notes, photos[]}
  tags: ['Inventory', 'Gift card', 'Owed to me'],
});
let S = load();
const ui = { range: '3M', itemTab: 'holding' };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { /* fall through to fresh state */ }
  return defaults();
}
function normalize(d) {
  const base = defaults();
  return { ...base, ...d, settings: { ...base.settings, ...(d.settings || {}) } };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Could not save. Is the phone storage full?'); }
}
function commit() { save(); route(); }

// ---------- photos (IndexedDB) ----------
const Photos = (() => {
  let dbp;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('pocketstash-photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('p');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const run = async (mode, fn) => {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction('p', mode);
      const req = fn(t.objectStore('p'));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  };
  const urls = new Map();
  return {
    put: (id, blob) => run('readwrite', s => s.put(blob, id)),
    get: id => run('readonly', s => s.get(id)),
    keys: () => run('readonly', s => s.getAllKeys()),
    clear: () => { urls.clear(); return run('readwrite', s => s.clear()); },
    del(id) {
      if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
      return run('readwrite', s => s.delete(id)).catch(() => {});
    },
    async url(id) {
      if (urls.has(id)) return urls.get(id);
      const b = await this.get(id).catch(() => null);
      if (!b) return '';
      const u = URL.createObjectURL(b);
      urls.set(id, u);
      return u;
    },
  };
})();

function hydratePhotos(root) {
  $$('img[data-photo]', root).forEach(async img => {
    const u = await Photos.url(img.dataset.photo);
    if (u) img.src = u;
  });
}

function compressImage(file, max = 1400, q = 0.75) {
  return new Promise(res => {
    const img = new Image();
    const u = URL.createObjectURL(file);
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * sc);
      c.height = Math.round(img.naturalHeight * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      c.toBlob(b => res(b || file), 'image/jpeg', q);
    };
    img.onerror = () => { URL.revokeObjectURL(u); res(file); };
    img.src = u;
  });
}

function choosePhotos(source) {
  const input = source === 'camera' ? $('#fileCamera') : $('#fileGallery');
  return new Promise(res => {
    input.value = '';
    input.onchange = async () => {
      const ids = [];
      for (const f of input.files) {
        const id = uid();
        await Photos.put(id, await compressImage(f));
        ids.push(id);
      }
      res(ids);
    };
    input.click();
  });
}

function viewPhoto(id) {
  const v = document.createElement('div');
  v.className = 'viewer';
  v.innerHTML = `<img data-photo="${h(id)}" alt="">`;
  v.onclick = () => v.remove();
  document.body.appendChild(v);
  hydratePhotos(v);
}

// ---------- money + dates ----------
function fmt(n, sign = false) {
  const sym = S.settings.currency;
  const abs = Math.abs(n);
  const dec = Math.abs(abs - Math.round(abs)) > 0.004 ? 2 : 0;
  const num = abs.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const body = /^[A-Za-z]/.test(sym) ? `${num} ${sym}` : `${sym}${num}`;
  const pre = n < -0.004 ? '−' : (sign && n > 0.004 ? '+' : '');
  return pre + body;
}
function fmtShort(n) {
  const a = Math.abs(n);
  if (a < 1000) return fmt(Math.round(n));
  const s = a >= 1e6 ? (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : (a / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  const sym = S.settings.currency;
  const body = /^[A-Za-z]/.test(sym) ? `${s} ${sym}` : `${sym}${s}`;
  return (n < 0 ? '−' : '') + body;
}
function parseAmt(s) {
  s = String(s || '').replace(/[^\d.,]/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
  else if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? round2(n) : NaN;
}
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const startOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
function fmtDay(t) {
  if (sameDay(t, Date.now())) return 'Today';
  if (sameDay(t, Date.now() - DAY)) return 'Yesterday';
  const d = new Date(t);
  const opts = { weekday: 'short', month: 'short', day: 'numeric' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString(undefined, opts);
}
const fmtDate = t => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtTime = t => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const toLocalInput = t => new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 16);

// ---------- domain ----------
const accById = id => S.accounts.find(a => a.id === id);
const itemById = id => S.items.find(i => i.id === id);

function delta(t, id) {
  switch (t.type) {
    case 'add': case 'sell': return t.acc === id ? t.amount : 0;
    case 'sub': case 'buy': return t.acc === id ? -t.amount : 0;
    case 'move': return t.acc === id ? -t.amount : t.to === id ? t.amount : 0;
  }
  return 0;
}
function netDelta(t) {
  if (t.type === 'add' || t.type === 'sell') return t.amount;
  if (t.type === 'sub' || t.type === 'buy') return -t.amount;
  return 0;
}
const cashOf = id => round2(S.tx.reduce((s, t) => s + (id ? delta(t, id) : netDelta(t)), 0));
const cashIn = view => view === 'all' || view === 'liquid';
const itemIn = (it, view) => view === 'all' || view === 'assets' || (view.startsWith('tag:') && it.tag === view.slice(4));
const itemsOf = (id, view = 'all', status = 'holding') =>
  S.items.filter(i => (!id || i.acc === id) && (!status || i.status === status) && itemIn(i, view));
function valueOf(id, view = S.settings.view) {
  let v = cashIn(view) ? cashOf(id) : 0;
  for (const it of itemsOf(id, view)) v += it.value;
  return round2(v);
}

// Step series of value over time for one stash (or all when id is null).
function series(id, view, from) {
  const ev = [];
  if (cashIn(view)) for (const t of S.tx) {
    const d = id ? delta(t, id) : netDelta(t);
    if (d) ev.push([t.date, d]);
  }
  for (const it of S.items) {
    if ((id && it.acc !== id) || !itemIn(it, view)) continue;
    ev.push([it.boughtAt, it.value]);
    if (it.status === 'sold') ev.push([it.soldAt, -it.value]);
  }
  ev.sort((a, b) => a[0] - b[0]);
  const now = Date.now();
  const pts = [];
  let v = 0, i = 0;
  if (from) {
    while (i < ev.length && ev[i][0] < from) v += ev[i++][1];
    pts.push({ t: from, v: round2(v) });
  } else if (ev.length) pts.push({ t: ev[0][0], v: 0 });
  for (; i < ev.length; i++) { v += ev[i][1]; pts.push({ t: ev[i][0], v: round2(v) }); }
  pts.push({ t: Math.max(now, pts.length ? pts[pts.length - 1].t : now), v: round2(v) });
  if (pts.length < 2 || pts[pts.length - 1].t - pts[0].t < 1) pts.unshift({ t: now - DAY, v: pts[0] ? pts[0].v : 0 });
  return pts;
}
const rangeFrom = r => RANGES[r] ? Date.now() - RANGES[r] * DAY : 0;

function monthStats() {
  const from = startOfMonth();
  let inn = 0, out = 0, profit = 0;
  for (const t of S.tx) {
    if (t.date < from) continue;
    if (t.type === 'add') inn += t.amount;
    else if (t.type === 'sub') out += t.amount;
  }
  for (const it of S.items) if (it.status === 'sold' && it.soldAt >= from) profit += it.soldPrice - it.cost;
  return { in: round2(inn), out: round2(out), profit: round2(profit) };
}

function hustleStats(id) {
  const holding = S.items.filter(i => i.acc === id && i.status === 'holding');
  const sold = S.items.filter(i => i.acc === id && i.status === 'sold');
  return {
    stock: holding.length,
    stockCost: round2(holding.reduce((s, i) => s + i.cost, 0)),
    stockValue: round2(holding.reduce((s, i) => s + i.value, 0)),
    sold: sold.length,
    profit: round2(sold.reduce((s, i) => s + i.soldPrice - i.cost, 0)),
  };
}

function recentReasons(type) {
  const seen = new Set(), out = [];
  for (let i = S.tx.length - 1; i >= 0 && out.length < 6; i--) {
    const t = S.tx[i];
    const r = (t.reason || '').trim();
    if (t.type !== type || !r || r === 'Starting amount' || seen.has(r.toLowerCase())) continue;
    seen.add(r.toLowerCase());
    out.push(r);
  }
  return out;
}

const usedTags = () => S.tags.filter(t => S.items.some(i => i.status === 'holding' && i.tag === t));
function viewLabel(v) {
  if (v === 'liquid') return 'Cash only';
  if (v === 'assets') return 'Items only';
  if (v.startsWith('tag:')) return v.slice(4);
  return 'Everything';
}

// ---------- Echo ----------
const echoes = new Set();
let lastActive = Date.now();

function makeEcho(svg, bubble) {
  const eyes = $$('.eye', svg);
  let moodT, sayT, blinkT;
  const e = {
    mood: 'idle',
    set(m, ms) {
      svg.dataset.mood = m;
      e.mood = m;
      clearTimeout(moodT);
      if (ms) moodT = setTimeout(() => e.set('idle'), ms);
    },
    look(x, y) {
      const r = svg.getBoundingClientRect();
      if (!r.width) return;
      const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 250);
      const tx = (7 * k * dx / d).toFixed(1), ty = (5 * k * dy / d).toFixed(1);
      eyes.forEach(g => { g.style.transform = `translate(${tx}px, ${ty}px)`; });
    },
    lookAt(el) {
      if (!el) return;
      const r = el.getBoundingClientRect();
      e.look(r.left + r.width / 2, r.top + r.height / 2);
    },
    say(text, mood, ms = 3600) {
      if (mood) e.set(mood, ms);
      if (!bubble) return;
      bubble.textContent = text;
      bubble.classList.add('show');
      clearTimeout(sayT);
      sayT = setTimeout(() => bubble.classList.remove('show'), ms);
    },
    blink() {
      svg.classList.add('blink');
      setTimeout(() => svg.classList.remove('blink'), 140);
    },
    destroy() { clearTimeout(blinkT); clearTimeout(moodT); echoes.delete(e); },
  };
  (function loop() {
    blinkT = setTimeout(() => {
      if (e.mood !== 'sleepy' && e.mood !== 'happy') {
        e.blink();
        if (Math.random() < 0.2) setTimeout(e.blink, 260);
      }
      loop();
    }, 2200 + Math.random() * 4200);
  })();
  echoes.add(e);
  return e;
}

const echo = makeEcho($('#echo .echo'), $('#bubble'));

function react(text, mood = 'happy', ms) {
  if (S.settings.talk) echo.say(text, mood, ms);
  else echo.set(mood, ms || 2500);
}

let lastInsight = '';
function insight() {
  const out = [];
  if (!S.accounts.length) return 'Make your first stash with the dashed square below.';
  out.push(`Everything together: ${fmt(valueOf(null, 'all'))}.`);
  const top = [...S.accounts].sort((a, b) => valueOf(b.id, 'all') - valueOf(a.id, 'all'))[0];
  if (S.accounts.length > 1) out.push(`${top.name} is your biggest stash.`);
  const m = monthStats();
  if (m.in || m.out) out.push(m.in - m.out >= 0
    ? `This month you're up ${fmt(m.in - m.out)}. Nice.`
    : `This month you're down ${fmt(m.out - m.in)}. I'm not judging. Much.`);
  if (m.profit > 0) out.push(`Your flips made ${fmt(m.profit)} this month 💸`);
  for (const a of S.accounts) if (a.goal) {
    const p = valueOf(a.id, 'all') / a.goal;
    out.push(p >= 1 ? `${a.name} already hit its goal 🎉` : `${a.name} is ${Math.round(p * 100)}% of the way to ${fmt(a.goal)}.`);
  }
  const stock = S.items.filter(i => i.status === 'holding').length;
  if (stock) out.push(`${stock} item${stock > 1 ? 's' : ''} waiting to be flipped.`);
  if (!S.tx.some(t => sameDay(t.date, Date.now()))) out.push('Nothing logged today. Quiet day?');
  out.push("I'm watching. Supportively.", 'Every coin counts. I count them too.');
  const choices = out.filter(x => x !== lastInsight);
  return (lastInsight = pickOne(choices));
}

document.addEventListener('pointermove', ev => {
  lastActive = Date.now();
  echoes.forEach(e => e.look(ev.clientX, ev.clientY));
}, { passive: true });
document.addEventListener('pointerdown', ev => {
  lastActive = Date.now();
  echoes.forEach(e => e.look(ev.clientX, ev.clientY));
  if (echo.mood === 'sleepy') echo.set('surprised', 700);
}, { passive: true });
setInterval(() => {
  const idle = Date.now() - lastActive;
  if (echo.mood === 'idle' && idle > 45000) echo.set('sleepy');
  else if (echo.mood === 'idle' && idle > 4000 && Math.random() < 0.5) {
    const tiles = $$('.tile[data-acc]');
    if (tiles.length && Math.random() < 0.6) echo.lookAt(pickOne(tiles));
    else echo.look(innerWidth * Math.random(), innerHeight * Math.random());
  }
}, 3000);

$('#echo').addEventListener('click', () => {
  echo.set('thinking', 500);
  setTimeout(() => echo.say(insight(), 'proud', 4200), 250);
});

// ---------- toast ----------
let toastT;
function toast(msg, undo) {
  const el = $('#toast');
  el.innerHTML = `<span>${h(msg)}</span>${undo ? '<button>Undo</button>' : ''}`;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), undo ? 5000 : 2600);
  if (undo) $('button', el).onclick = () => { el.classList.remove('show'); undo(); };
}

// ---------- charts ----------
let charts = [];
function chartSlot(points, opts) {
  const id = 'c' + charts.length;
  charts.push({ id, points, opts });
  return `<div class="chart" id="${id}"></div>`;
}
function drawCharts() { charts.forEach(drawChart); }

function drawChart({ id, points, opts }) {
  const el = document.getElementById(id);
  if (!el) return;
  const mini = !!opts.mini;
  const W = el.clientWidth || 320, H = opts.h || (mini ? 56 : 180);
  const pr = mini ? 0 : 48, pt = mini ? 4 : 10, pb = mini ? 4 : 24;
  const t0 = points[0].t, t1 = points[points.length - 1].t, span = (t1 - t0) || 1;
  const vals = points.map(p => p.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 0.01) { hi += 1; lo = lo >= 0 ? Math.max(0, lo - 1) : lo - 1; }
  const pad = (hi - lo) * 0.12;
  hi += pad;
  lo = lo >= 0 && lo - pad < 0 ? 0 : lo - pad;
  const x = t => (t - t0) / span * (W - pr);
  const y = v => pt + (hi - v) / (hi - lo) * (H - pt - pb);
  let d = `M${x(points[0].t).toFixed(1)},${y(points[0].v).toFixed(1)}`;
  for (const p of points.slice(1)) d += `H${x(p.t).toFixed(1)}V${y(p.v).toFixed(1)}`;
  const area = `${d}V${H - pb}H0Z`;
  const c = opts.color;
  let grid = '';
  if (!mini) {
    for (const v of [hi, (hi + lo) / 2, lo]) {
      const yy = y(v).toFixed(1);
      grid += `<line class="grid" x1="0" x2="${W - pr}" y1="${yy}" y2="${yy}"/>` +
        `<text class="axis-t" x="${W - pr + 6}" y="${yy}" dy="4">${h(fmtShort(v))}</text>`;
    }
    grid += `<text class="axis-t" x="0" y="${H - 6}">${h(fmtDate(t0))}</text>` +
      `<text class="axis-t" x="${W - pr}" y="${H - 6}" text-anchor="end">Today</text>`;
  }
  el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${h(opts.label || 'Balance over time')}">
    ${grid}
    <path d="${area}" style="fill:${c}" fill-opacity="0.12"/>
    <path class="line" d="${d}" style="stroke:${c}"/>
    ${mini ? '' : `<line class="cross" y1="${pt}" y2="${H - pb}" visibility="hidden"/><circle class="dot" r="5" style="fill:${c}" visibility="hidden"/>`}
  </svg>${mini ? '' : '<div class="tip"></div>'}`;
  if (mini) return;

  const cross = $('.cross', el), dot = $('.dot', el), tip = $('.tip', el);
  let hideT;
  const show = ev => {
    clearTimeout(hideT);
    const r = el.getBoundingClientRect();
    const px = Math.max(0, Math.min(W - pr, ev.clientX - r.left));
    const t = t0 + px / (W - pr) * span;
    let p = points[0];
    for (const q of points) { if (q.t <= t) p = q; else break; }
    const yy = y(p.v);
    cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', px); dot.setAttribute('cy', yy); dot.setAttribute('visibility', 'visible');
    tip.innerHTML = `${h(fmtDate(t))}<br><b class="num">${h(fmt(p.v))}</b>`;
    tip.style.left = Math.max(40, Math.min(W - 40, px)) + 'px';
    tip.style.top = Math.max(-34, yy - 52) + 'px';
    tip.classList.add('show');
  };
  const hide = () => {
    hideT = setTimeout(() => {
      tip.classList.remove('show');
      cross.setAttribute('visibility', 'hidden');
      dot.setAttribute('visibility', 'hidden');
    }, 900);
  };
  el.onpointerdown = show;
  el.onpointermove = show;
  el.onpointerleave = hide;
  el.onpointerup = hide;
}
let resizeT;
addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(drawCharts, 150); });

// ---------- routing ----------
let lastPath = '';
function go(path) { location.hash = path; }
function currentAccId() {
  const m = (location.hash || '').match(/^#\/acc\/(.+)$/);
  return m && accById(m[1]) ? m[1] : null;
}
function route() {
  const path = location.hash.slice(1) || '/';
  const parts = path.split('/').filter(Boolean);
  charts = [];
  const view = $('#view');
  let page = 'home';
  if (parts[0] === 'acc' && accById(parts[1])) { view.innerHTML = accountView(accById(parts[1])); page = 'acc'; }
  else if (parts[0] === 'summary') { view.innerHTML = summaryView(); page = 'summary'; }
  else if (parts[0] === 'settings') { view.innerHTML = settingsView(); page = 'settings'; }
  else view.innerHTML = homeView();
  $('#actionbar').classList.toggle('hidden', page === 'settings' || !S.accounts.length);
  if (path !== lastPath) { scrollTo(0, 0); lastPath = path; }
  wire(view, page);
  hydratePhotos(view);
  drawCharts();
}
addEventListener('hashchange', route);

// ---------- views ----------
function viewChips() {
  if (!S.items.length) return '';
  const v = S.settings.view;
  const opts = [['all', 'Everything'], ['liquid', 'Cash only'], ['assets', 'Items only'], ...usedTags().map(t => ['tag:' + t, t])];
  return `<div class="chips" style="margin-top:12px">${opts.map(([k, l]) =>
    `<button class="chip ${v === k ? 'on' : ''}" data-view="${h(k)}">${h(l)}</button>`).join('')}</div>`;
}

function goalBar(a) {
  if (!a.goal) return '';
  const p = Math.max(0, Math.min(1, valueOf(a.id, 'all') / a.goal));
  return `<div class="t-goal"><i style="width:${(p * 100).toFixed(1)}%"></i></div>`;
}

function tileHTML(a) {
  const val = valueOf(a.id);
  const n = itemsOf(a.id).length;
  let sub = '';
  if (n) sub = `${n} item${n > 1 ? 's' : ''} · ${fmt(cashOf(a.id))} cash`;
  else if (a.goal) sub = `${Math.round(Math.max(0, valueOf(a.id, 'all')) / a.goal * 100)}% of ${fmt(a.goal)}`;
  return `<button class="tile ${DARK_INK.has(a.color) ? 'dark-ink' : ''}" style="--c:${a.color}" data-acc="${a.id}">
    <div class="t-ico">${h(a.icon)}</div>
    <div><div class="t-name">${h(a.name)}</div><div class="t-bal num">${fmt(val)}</div>
    ${sub ? `<div class="t-sub">${h(sub)}</div>` : ''}${goalBar(a)}</div>
  </button>`;
}

function txRow(t, ctx) {
  const a = accById(t.acc) || { name: '?', icon: '❔', color: '#888' };
  const b = t.type === 'move' ? accById(t.to) || { name: '?' } : null;
  const amt = ctx ? delta(t, ctx) : netDelta(t);
  const cls = t.type === 'move' && !ctx ? 'muted' : amt >= 0 ? 'pos' : 'neg';
  const shown = t.type === 'move' && !ctx ? fmt(t.amount) : fmt(amt, true);
  const where = b ? `${a.name} → ${b.name}` : a.name;
  const extras = (t.photos && t.photos.length ? ' · 📎' : '') + (t.details ? ' · 📝' : '');
  const title = t.reason || TYPE[t.type].label;
  const lead = t.photos && t.photos.length
    ? `<img class="thumb" data-photo="${h(t.photos[0])}" alt="">`
    : `<span class="li-ico" style="background:color-mix(in srgb, ${a.color} 22%, transparent)">${t.type === 'move' ? '⇄' : h(a.icon)}</span>`;
  return `<button class="li" data-tx="${t.id}">${lead}
    <div class="li-main"><div class="li-title">${h(title)}</div><div class="li-sub">${h(where)} · ${fmtTime(t.date)}${extras}</div></div>
    <div class="li-amt num ${cls}">${shown}</div></button>`;
}

function txList(list, ctx) {
  if (!list.length) return '<div class="empty">Nothing here yet.</div>';
  let out = '', day = '';
  for (const t of list) {
    const d = fmtDay(t.date);
    if (d !== day) { out += `<div class="day">${h(d)}</div>`; day = d; }
    out += txRow(t, ctx);
  }
  return `<div class="list">${out}</div>`;
}
const sortedTx = filter => S.tx.filter(filter).sort((a, b) => b.date - a.date);

function homeView() {
  const v = S.settings.view;
  const m = monthStats();
  const net = m.in - m.out;
  const things = valueOf(null, 'assets');
  const recent = sortedTx(() => true).slice(0, 8);
  return `
  <section class="card summary">
    <div class="row between"><span class="label">${h(viewLabel(v))}</span><a class="link" href="#/summary">Summary ›</a></div>
    <div class="big num">${fmt(valueOf(null, v))}</div>
    <div class="split">
      <span>Cash <b class="num">${fmt(valueOf(null, 'liquid'))}</b></span>
      ${things ? `<span>Items <b class="num">${fmt(things)}</b></span>` : ''}
      <span>This month <b class="num ${net >= 0 ? 'pos' : 'neg'}">${fmt(net, true)}</b></span>
    </div>
    <a class="spark" href="#/summary" aria-label="Open summary">${chartSlot(series(null, v, rangeFrom('1M')), { mini: true, color: 'var(--accent)' })}</a>
    ${viewChips()}
  </section>
  <div class="sec-title"><span>Your stashes</span></div>
  <div class="tiles">
    ${S.accounts.map(tileHTML).join('')}
    <button class="tile new" id="newAcc"><span>＋</span>New stash</button>
  </div>
  <div class="sec-title"><span>Recent</span></div>
  <section class="card">${recent.length ? txList(recent) : '<div class="empty">Your moves will show up here. Try the + button.</div>'}</section>`;
}

function accountView(a) {
  const ink = DARK_INK.has(a.color) ? 'dark-ink' : '';
  const cash = cashOf(a.id), things = valueOf(a.id, 'assets'), total = valueOf(a.id, 'all');
  const hs = hustleStats(a.id);
  const hasItems = S.items.some(i => i.acc === a.id);
  const items = S.items.filter(i => i.acc === a.id && i.status === ui.itemTab)
    .sort((x, y) => (y.soldAt || y.boughtAt) - (x.soldAt || x.boughtAt));
  const goalTxt = a.goal ? `${Math.round(Math.max(0, total) / a.goal * 100)}% of ${fmt(a.goal)} goal` : '';
  return `
  <button class="back" data-go="/">‹ All stashes</button>
  <section class="hero ${ink}" style="--c:${a.color}">
    <div class="h-top"><span class="h-ico">${h(a.icon)}</span><span class="h-name">${h(a.name)}</span><button class="h-edit" id="editAcc">Edit</button></div>
    <div class="big num">${fmt(total)}</div>
    <div class="h-split num">${things ? `Cash ${fmt(cash)} · Items ${fmt(things)}` : 'All cash'}${goalTxt ? ` · ${h(goalTxt)}` : ''}</div>
    ${goalBar(a)}
    <div class="hero-acts">
      <button data-act="add"><b>+</b>Add</button>
      <button data-act="sub"><b>−</b>Spend</button>
      <button data-act="move"><b>⇄</b>Move</button>
      <button data-act="item"><b>📦</b>Item</button>
    </div>
  </section>
  <section class="card">
    <div class="row between"><h3>How it's changing</h3>
      <div class="chips">${Object.keys(RANGES).map(r => `<button class="chip ${ui.range === r ? 'on' : ''}" data-range="${r}">${r}</button>`).join('')}</div></div>
    ${chartSlot(series(a.id, 'all', rangeFrom(ui.range)), { color: a.color, label: `${a.name} over time` })}
  </section>
  ${hasItems ? `
  <section class="card">
    <h3>Items & flips</h3>
    <div class="stats">
      <div class="stat"><div class="label">In stock</div><div class="v num">${hs.stock}</div><div class="label num">paid ${fmt(hs.stockCost)}</div></div>
      <div class="stat"><div class="label">Worth now (est.)</div><div class="v num">${fmt(hs.stockValue)}</div><div class="label num">${fmt(hs.stockValue - hs.stockCost, true)} if sold</div></div>
      <div class="stat"><div class="label">Sold</div><div class="v num">${hs.sold}</div></div>
      <div class="stat"><div class="label">Profit made</div><div class="v num ${hs.profit >= 0 ? 'pos' : 'neg'}">${fmt(hs.profit, true)}</div></div>
    </div>
    <div class="chips" style="margin:14px 0 4px">
      <button class="chip ${ui.itemTab === 'holding' ? 'on' : ''}" data-itab="holding">In stock</button>
      <button class="chip ${ui.itemTab === 'sold' ? 'on' : ''}" data-itab="sold">Sold</button>
    </div>
    <div class="list">${items.length ? items.map(itemRow).join('') : '<div class="empty">Nothing here.</div>'}</div>
  </section>` : ''}
  <section class="card"><h3>History</h3>${txList(sortedTx(t => t.acc === a.id || t.to === a.id), a.id)}</section>`;
}

function itemRow(it) {
  const lead = it.photos && it.photos.length
    ? `<img class="thumb" data-photo="${h(it.photos[0])}" alt="">`
    : '<span class="li-ico">📦</span>';
  const right = it.status === 'sold'
    ? `<div class="li-amt num ${it.soldPrice - it.cost >= 0 ? 'pos' : 'neg'}">${fmt(it.soldPrice - it.cost, true)}<small>sold ${fmt(it.soldPrice)}</small></div>`
    : `<div class="li-amt num">${fmt(it.value)}<small>paid ${fmt(it.cost)}</small></div>`;
  return `<button class="li" data-item="${it.id}">${lead}
    <div class="li-main"><div class="li-title">${h(it.name)}</div><div class="li-sub">${h(it.tag)} · ${fmtDay(it.status === 'sold' ? it.soldAt : it.boughtAt)}</div></div>${right}</button>`;
}

function summaryView() {
  const v = S.settings.view;
  const from = rangeFrom(ui.range);
  const pts = series(null, v, from);
  const change = pts[pts.length - 1].v - pts[0].v;
  const m = monthStats();
  const accs = S.accounts.map(a => ({ a, v: valueOf(a.id, v) })).sort((x, y) => y.v - x.v);
  const maxV = Math.max(1, ...accs.map(x => Math.abs(x.v)));
  const sumAbs = accs.reduce((s, x) => s + Math.max(0, x.v), 0) || 1;

  // where the money sits: cash + one segment per item tag
  const segs = [{ name: 'Cash', v: Math.max(0, valueOf(null, 'liquid')) }];
  for (const t of S.tags) {
    const val = itemsOf(null, 'tag:' + t).reduce((s, i) => s + i.value, 0);
    if (val > 0) segs.push({ name: t, v: val });
  }
  const segTotal = segs.reduce((s, x) => s + x.v, 0) || 1;
  const segColor = i => `var(--s${(i % 8) + 1})`;

  // where spending went this month, grouped by reason
  const spend = new Map();
  for (const t of S.tx) if (t.type === 'sub' && t.date >= startOfMonth()) {
    const label = (t.reason || 'No reason').trim();
    const k = label.toLowerCase();
    const cur = spend.get(k) || { label, v: 0 };
    cur.v += t.amount;
    spend.set(k, cur);
  }
  const topSpend = [...spend.values()].sort((a, b) => b.v - a.v).slice(0, 6);
  const maxSpend = Math.max(1, ...topSpend.map(x => x.v));

  return `
  <button class="back" data-go="/">‹ Home</button>
  <section class="card">
    <div class="label">${h(viewLabel(v))}</div>
    <div class="big num">${fmt(pts[pts.length - 1].v)}</div>
    <div class="label num"><span class="${change >= 0 ? 'pos' : 'neg'}">${fmt(change, true)}</span> ${ui.range === 'All' ? 'since the start' : `in the last ${ui.range}`}</div>
    <div class="chips" style="margin:12px 0 8px">${Object.keys(RANGES).map(r => `<button class="chip ${ui.range === r ? 'on' : ''}" data-range="${r}">${r}</button>`).join('')}</div>
    ${chartSlot(pts, { color: 'var(--accent)', label: 'Total over time' })}
    ${viewChips()}
  </section>
  <section class="card">
    <h3>This month</h3>
    <div class="stats">
      <div class="stat"><div class="label">Money in</div><div class="v num pos">${fmt(m.in, true)}</div></div>
      <div class="stat"><div class="label">Money out</div><div class="v num neg">${fmt(-m.out)}</div></div>
      <div class="stat"><div class="label">Net</div><div class="v num ${m.in - m.out >= 0 ? 'pos' : 'neg'}">${fmt(m.in - m.out, true)}</div></div>
      <div class="stat"><div class="label">Flip profit</div><div class="v num ${m.profit >= 0 ? 'pos' : 'neg'}">${fmt(m.profit, true)}</div></div>
    </div>
  </section>
  ${accs.length ? `<section class="card">
    <h3>Per stash</h3>
    <div class="bars">${accs.map(({ a, v: val }) => `
      <button class="bar-row" data-acc="${a.id}" style="text-align:left">
        <span>${h(a.icon)} ${h(a.name)}</span>
        <span class="num"><b>${fmt(val)}</b> <span class="muted">${val > 0 ? Math.round(val / sumAbs * 100) + '%' : ''}</span></span>
        <span class="bar-track"><i style="width:${(Math.abs(val) / maxV * 100).toFixed(1)}%;background:${val < 0 ? 'var(--bad)' : a.color}"></i></span>
      </button>`).join('')}</div>
  </section>` : ''}
  ${segs.length > 1 ? `<section class="card">
    <h3>Cash vs things</h3>
    <div class="stack">${segs.map((s, i) => `<i style="width:${(s.v / segTotal * 100).toFixed(2)}%;background:${segColor(i)}" title="${h(s.name)}"></i>`).join('')}</div>
    <div class="legend">${segs.map((s, i) => `<span><i style="background:${segColor(i)}"></i>${h(s.name)} <b class="num">${fmt(s.v)}</b></span>`).join('')}</div>
  </section>` : ''}
  <section class="card">
    <h3>Where spending went this month</h3>
    ${topSpend.length ? `<div class="bars">${topSpend.map(s => `
      <div class="bar-row"><span>${h(s.label)}</span><b class="num">${fmt(s.v)}</b>
      <span class="bar-track"><i style="width:${(s.v / maxSpend * 100).toFixed(1)}%;background:var(--bad)"></i></span></div>`).join('')}</div>`
      : '<div class="empty">No spending yet this month 👀</div>'}
  </section>`;
}

function settingsView() {
  const st = S.settings;
  return `
  <button class="back" data-go="/">‹ Home</button>
  <section class="card">
    <h3>Currency</h3>
    <div class="chips wrap" style="flex-wrap:wrap">${CURRENCIES.map(c => `<button class="chip ${st.currency === c ? 'on' : ''}" data-cur="${h(c)}">${h(c)}</button>`).join('')}</div>
    <input class="input" id="curCustom" maxlength="4" placeholder="Other symbol…" style="margin-top:10px" value="${CURRENCIES.includes(st.currency) ? '' : h(st.currency)}">
  </section>
  <section class="card">
    <h3>Look</h3>
    <div class="chips">${['auto', 'light', 'dark'].map(t => `<button class="chip ${st.theme === t ? 'on' : ''}" data-theme-set="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
    <label class="toggle-row"><span>Echo comments on what you do</span><input type="checkbox" class="switch" id="talk" ${st.talk ? 'checked' : ''}></label>
  </section>
  <section class="card">
    <h3>Item tags</h3>
    <p class="label" style="margin-top:-4px">Things that aren't cash. Use them to filter what you see.</p>
    <div class="chips" style="flex-wrap:wrap">${S.tags.map(t => `<button class="chip" data-deltag="${h(t)}">${h(t)} ✕</button>`).join('')}</div>
    <div class="row" style="margin-top:10px"><input class="input" id="newTag" maxlength="24" placeholder="New tag, e.g. Crypto"><button class="btn small" id="addTag">Add</button></div>
  </section>
  <section class="card">
    <h3>Backup</h3>
    <p class="label" style="margin-top:-4px">Everything lives only on this phone. Save a backup file once in a while.</p>
    <div class="btn-row"><button class="btn ghost" id="export">Save backup</button><button class="btn ghost" id="import">Restore</button></div>
    <p class="label" id="usage" style="margin:10px 0 0"></p>
  </section>
  <section class="card">
    <button class="btn ghost" id="replay">Replay the tutorial</button>
    <button class="btn danger" id="wipe" style="margin-top:6px">Erase everything</button>
  </section>
  <p class="label" style="text-align:center">PocketStash · offline · no account · no tracking</p>`;
}

// ---------- wiring ----------
function wire(root, page) {
  $$('[data-acc]', root).forEach(b => b.onclick = () => go('/acc/' + b.dataset.acc));
  $$('[data-go]', root).forEach(b => b.onclick = () => go(b.dataset.go));
  $$('[data-tx]', root).forEach(b => b.onclick = () => txDetail(b.dataset.tx));
  $$('[data-item]', root).forEach(b => b.onclick = () => itemDetail(b.dataset.item));
  $$('[data-view]', root).forEach(b => b.onclick = () => { S.settings.view = b.dataset.view; commit(); });
  $$('[data-range]', root).forEach(b => b.onclick = () => { ui.range = b.dataset.range; route(); });
  $$('[data-itab]', root).forEach(b => b.onclick = () => { ui.itemTab = b.dataset.itab; route(); });
  const na = $('#newAcc', root);
  if (na) na.onclick = () => accountSheet();

  if (page === 'acc') {
    const id = currentAccId();
    $('#editAcc', root).onclick = () => accountSheet(accById(id));
    $$('.hero-acts [data-act]', root).forEach(b => b.onclick = () =>
      b.dataset.act === 'item' ? itemSheet(id) : txSheet(b.dataset.act, { acc: id }));
  }
  if (page === 'settings') wireSettings(root);
}

$$('#actionbar [data-act]').forEach(b => b.onclick = () => txSheet(b.dataset.act, { acc: currentAccId() }));
$('#settingsBtn').onclick = () => go('/settings');

function wireSettings(root) {
  $$('[data-cur]', root).forEach(b => b.onclick = () => { S.settings.currency = b.dataset.cur; commit(); });
  $('#curCustom', root).onchange = e => { const v = e.target.value.trim(); if (v) { S.settings.currency = v; commit(); } };
  $$('[data-theme-set]', root).forEach(b => b.onclick = () => { S.settings.theme = b.dataset.themeSet; applyTheme(); commit(); });
  $('#talk', root).onchange = e => { S.settings.talk = e.target.checked; save(); if (e.target.checked) react('Yay, I can talk again.', 'happy'); };
  $$('[data-deltag]', root).forEach(b => b.onclick = () => {
    const t = b.dataset.deltag;
    if (S.items.some(i => i.tag === t)) return toast(`Some items still use "${t}"`);
    S.tags = S.tags.filter(x => x !== t);
    if (S.settings.view === 'tag:' + t) S.settings.view = 'all';
    commit();
  });
  $('#addTag', root).onclick = () => {
    const v = $('#newTag', root).value.trim();
    if (v && !S.tags.includes(v)) { S.tags.push(v); commit(); }
  };
  $('#export', root).onclick = exportBackup;
  $('#import', root).onclick = importBackup;
  $('#replay', root).onclick = () => tutorial(true);
  $('#wipe', root).onclick = async () => {
    if (!confirm('Erase ALL stashes, history and photos from this phone?')) return;
    if (!confirm('Really? This cannot be undone (unless you saved a backup).')) return;
    await Photos.clear();
    S = defaults();
    S.settings.tutorialDone = true;
    commit();
    react('Fresh start. I like it.', 'surprised');
  };
  if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(e => {
    const el = $('#usage', root);
    if (el) el.textContent = `Using about ${(e.usage / 1048576).toFixed(1)} MB on this phone.`;
  });
}

// ---------- sheets ----------
let sheet = null;
function openSheet(html, mount) {
  const root = $('#sheetRoot');
  if (sheet) {
    // swap content in place; keep the single history entry
    sheet.onClose && sheet.onClose();
    root.innerHTML = `<div class="backdrop show"></div><div class="sheet show" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
  } else {
    root.innerHTML = `<div class="backdrop"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    history.pushState({ sheet: 1 }, '');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $('.backdrop', root).classList.add('show');
      $('.sheet', root).classList.add('show');
    }));
  }
  sheet = { onClose: null };
  const sh = $('.sheet', root);
  $('.backdrop', root).onclick = () => closeSheet();
  $$('[data-close]', sh).forEach(b => b.onclick = () => closeSheet());
  if (mount) mount(sh, sheet);
  hydratePhotos(sh);
  return sh;
}
function closeSheet(fromPop = false) {
  if (!sheet) return;
  const s = sheet;
  sheet = null;
  s.onClose && s.onClose();
  const root = $('#sheetRoot');
  const bd = $('.backdrop', root), sh = $('.sheet', root);
  bd && bd.classList.remove('show');
  sh && sh.classList.remove('show');
  setTimeout(() => { if (!sheet) root.innerHTML = ''; }, 280);
  if (!fromPop && history.state && history.state.sheet) history.back();
}
addEventListener('popstate', () => { if (sheet) closeSheet(true); });

function pickHTML(selected, exclude) {
  return S.accounts.filter(a => a.id !== exclude).map(a => `
    <button data-pick="${a.id}" class="${a.id === selected ? 'on' : ''}">
      <span class="dot" style="--c:${a.color}">${h(a.icon)}</span>
      <span>${h(a.name)}<br><span class="amt num">${fmt(cashOf(a.id))}</span></span>
    </button>`).join('');
}
function photosHTML(ids) {
  return ids.map(id => `<span class="ph"><img data-photo="${h(id)}" data-view="${h(id)}" alt=""><button class="rm" data-rm="${h(id)}" aria-label="Remove photo">✕</button></span>`).join('');
}
// Shared photo strip behavior for any sheet holding a list of photo ids.
function wirePhotos(sh, st) {
  const box = $('#photos', sh);
  const draw = () => {
    box.innerHTML = photosHTML(st.photos);
    hydratePhotos(box);
    $$('[data-rm]', box).forEach(b => b.onclick = () => {
      st.photos = st.photos.filter(x => x !== b.dataset.rm);
      st.removed.push(b.dataset.rm);
      draw();
    });
    $$('[data-view]', box).forEach(i => i.onclick = () => viewPhoto(i.dataset.view));
  };
  const add = async src => {
    const ids = await choosePhotos(src);
    st.photos.push(...ids);
    st.added.push(...ids);
    draw();
  };
  $('#cam', sh).onclick = () => add('camera');
  $('#gal', sh).onclick = () => add('gallery');
  draw();
}
// Photos added in a sheet that's then cancelled shouldn't linger in storage.
function photoState(existing = []) {
  return { photos: [...existing], added: [], removed: [], saved: false };
}
function finishPhotos(st) {
  if (st.saved) st.removed.forEach(id => Photos.del(id));
  else st.added.forEach(id => Photos.del(id));
}

// ----- add / spend / move -----
function txSheet(type, preset = {}) {
  if (!S.accounts.length) { accountSheet(); return; }
  if (type === 'move' && S.accounts.length < 2) { toast('Make a second stash to move money between them'); return; }
  const titles = { add: 'Add money', sub: 'Spend money', move: 'Move money' };
  const holders = { add: 'Paycheck, gift, found it in a jacket…', sub: 'Groceries, coffee, phone bill…', move: 'Saving up, top-up…' };
  const st = photoState();
  st.acc = preset.acc || S.settings['last_' + type];
  if (!accById(st.acc)) st.acc = S.accounts[0].id;
  if (type === 'move') st.to = (S.accounts.find(a => a.id !== st.acc) || {}).id;
  st.date = null;
  const reasons = recentReasons(type);

  openSheet(`
    <div class="sheet-head"><h2>${titles[type]}</h2><button class="x" data-close aria-label="Close">✕</button></div>
    <div class="field"><div class="amount-wrap"><span class="cur">${h(S.settings.currency)}</span>
      <input class="amount num" id="amt" inputmode="decimal" placeholder="0" autocomplete="off" aria-label="Amount"></div></div>
    <div class="field"><span class="label">${type === 'add' ? 'Into' : 'From'}</span><div class="pick" id="pickA"></div></div>
    ${type === 'move' ? '<div class="field"><span class="label">To</span><div class="pick" id="pickB"></div></div>' : ''}
    <div class="field"><span class="label">Reason <span class="muted">(optional)</span></span>
      <input class="input" id="reason" maxlength="80" placeholder="${h(holders[type])}">
      ${reasons.length ? `<div class="chips" style="margin-top:8px">${reasons.map(r => `<button class="chip" data-r="${h(r)}">${h(r)}</button>`).join('')}</div>` : ''}
    </div>
    <div class="field">
      <button class="link" id="detailsBtn">+ Add details</button>
      <textarea class="textarea hidden" id="details" placeholder="The whole story, if you want."></textarea>
    </div>
    <div class="field">
      <div class="row wrap"><button class="btn ghost small" id="cam">📷 Camera</button><button class="btn ghost small" id="gal">🖼️ Photo</button><button class="btn ghost small" id="when">🕒 Now</button></div>
      <div class="photos" id="photos" style="margin-top:10px"></div>
      <input type="datetime-local" class="input hidden" id="date" style="margin-top:10px">
    </div>
    <button class="btn" id="save">Save</button>`, (sh, ctl) => {
    ctl.onClose = () => finishPhotos(st);
    const drawPicks = () => {
      $('#pickA', sh).innerHTML = pickHTML(st.acc);
      $$('#pickA [data-pick]', sh).forEach(b => b.onclick = () => {
        st.acc = b.dataset.pick;
        if (st.to === st.acc) st.to = (S.accounts.find(a => a.id !== st.acc) || {}).id;
        drawPicks();
      });
      if (type === 'move') {
        $('#pickB', sh).innerHTML = pickHTML(st.to, st.acc);
        $$('#pickB [data-pick]', sh).forEach(b => b.onclick = () => { st.to = b.dataset.pick; drawPicks(); });
      }
    };
    drawPicks();
    wirePhotos(sh, st);
    $$('[data-r]', sh).forEach(b => b.onclick = () => { $('#reason', sh).value = b.dataset.r; });
    $('#detailsBtn', sh).onclick = e => { e.target.remove(); $('#details', sh).classList.remove('hidden'); $('#details', sh).focus(); };
    $('#when', sh).onclick = () => {
      const d = $('#date', sh);
      d.classList.toggle('hidden');
      if (!d.value) d.value = toLocalInput(Date.now());
    };
    $('#date', sh).onchange = e => {
      st.date = e.target.value ? new Date(e.target.value).getTime() : null;
      $('#when', sh).textContent = st.date ? '🕒 ' + fmtDay(st.date) : '🕒 Now';
    };
    const amt = $('#amt', sh);
    setTimeout(() => amt.focus(), 300);
    amt.onkeydown = e => { if (e.key === 'Enter') $('#save', sh).click(); };
    $('#save', sh).onclick = () => {
      const amount = parseAmt(amt.value);
      if (!(amount > 0)) { amt.focus(); echo.set('thinking', 1500); toast('How much?'); return; }
      const t = {
        id: uid(), type, acc: st.acc, amount,
        reason: $('#reason', sh).value.trim(), details: $('#details', sh).value.trim(),
        photos: st.photos, date: st.date || Date.now(),
      };
      if (type === 'move') t.to = st.to;
      const before = { cash: cashOf(st.acc), total: valueOf(st.acc, 'all'), toTotal: t.to ? valueOf(t.to, 'all') : 0 };
      S.tx.push(t);
      S.settings['last_' + type] = st.acc;
      st.saved = true;
      closeSheet();
      commit();
      afterTx(t, before);
    };
  });
}

function pulse(id) {
  const el = $(`.tile[data-acc="${id}"]`);
  if (!el) return;
  el.classList.remove('pulse');
  void el.offsetWidth;
  el.classList.add('pulse');
  echo.lookAt(el);
}

function goalHit(id, beforeTotal) {
  const a = accById(id);
  return a && a.goal && beforeTotal < a.goal && valueOf(id, 'all') >= a.goal;
}

function afterTx(t, before) {
  const a = accById(t.acc), b = accById(t.to);
  const amt = fmt(t.amount);
  pulse(t.acc);
  if (b) setTimeout(() => pulse(t.to), 250);
  if (t.type === 'add') {
    if (goalHit(t.acc, before.total)) react(`${a.name} hit its goal! 🎉`, 'proud', 5000);
    else react(pickOne([`Nice! ${amt} into ${a.name}.`, `${a.name} just got heavier. ${amt} 🌱`, `Ooh, ${amt}. I saw that.`, `Logged: ${amt} → ${a.name}.`]), 'happy');
  } else if (t.type === 'sub') {
    const after = cashOf(t.acc);
    if (after < 0) react(`${a.name} is below zero now 👀`, 'worried', 4500);
    else if (before.cash > 0 && t.amount >= before.cash * 0.4) react(`Whoa, ${amt}! Big one.`, 'surprised');
    else react(pickOne([`Noted: ${amt} from ${a.name}.`, `${amt} gone. Hope it was worth it.`, `Spent ${amt}. I'll remember for you.`]), 'worried', 2600);
  } else if (t.type === 'move') {
    if (goalHit(t.to, before.toTotal)) react(`${b.name} hit its goal! 🎉`, 'proud', 5000);
    else react(pickOne([`Moved ${amt}: ${a.name} → ${b.name}.`, `Shuffled ${amt} into ${b.name}. Tidy.`]), 'happy');
  }
  const verb = { add: 'Added', sub: 'Spent', move: 'Moved' }[t.type];
  toast(`${verb} ${amt}`, () => {
    S.tx = S.tx.filter(x => x.id !== t.id);
    (t.photos || []).forEach(id => Photos.del(id));
    commit();
    react('Undone. Like it never happened.', 'thinking', 2500);
  });
}

// ----- tx detail / edit -----
function txDetail(id, editing = false) {
  const t = S.tx.find(x => x.id === id);
  if (!t) return;
  const a = accById(t.acc) || { name: '?' }, b = accById(t.to);
  const ctx = currentAccId();
  const amt = t.type === 'move' && !ctx ? t.amount : ctx ? delta(t, ctx) : netDelta(t);
  const it = t.itemId ? itemById(t.itemId) : null;

  if (!editing) {
    openSheet(`
      <div class="sheet-head"><h2>${h(TYPE[t.type].label)}</h2><button class="x" data-close aria-label="Close">✕</button></div>
      <div class="big num ${t.type === 'move' && !ctx ? '' : amt >= 0 ? 'pos' : 'neg'}" style="margin-bottom:12px">${t.type === 'move' && !ctx ? fmt(t.amount) : fmt(amt, true)}</div>
      <section class="card">
        <div class="kv"><span>${b ? 'From → To' : 'Stash'}</span><span>${h(b ? `${a.name} → ${b.name}` : a.name)}</span></div>
        <div class="kv"><span>When</span><span>${h(fmtDay(t.date))}, ${h(fmtTime(t.date))}</span></div>
        <div class="kv"><span>Reason</span><span>${h(t.reason || '—')}</span></div>
      </section>
      ${t.details ? `<div class="field"><span class="label">Details</span><div class="details-text">${h(t.details)}</div></div>` : ''}
      ${t.photos && t.photos.length ? `<div class="field"><div class="photos">${t.photos.map(p => `<img data-photo="${h(p)}" data-view="${h(p)}" alt="" style="width:96px;height:96px">`).join('')}</div></div>` : ''}
      ${it ? `<button class="btn ghost" id="openItem" style="margin-bottom:8px">📦 Open “${h(it.name)}”</button>` : ''}
      <div class="btn-row"><button class="btn ghost" id="edit">Edit</button>${t.itemId ? '' : '<button class="btn danger" id="del">Delete</button>'}</div>`, sh => {
      $$('[data-view]', sh).forEach(i => i.onclick = () => viewPhoto(i.dataset.view));
      $('#edit', sh).onclick = () => txDetail(id, true);
      if (it) $('#openItem', sh).onclick = () => itemDetail(it.id);
      const del = $('#del', sh);
      if (del) del.onclick = () => {
        if (!confirm('Delete this entry?')) return;
        S.tx = S.tx.filter(x => x.id !== id);
        (t.photos || []).forEach(p => Photos.del(p));
        closeSheet();
        commit();
        react('Gone. Poof.', 'thinking', 2000);
      };
    });
    return;
  }

  const st = photoState(t.photos || []);
  openSheet(`
    <div class="sheet-head"><h2>Edit</h2><button class="x" data-close aria-label="Close">✕</button></div>
    <div class="field"><div class="amount-wrap"><span class="cur">${h(S.settings.currency)}</span>
      <input class="amount num" id="amt" inputmode="decimal" value="${t.amount}" ${t.itemId ? 'disabled' : ''} aria-label="Amount"></div>
      ${t.itemId ? '<span class="label">Change the price from the item itself.</span>' : ''}</div>
    <div class="field"><span class="label">Reason</span><input class="input" id="reason" maxlength="80" value="${h(t.reason)}"></div>
    <div class="field"><span class="label">Details</span><textarea class="textarea" id="details">${h(t.details)}</textarea></div>
    <div class="field"><span class="label">When</span><input type="datetime-local" class="input" id="date" value="${toLocalInput(t.date)}"></div>
    <div class="field"><div class="row wrap"><button class="btn ghost small" id="cam">📷 Camera</button><button class="btn ghost small" id="gal">🖼️ Photo</button></div>
      <div class="photos" id="photos" style="margin-top:10px"></div></div>
    <button class="btn" id="save">Save changes</button>`, (sh, ctl) => {
    ctl.onClose = () => finishPhotos(st);
    wirePhotos(sh, st);
    $('#save', sh).onclick = () => {
      if (!t.itemId) {
        const v = parseAmt($('#amt', sh).value);
        if (!(v > 0)) return toast('Amount must be above zero');
        t.amount = v;
      }
      t.reason = $('#reason', sh).value.trim();
      t.details = $('#details', sh).value.trim();
      const d = $('#date', sh).value;
      if (d) t.date = new Date(d).getTime();
      t.photos = st.photos;
      st.saved = true;
      closeSheet();
      commit();
      toast('Saved');
    };
  });
}

// ----- stash create / edit -----
function accountSheet(acc) {
  const isNew = !acc;
  const st = acc ? { ...acc } : { name: '', icon: '💳', color: COLORS[S.accounts.length % COLORS.length], goal: 0 };
  openSheet(`
    <div class="sheet-head"><h2>${isNew ? 'New stash' : 'Edit stash'}</h2><button class="x" data-close aria-label="Close">✕</button></div>
    <div class="preview" id="prev"></div>
    ${isNew ? `<div class="field"><span class="label">Quick start</span><div class="chips">${TEMPLATES.map((t, i) =>
      `<button class="chip" data-tpl="${i}">${t.icon} ${h(t.name)}</button>`).join('')}</div></div>` : ''}
    <div class="field"><span class="label">Name</span><input class="input" id="name" maxlength="28" placeholder="New phone money" value="${h(st.name)}"></div>
    <div class="field"><span class="label">Icon</span><div class="icons" id="icons"></div></div>
    <div class="field"><span class="label">Color</span><div class="swatches" id="sw"></div></div>
    ${isNew ? `<div class="field"><span class="label">Already in there <span class="muted">(optional)</span></span><input class="input num" id="start" inputmode="decimal" placeholder="${h(S.settings.currency)}0"></div>` : ''}
    <div class="field"><span class="label">Goal <span class="muted">(optional, shows a progress bar)</span></span><input class="input num" id="goal" inputmode="decimal" placeholder="e.g. 800" value="${st.goal || ''}"></div>
    <button class="btn" id="save">${isNew ? 'Create stash' : 'Save'}</button>
    ${isNew ? '' : '<button class="btn danger" id="del" style="margin-top:8px">Delete stash</button>'}`, sh => {
    const draw = () => {
      const ink = DARK_INK.has(st.color) ? 'dark-ink' : '';
      $('#prev', sh).innerHTML = `<div class="tile ${ink}" style="--c:${st.color}"><div class="t-ico">${h(st.icon)}</div><div><div class="t-name">${h(st.name || 'Name me')}</div><div class="t-bal">${fmt(isNew ? (parseAmt(($('#start', sh) || {}).value) || 0) : valueOf(acc.id, 'all'))}</div></div></div>`;
      $('#icons', sh).innerHTML = ICONS.map(i => `<button class="${i === st.icon ? 'on' : ''}" data-ic="${i}">${i}</button>`).join('');
      $('#sw', sh).innerHTML = COLORS.map(c => `<button class="${c === st.color ? 'on' : ''}" style="--c:${c}" data-c="${c}" aria-label="Color"></button>`).join('');
      $$('[data-ic]', sh).forEach(b => b.onclick = () => { st.icon = b.dataset.ic; draw(); });
      $$('[data-c]', sh).forEach(b => b.onclick = () => { st.color = b.dataset.c; draw(); });
    };
    draw();
    $('#name', sh).oninput = e => { st.name = e.target.value; draw(); };
    const start = $('#start', sh);
    if (start) start.oninput = draw;
    $$('[data-tpl]', sh).forEach(b => b.onclick = () => {
      Object.assign(st, TEMPLATES[b.dataset.tpl]);
      $('#name', sh).value = st.name;
      draw();
    });
    $('#save', sh).onclick = () => {
      st.name = $('#name', sh).value.trim();
      if (!st.name) { $('#name', sh).focus(); return toast('Give it a name'); }
      st.goal = parseAmt($('#goal', sh).value) || 0;
      if (isNew) {
        const a = { id: uid(), name: st.name, icon: st.icon, color: st.color, goal: st.goal, createdAt: Date.now() };
        S.accounts.push(a);
        const s = parseAmt(start.value);
        if (s > 0) S.tx.push({ id: uid(), type: 'add', acc: a.id, amount: s, reason: 'Starting amount', details: '', photos: [], date: Date.now() });
        closeSheet();
        commit();
        setTimeout(() => pulse(a.id), 50);
        react(`Say hi to ${a.name} ${a.icon}`, 'happy');
      } else {
        Object.assign(acc, { name: st.name, icon: st.icon, color: st.color, goal: st.goal });
        closeSheet();
        commit();
      }
    };
    const del = $('#del', sh);
    if (del) del.onclick = () => {
      if (!confirm(`Delete "${acc.name}"? Its history and items go too. Money moved to or from other stashes stays there.`)) return;
      deleteAccount(acc.id);
      closeSheet();
      setTimeout(() => { location.replace('#/'); }, 120);
      react('Stash gone. Onward.', 'thinking');
    };
  });
}

function deleteAccount(id) {
  const name = (accById(id) || {}).name;
  const keep = [];
  for (const t of S.tx) {
    if (t.type === 'move' && (t.acc === id || t.to === id) && t.acc !== t.to) {
      // keep the other side's balance intact
      const other = t.acc === id ? t.to : t.acc;
      keep.push({ ...t, type: t.acc === id ? 'add' : 'sub', acc: other, to: undefined,
        reason: t.reason || (t.acc === id ? `From ${name}` : `To ${name}`) });
    } else if (t.acc === id) (t.photos || []).forEach(p => Photos.del(p));
    else keep.push(t);
  }
  S.tx = keep;
  S.items.filter(i => i.acc === id).forEach(i => (i.photos || []).forEach(p => Photos.del(p)));
  S.items = S.items.filter(i => i.acc !== id);
  S.accounts = S.accounts.filter(a => a.id !== id);
  save();
}

// ----- items (assets) -----
function tagOptions(sel) {
  return S.tags.map(t => `<option ${t === sel ? 'selected' : ''}>${h(t)}</option>`).join('') + '<option value="__new">+ New tag…</option>';
}
function wireTagSelect(sel) {
  sel.onchange = () => {
    if (sel.value !== '__new') return;
    const v = (prompt('New tag name (e.g. Crypto, Collectibles)') || '').trim();
    if (v && !S.tags.includes(v)) { S.tags.push(v); save(); }
    sel.innerHTML = tagOptions(v || S.tags[0]);
  };
}

function itemSheet(accId) {
  const a = accById(accId);
  const st = photoState();
  openSheet(`
    <div class="sheet-head"><h2>Add an item</h2><button class="x" data-close aria-label="Close">✕</button></div>
    <p class="label" style="margin-top:-6px">Stuff that's worth money: things to flip, gift cards, money someone owes you…</p>
    <div class="field"><span class="label">What is it?</span><input class="input" id="name" maxlength="50" placeholder="IKEA lamp, Switch, Amazon gift card…"></div>
    <div class="field"><span class="label">What did it cost? / what's it worth?</span>
      <div class="amount-wrap"><span class="cur">${h(S.settings.currency)}</span><input class="amount num" id="amt" inputmode="decimal" placeholder="0" aria-label="Cost"></div></div>
    <div class="field"><span class="label">Tag</span><select class="select" id="tag">${tagOptions('Inventory')}</select></div>
    <label class="toggle-row"><span>Paid with cash from ${h(a.name)}</span><input type="checkbox" class="switch" id="paid" checked></label>
    <div class="field"><span class="label">Notes <span class="muted">(optional)</span></span><textarea class="textarea" id="notes" placeholder="Where you got it, condition, asking price…"></textarea></div>
    <div class="field"><div class="row wrap"><button class="btn ghost small" id="cam">📷 Camera</button><button class="btn ghost small" id="gal">🖼️ Photo</button></div>
      <div class="photos" id="photos" style="margin-top:10px"></div></div>
    <button class="btn" id="save">Add item</button>`, (sh, ctl) => {
    ctl.onClose = () => finishPhotos(st);
    wirePhotos(sh, st);
    wireTagSelect($('#tag', sh));
    $('#save', sh).onclick = () => {
      const name = $('#name', sh).value.trim();
      const cost = parseAmt($('#amt', sh).value) || 0;
      if (!name) { $('#name', sh).focus(); return toast('Name the item'); }
      const paid = $('#paid', sh).checked;
      if (paid && !(cost > 0)) return toast('How much did you pay?');
      const now = Date.now();
      const it = { id: uid(), acc: accId, name, cost, value: cost, tag: $('#tag', sh).value, status: 'holding',
        boughtAt: now, notes: $('#notes', sh).value.trim(), photos: st.photos };
      S.items.push(it);
      if (paid) S.tx.push({ id: uid(), type: 'buy', acc: accId, amount: cost, reason: `Bought ${name}`, details: '', photos: [], date: now, itemId: it.id });
      st.saved = true;
      ui.itemTab = 'holding';
      closeSheet();
      commit();
      react(paid ? `${name} is in stock. Go flip it 📦` : `${name} added. It counts now.`, 'proud');
    };
  });
}

function itemDetail(id) {
  const it = itemById(id);
  if (!it) return;
  const sold = it.status === 'sold';
  const profit = sold ? it.soldPrice - it.cost : 0;
  openSheet(`
    <div class="sheet-head"><h2>${h(it.name)}</h2><button class="x" data-close aria-label="Close">✕</button></div>
    ${it.photos && it.photos.length ? `<div class="photos" style="margin-bottom:12px">${it.photos.map(p => `<img data-photo="${h(p)}" data-view="${h(p)}" alt="" style="width:96px;height:96px">`).join('')}</div>` : ''}
    <section class="card">
      <div class="kv"><span>Tag</span><span>${h(it.tag)}</span></div>
      <div class="kv"><span>Paid</span><span class="num">${fmt(it.cost)}</span></div>
      <div class="kv"><span>Got it</span><span>${h(fmtDay(it.boughtAt))}</span></div>
      ${sold ? `
      <div class="kv"><span>Sold for</span><span class="num">${fmt(it.soldPrice)}</span></div>
      <div class="kv"><span>Profit</span><span class="num ${profit >= 0 ? 'pos' : 'neg'}">${fmt(profit, true)}</span></div>
      <div class="kv"><span>Sold</span><span>${h(fmtDay(it.soldAt))}</span></div>` : ''}
    </section>
    ${it.notes ? `<div class="field"><span class="label">Notes</span><div class="details-text">${h(it.notes)}</div></div>` : ''}
    ${sold ? '' : `
    <div class="field"><span class="label">Worth now (your guess)</span>
      <div class="row"><input class="input num" id="val" inputmode="decimal" value="${it.value}"><button class="btn small ghost" id="saveVal">Update</button></div></div>
    <div class="field"><span class="label">Sold it? For how much</span>
      <div class="amount-wrap"><span class="cur">${h(S.settings.currency)}</span><input class="amount num" id="price" inputmode="decimal" placeholder="0" aria-label="Sale price"></div></div>
    <button class="btn" id="sell">Mark as sold 🏷️</button>`}
    <button class="btn danger" id="del" style="margin-top:8px">Delete item</button>`, sh => {
    $$('[data-view]', sh).forEach(i => i.onclick = () => viewPhoto(i.dataset.view));
    if (!sold) {
      $('#saveVal', sh).onclick = () => {
        const v = parseAmt($('#val', sh).value);
        if (!(v >= 0)) return toast('Enter a value');
        it.value = v;
        commit();
        toast('Value updated');
        echo.set('thinking', 1500);
      };
      $('#sell', sh).onclick = () => {
        const price = parseAmt($('#price', sh).value);
        if (!(price >= 0)) { $('#price', sh).focus(); return toast('What did it sell for?'); }
        const now = Date.now();
        Object.assign(it, { status: 'sold', soldAt: now, soldPrice: price });
        S.tx.push({ id: uid(), type: 'sell', acc: it.acc, amount: price, reason: `Sold ${it.name}`, details: '', photos: [], date: now, itemId: it.id });
        closeSheet();
        commit();
        pulse(it.acc);
        const p = price - it.cost;
        if (p > 0) react(`Sold for ${fmt(price)}: ${fmt(p)} profit! 💸`, 'happy', 4500);
        else if (p === 0) react('Broke even. Still counts.', 'thinking');
        else react(`Sold at a ${fmt(-p)} loss. Lesson learned?`, 'worried', 4000);
      };
    }
    $('#del', sh).onclick = () => {
      if (!confirm(`Delete "${it.name}"? Its buy/sell entries are removed too, so the cash goes back to how it was.`)) return;
      S.tx = S.tx.filter(t => t.itemId !== it.id);
      (it.photos || []).forEach(p => Photos.del(p));
      S.items = S.items.filter(i => i.id !== it.id);
      closeSheet();
      commit();
    };
  });
}

// ---------- backup ----------
const blobToDataURL = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });

async function exportBackup() {
  const photos = {};
  for (const k of await Photos.keys()) {
    const b = await Photos.get(k);
    if (b) photos[k] = await blobToDataURL(b);
  }
  const name = `pocketstash-${new Date().toISOString().slice(0, 10)}.json`;
  const json = JSON.stringify({ app: 'pocketstash', v: 1, exportedAt: Date.now(), state: S, photos });
  if (isNative) {
    // The Android WebView can't download blobs, so write the file natively and open the share sheet.
    const { Filesystem, Share } = window.Capacitor.Plugins;
    try {
      const { uri } = await Filesystem.writeFile({ path: name, data: json, directory: 'CACHE', encoding: 'utf8' });
      await Share.share({ title: 'PocketStash backup', files: [uri] });
      react('Backup ready. Save it somewhere safe.', 'proud');
    } catch (e) {
      if (!/cancel/i.test(e && e.message)) toast('Could not create the backup');
    }
    return;
  }
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'PocketStash backup' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  react('Backup saved. Smart move.', 'proud');
}

function importBackup() {
  const input = $('#fileImport');
  input.value = '';
  input.onchange = async () => {
    try {
      const data = JSON.parse(await input.files[0].text());
      if (data.app !== 'pocketstash' || !data.state) throw new Error('not a backup');
      if (!confirm('Replace everything on this phone with this backup?')) return;
      await Photos.clear();
      for (const [k, url] of Object.entries(data.photos || {})) await Photos.put(k, await (await fetch(url)).blob());
      S = normalize(data.state);
      applyTheme();
      commit();
      react('Welcome back, everything.', 'happy');
    } catch (e) {
      toast("That file doesn't look like a PocketStash backup");
    }
  };
  input.click();
}

// ---------- tutorial ----------
function tutorial(replay = false) {
  const el = document.createElement('div');
  el.className = 'tour';
  document.body.appendChild(el);
  const chosen = new Set(['Main', 'Savings']);
  const canPick = !S.accounts.length;
  const steps = [
    { title: "Hi, I'm Echo", mood: 'happy', text: 'I live up top and keep an eye on your money. Not in a creepy way. Mostly.' },
    { title: 'Stashes', mood: 'thinking',
      text: canPick ? 'Each colored square is a stash: main money, savings, birthday money, a new phone fund… Pick a few to start.'
        : 'Each colored square is a stash. Tap one to see its story: chart, history, items.',
      extra: () => canPick ? `<div class="starters">${TEMPLATES.map(t => `<button class="${chosen.has(t.name) ? 'on' : ''}" data-st="${h(t.name)}">${t.icon} ${h(t.name)}</button>`).join('')}</div>` : '' },
    { title: 'Add, spend, move', mood: 'idle',
      text: 'Those three buttons at the bottom do everything. Add a reason if you like: short, detailed, or a photo of the receipt.',
      extra: () => '<div class="mini-acts demo"><span class="pos">+ Add</span><span class="neg">− Spend</span><span style="color:var(--accent)">⇄ Move</span></div>' },
    { title: 'Things count too', mood: 'proud',
      text: 'Flipping Marketplace finds? Add items to a stash and track profit. Switch between everything, cash only, or just items whenever you want.' },
    { title: "That's it", mood: 'happy',
      text: 'Everything stays on this phone. No account, no internet. Tap me anytime for a thought.' },
  ];
  let i = 0, e = null;
  const finish = () => {
    if (!replay && canPick) {
      const now = Date.now();
      TEMPLATES.filter(t => chosen.has(t.name)).forEach(t =>
        S.accounts.push({ id: uid(), name: t.name, icon: t.icon, color: t.color, goal: 0, createdAt: now }));
    }
    S.settings.tutorialDone = true;
    e && e.destroy();
    el.remove();
    commit();
    setTimeout(() => react(S.accounts.length ? 'Tap a square to start, or hit + to add money.' : "I'll be right here. Watching. Kindly.", 'happy', 4500), 350);
  };
  const render = () => {
    const s = steps[i];
    el.innerHTML = `
      <svg class="echo echo-big" viewBox="0 0 120 72" aria-hidden="true">${$('#echo .echo').innerHTML}</svg>
      <h1>${h(s.title)}</h1><p>${h(s.text)}</p>${s.extra ? s.extra() : ''}
      <div class="tour-nav">
        <div class="dots">${steps.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
        <button class="btn" id="tNext">${i === steps.length - 1 ? "Let's go" : 'Next'}</button>
        ${i < steps.length - 1 ? '<button class="btn ghost" id="tSkip">Skip</button>' : ''}
      </div>`;
    e && e.destroy();
    e = makeEcho($('.echo-big', el), null);
    $$('.eye', el).forEach(g => { g.style.transform = ''; });
    e.set(s.mood);
    $$('[data-st]', el).forEach(b => b.onclick = () => {
      const n = b.dataset.st;
      chosen.has(n) ? chosen.delete(n) : chosen.add(n);
      b.classList.toggle('on');
      e.set('happy', 900);
    });
    $('#tNext', el).onclick = () => { if (i === steps.length - 1) finish(); else { i++; render(); } };
    const skip = $('#tSkip', el);
    if (skip) skip.onclick = finish;
  };
  render();
}

// ---------- theme + boot ----------
function applyTheme() {
  const t = S.settings.theme;
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = t;
}

function greet() {
  if (!S.accounts.length) return;
  const hr = new Date().getHours();
  const hi = hr < 5 ? 'Up late?' : hr < 12 ? 'Morning!' : hr < 18 ? 'Hey there.' : 'Evening.';
  setTimeout(() => react(`${hi} You've got ${fmt(valueOf(null, 'all'))} stashed.`, 'happy', 4000), 600);
}

applyTheme();
route();
if (!S.settings.tutorialDone) tutorial();
else greet();

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
// The APK already ships its files; a service worker there would only serve stale copies after updates.
if (!isNative && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
