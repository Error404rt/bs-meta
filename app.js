const BRAWLERS_API = 'https://api.brawlify.com/v1/brawlers';
const EVENTS_API   = 'https://api.brawlapi.com/v1/events';
const META_URL     = 'data/meta.json';
const PIN_CDN  = id => `https://cdn.brawlify.com/brawlers/borderless/${id}.png`;
const FULL_CDN = id => `https://cdn.brawlify.com/brawlers/borderless/${id}.png`;
const MODE_ICON = id => `https://cdn.brawlify.com/game-modes/regular/${id}.png`;

const MODES = [
  { key: 'gemGrab',      label: 'GEM GRAB',  scId: 48000000, side: 'L' },
  { key: 'heist',        label: 'HEIST',     scId: 48000002, side: 'L' },
  { key: 'brawlBall',    label: 'B. BALL',   scId: 48000005, side: 'L' },
  { key: 'knockout',     label: 'KNOCKOUT',  scId: 48000020, side: 'L' },
  { key: 'bounty',       label: 'BOUNTY',    scId: 48000003, side: 'L' },
  { key: 'fiveVsFive',   label: '5v5',       scId: 48000005, side: 'R' },
  { key: 'hotZone',      label: 'HOTZONE',   scId: 48000017, side: 'R' },
  { key: 'soloShowdown', label: 'SOLO SD',   scId: 48000006, side: 'R' },
  { key: 'duoShowdown',  label: 'DUO SD',    scId: 48000009, side: 'R' },
];

const MODE_KEY_BY_HASH = {
  'GemGrab': 'gemGrab',
  'Heist': 'heist',
  'BrawlBall': 'brawlBall',
  'Knockout': 'knockout',
  'Bounty': 'bounty',
  'HotZone': 'hotZone',
  'Showdown': 'soloShowdown',
  'SoloShowdown': 'soloShowdown',
  'DuoShowdown': 'duoShowdown',
};

const state = {
  brawlers: [],
  meta: null,
  events: { active: [], upcoming: [] },
};

function tierFromAvg(avg) {
  if (avg >= 4.4) return 'S';
  if (avg >= 3.8) return 'A';
  if (avg >= 3.2) return 'B';
  if (avg >= 2.5) return 'C';
  return 'D';
}
function avgRating(ratings) {
  const vs = Object.values(ratings || {});
  if (!vs.length) return 0;
  return vs.reduce((a, b) => a + b, 0) / vs.length;
}
function starsHtml(n) {
  const full = Math.max(0, Math.min(5, n | 0));
  return `<span class="stars">${'★'.repeat(full)}<span class="off">${'★'.repeat(5 - full)}</span></span>`;
}

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url} → ${r.status}`);
  return r.json();
}

async function loadStaticData() {
  const [brawlers, meta] = await Promise.all([
    fetchJson(BRAWLERS_API),
    fetchJson(META_URL),
  ]);
  state.brawlers = brawlers.list
    .filter(b => b.released !== false)
    .map(b => ({
      id: b.id,
      name: b.name,
      class: b.class?.name || 'Unknown',
      rarity: b.rarity?.name || '',
      rarityColor: b.rarity?.color || '#ffd11a',
      starPowers: (b.starPowers || []).map(s => ({ name: s.name, img: s.imageUrl })),
      gadgets:    (b.gadgets    || []).map(g => ({ name: g.name, img: g.imageUrl })),
      imageUrl: PIN_CDN(b.id),
      portrait: FULL_CDN(b.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  state.meta = meta;
}

async function loadEvents() {
  try {
    state.events = await fetchJson(EVENTS_API);
  } catch (e) {
    console.warn('events fetch failed', e);
    state.events = { active: [], upcoming: [] };
  }
}

function liveModes() {
  const set = new Set();
  for (const slot of (state.events.active || [])) {
    const hash = slot.mode?.hash;
    if (hash && MODE_KEY_BY_HASH[hash]) set.add(MODE_KEY_BY_HASH[hash]);
  }
  return set;
}

/* ====== MAIN: сетка пинов ====== */
function pinHtml(b) {
  const info = state.meta.brawlers[b.id];
  const ratings = info?.ratings || {};
  const tier = tierFromAvg(avgRating(ratings));
  return `
    <button class="pin" data-id="${b.id}" data-tier="${tier}" title="${b.name}">
      <span class="bubble">
        <img src="${b.imageUrl}" alt="${b.name}" loading="lazy" onerror="this.style.opacity=0">
      </span>
      <span class="pin-name">${b.name}</span>
    </button>`;
}

function renderGrid() {
  const grid = document.getElementById('brawlerGrid');
  grid.innerHTML = state.brawlers.length
    ? state.brawlers.map(pinHtml).join('')
    : '<div class="loading">Никого не нашли</div>';
}

/* ====== BRAWLER: карточка ====== */
function openBrawler(id) {
  const b = state.brawlers.find(x => x.id == id);
  if (!b) return;

  const info = state.meta.brawlers[b.id] || {};
  const ratings = info.ratings || {};
  const avg = avgRating(ratings);
  const tier = tierFromAvg(avg);
  const live = liveModes();

  const modeTile = m => {
    const r = ratings[m.key] || 0;
    return `
      <div class="mode-tile ${live.has(m.key) ? 'live' : ''}" title="${m.label}">
        <div class="icon-wrap"><img src="${MODE_ICON(m.scId)}" alt=""></div>
        <div class="mode-info">
          <div class="mode-name">${m.label}</div>
          ${starsHtml(r)}
        </div>
      </div>`;
  };

  const leftModes  = MODES.filter(m => m.side === 'L').map(modeTile).join('');
  const rightModes = MODES.filter(m => m.side === 'R').map(modeTile).join('');

  const sp = b.starPowers[0];
  const gd = b.gadgets[0];
  const sp2 = b.starPowers[1] || sp;

  const card = document.getElementById('brawlerCard');
  card.innerHTML = `
    <div class="bc-head">
      <h2 class="bc-name">${b.name.toUpperCase()}</h2>
      <div class="bc-chips">
        <span class="chip rarity" style="background:${b.rarityColor}">${b.rarity}</span>
        <span class="chip">${b.class}</span>
        <span class="chip" style="background:#000">Tier ${tier}</span>
      </div>
      <div class="bc-tier-line">
        Средняя актуальность: ${avg.toFixed(1)} / 5 · Топ: <b>${(MODES.find(m => m.key === info.topMode) || {}).label || '—'}</b>
      </div>
    </div>

    <div class="bc-stage">
      <div class="bc-modes left">${leftModes}</div>
      <div class="bc-portrait">
        <div class="portrait-bg"></div>
        <img class="portrait" src="${b.portrait}" alt="${b.name}">
      </div>
      <div class="bc-modes right">${rightModes}</div>
    </div>

    <div class="best-build">
      <h3>BEST BUILD</h3>
      <div class="row">
        <b>Star Power:</b> ${sp?.name || '—'}
        &nbsp;·&nbsp;
        <b>Gadget:</b> ${gd?.name || '—'}
      </div>
    </div>

    <div class="gear-row">
      ${sp  ? `<div class="gear" title="Star Power: ${sp.name}"><img src="${sp.img}" alt=""></div>` : '<div class="gear"></div>'}
      ${gd  ? `<div class="gear" title="Gadget: ${gd.name}"><img src="${gd.img}" alt=""></div>` : '<div class="gear"></div>'}
      ${sp2 ? `<div class="gear" title="Star Power 2: ${sp2.name}"><img src="${sp2.img}" alt=""></div>` : '<div class="gear"></div>'}
    </div>

    <div class="creator-boost-corner">
      <span class="cc-label">CONTENT CREATOR BOOST</span>
      <span class="cc-code">Goshakotanov</span>
    </div>
  `;

  // фон-плакат: оттенок из редкости
  const view = document.getElementById('brawlerView');
  const base = b.rarityColor || '#ff44ff';
  view.style.setProperty('--card-c1', base);
  view.style.setProperty('--card-c2', shade(base, -30));

  document.body.dataset.view = 'brawler';
  window.scrollTo(0, 0);
}

function shade(hex, percent) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  const f = (1 + percent / 100);
  r = Math.max(0, Math.min(255, Math.round(r * f)));
  g = Math.max(0, Math.min(255, Math.round(g * f)));
  b = Math.max(0, Math.min(255, Math.round(b * f)));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function backToMain() {
  document.body.dataset.view = 'main';
  window.scrollTo(0, 0);
}

/* ====== REFRESH ====== */
async function refreshAll() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('loading');
  try {
    const tasks = [loadEvents()];
    if (!state.brawlers.length) {
      tasks.push(loadStaticData());
    } else {
      tasks.push(fetchJson(META_URL).then(m => { state.meta = m; }));
    }
    await Promise.all(tasks);
    renderGrid();
    if (document.body.dataset.view === 'brawler') {
      // если карточка открыта — переотрисовать с актуальной ротацией
      const id = document.querySelector('#brawlerCard')?.dataset.id;
      // ничего не делаем (карточка уже отрисована при открытии)
    }
  } catch (e) {
    console.error(e);
    alert('Не удалось обновить данные. Проверь интернет.');
  } finally {
    btn.classList.remove('loading');
  }
}

/* ====== INIT ====== */
async function init() {
  document.getElementById('refreshBtn').addEventListener('click', refreshAll);
  document.getElementById('backBtn').addEventListener('click', backToMain);

  document.getElementById('brawlerGrid').addEventListener('click', e => {
    const pin = e.target.closest('.pin');
    if (pin) openBrawler(pin.dataset.id);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.dataset.view === 'brawler') backToMain();
  });

  try {
    await loadStaticData();
    renderGrid();
  } catch (e) {
    document.getElementById('brawlerGrid').innerHTML =
      '<div class="loading">Ошибка загрузки. Открой через http-сервер, не file://</div>';
    console.error(e);
  }
  loadEvents(); // фоном — для подсветки live-режимов
}

init();
