const BRAWLERS_API = 'https://api.brawlify.com/v1/brawlers';
const EVENTS_API   = 'https://api.brawlapi.com/v1/events';
const META_URL     = 'data/meta.json';
const PIN_CDN = id => `https://cdn.brawlify.com/brawlers/borderless/${id}.png`;
const MAP_CDN = id => `https://cdn.brawlify.com/maps/regular/${id}.png`;

const MODES = [
  { key: 'gemGrab',      label: 'Gem Grab'   },
  { key: 'heist',        label: 'Heist'      },
  { key: 'brawlBall',    label: 'Brawl Ball' },
  { key: 'knockout',     label: 'Knockout'   },
  { key: 'bounty',       label: 'Bounty'     },
  { key: 'hotZone',      label: 'Hot Zone'   },
  { key: 'soloShowdown', label: 'Solo SD'    },
  { key: 'duoShowdown',  label: 'Duo SD'     },
  { key: 'fiveVsFive',   label: '5v5'        },
];

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

function fmtCountdown(endIso) {
  if (!endIso) return '';
  const ms = +new Date(endIso) - Date.now();
  if (ms <= 0) return 'скоро смена';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `до смены ${h}ч ${m}м` : `до смены ${m}м`;
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
      rarityColor: b.rarity?.color || '#fff',
      starPowers: (b.starPowers || []).map(s => ({ name: s.name, img: s.imageUrl })),
      gadgets:    (b.gadgets    || []).map(g => ({ name: g.name, img: g.imageUrl })),
      imageUrl: PIN_CDN(b.id),
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

function renderRotation() {
  const grid = document.getElementById('rotationGrid');
  const meta = document.getElementById('rotationMeta');
  const active = (state.events.active || []).filter(e => e.map || e.mode);

  if (!active.length) {
    grid.innerHTML = '<div class="loading">Ротация недоступна. Нажми ОБНОВИТЬ через минуту.</div>';
    meta.textContent = '';
    return;
  }

  grid.innerHTML = active.map(slot => {
    const mode = slot.mode || {};
    const map  = slot.map  || {};
    const modeName = mode.name || '—';
    const mapName  = map.name  || '—';
    const img = map.id ? MAP_CDN(map.id) : '';
    const color = mode.color || '#000a';
    return `
      <div class="rotation-card">
        <div class="map-img" style="background-image:url('${img}')"></div>
        <div class="map-meta">
          <span class="mode-pill" style="background:${color}">${modeName}</span>
          <div class="map-name">${mapName}</div>
          <div class="map-time">${fmtCountdown(slot.endTime)}</div>
        </div>
      </div>`;
  }).join('');

  meta.textContent = `Последнее обновление: ${new Date().toLocaleTimeString('ru-RU')} • слотов: ${active.length}`;
}

function pinHtml(b) {
  const info = state.meta.brawlers[b.id];
  const ratings = info?.ratings || {};
  const tier = tierFromAvg(avgRating(ratings));
  return `
    <button class="pin" data-id="${b.id}" data-tier="${tier}" title="${b.name}">
      <span class="pin-frame">
        <img src="${b.imageUrl}" alt="${b.name}" loading="lazy" onerror="this.style.opacity=0">
      </span>
      <span class="tier-badge">${tier}</span>
      <span class="pin-name">${b.name}</span>
    </button>`;
}

function applyFiltersAndRender() {
  const q       = document.getElementById('searchInput').value.trim().toLowerCase();
  const cls     = document.getElementById('classFilter').value;
  const modeKey = document.getElementById('modeFilter').value;
  const sort    = document.getElementById('sortBy').value;

  let list = state.brawlers.slice();
  if (q)   list = list.filter(b => b.name.toLowerCase().includes(q));
  if (cls) list = list.filter(b => b.class === cls);

  if (sort === 'meta' || modeKey) {
    list.sort((a, b) => {
      const ra = state.meta.brawlers[a.id]?.ratings || {};
      const rb = state.meta.brawlers[b.id]?.ratings || {};
      const va = modeKey ? (ra[modeKey] || 0) : avgRating(ra);
      const vb = modeKey ? (rb[modeKey] || 0) : avgRating(rb);
      if (vb !== va) return vb - va;
      return a.name.localeCompare(b.name, 'ru');
    });
  }

  document.getElementById('brawlerCount').textContent = `(${list.length}/${state.brawlers.length})`;
  const grid = document.getElementById('brawlerGrid');
  grid.innerHTML = list.length
    ? list.map(pinHtml).join('')
    : '<div class="loading">Никого не нашли</div>';
}

function fillClassFilter() {
  const classes = [...new Set(state.brawlers.map(b => b.class))].sort();
  const sel = document.getElementById('classFilter');
  for (const c of classes) {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  }
}

function openBrawler(id) {
  const b = state.brawlers.find(x => x.id == id);
  if (!b) return;

  const info = state.meta.brawlers[b.id] || {};
  const ratings = info.ratings || {};
  const avg = avgRating(ratings);
  const tier = tierFromAvg(avg);

  const modesHtml = MODES.map(m => `
    <div class="mode-row">
      <span class="mode-name">${m.label}</span>
      ${starsHtml(ratings[m.key] || 0)}
    </div>`).join('');

  const sp = info.bestBuild?.starPower || b.starPowers[0]?.name || '—';
  const gd = info.bestBuild?.gadget    || b.gadgets[0]?.name    || '—';
  const topMode = info.topMode
    ? (MODES.find(m => m.key === info.topMode)?.label || info.topMode)
    : null;

  document.getElementById('modalBody').innerHTML = `
    <div class="brawler-header">
      <div class="brawler-portrait"><img src="${b.imageUrl}" alt="${b.name}"></div>
      <div class="brawler-title">
        <h3>${b.name.toUpperCase()}</h3>
        <div class="brawler-meta">
          <span class="chip" style="background:${b.rarityColor};color:#000">${b.rarity}</span>
          <span class="chip">${b.class}</span>
          <span class="chip" style="background:#000">Tier ${tier}</span>
        </div>
        <div class="tier-line">
          Средняя актуальность: ${avg.toFixed(1)} / 5
          ${topMode ? `• Топ-режим: <b>${topMode}</b>` : ''}
        </div>
      </div>
    </div>

    <div class="modes-block">
      <h4>АКТУАЛЬНОСТЬ ПО РЕЖИМАМ</h4>
      <div class="modes-grid">${modesHtml}</div>
    </div>

    <div class="best-build">
      <h4>BEST BUILD</h4>
      <div class="build-row">
        <div><b>Star Power:</b> ${sp}</div>
        <div><b>Gadget:</b> ${gd}</div>
      </div>
    </div>
  `;

  const modal = document.getElementById('modal');
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

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
    renderRotation();
    applyFiltersAndRender();
  } catch (e) {
    console.error(e);
    alert('Не удалось обновить данные. Проверь интернет.');
  } finally {
    btn.classList.remove('loading');
  }
}

async function init() {
  document.getElementById('refreshBtn').addEventListener('click', refreshAll);
  document.getElementById('searchInput').addEventListener('input', applyFiltersAndRender);
  document.getElementById('classFilter').addEventListener('change', applyFiltersAndRender);
  document.getElementById('modeFilter').addEventListener('change', applyFiltersAndRender);
  document.getElementById('sortBy').addEventListener('change', applyFiltersAndRender);

  document.getElementById('brawlerGrid').addEventListener('click', e => {
    const pin = e.target.closest('.pin');
    if (pin) openBrawler(pin.dataset.id);
  });

  document.getElementById('modal').addEventListener('click', e => {
    if (e.target.matches('[data-close]')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  try {
    await loadStaticData();
    fillClassFilter();
    applyFiltersAndRender();
  } catch (e) {
    document.getElementById('brawlerGrid').innerHTML =
      '<div class="loading">Ошибка загрузки. Открой через http-сервер, не file://</div>';
    console.error(e);
  }

  await loadEvents();
  renderRotation();
}

init();
