// SAMSARA · aplicación
import { ADMIN_EMAIL } from './config.js';
import { supabaseStore, demoStore, sampleEntries } from './db.js';
import * as D from './dates.js';
import { phaseOfKey, phaseInfo, phaseIndex, illumination, ageOf, moonSVG, nextEvent, lunarBounds, PHASES } from './moon.js';
import { moonArt, orchidArt, cycleRing, photoArt } from './art.js';
import { icon, ICON_KEYS } from './icons.js';
import { CATEGORIES, CATEGORY_MAP, FLOW, FLOW_LEVEL, DEFAULT_CATALOG } from './catalog.js';
import { analyze, cycleInfo, menstrualBounds, PHASE_LABEL, PHASE_ORDER } from './cycle.js';
import { cycleMap, heatmap, cycleBars, installTooltips, esc, has } from './charts.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const state = {
  store: null, session: null, entries: new Map(), catalog: [], analysis: analyze([]),
  view: 'calendar', calMode: 'month', calRef: D.todayKey(), chartMode: 'cycle', chartRef: D.todayKey(), layer: 'mood',
  draft: null, settingsCat: 'mood', pickIcon: 'dot',
};
const TABS = [['calendar', 'Calendario'], ['charts', 'Stats'], ['journal', 'Diario'], ['settings', 'Setup']];
const LAYERS = [['mood', 'Mood'], ['sex', 'Seggs'], ['symptoms', 'Síntomas'], ['energy', 'Energy'], ['activities', 'Qué hice']];
const TEST_MARK = '[prueba]';
const safeLS = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { } } };
const FLOW_MAP = Object.fromEntries(FLOW.map(f => [f.key, f]));
const LIBIDO = ['cero', 'bajo', 'normal', 'con ganas', 'muy alto', 'on fire'];
const SEX_ON = e => e?.sex && e.sex !== 'none';

// ---------- utilidades ----------
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); }
function optionsOf(cat) { return state.catalog.filter(c => c.category === cat && c.active); }
function labelOf(cat, key) { const o = state.catalog.find(c => c.category === cat && c.key === key); return o ? o.label : key; }
function iconOf(cat, key) { const o = state.catalog.find(c => c.category === cat && c.key === key); return icon(o ? o.icon : 'dot'); }
function refreshAnalysis() { state.analysis = analyze([...state.entries.values()].sort((a, b) => a.day < b.day ? -1 : 1)); }
function containerWidth() { return Math.max(280, ($('main').clientWidth || 360) - 32 - 24); }
function errorText(err) {
  const m = (err && err.message) || String(err);
  if (/invalid login/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(m)) return 'El correo no está confirmado. Márcalo como confirmado en Supabase.';
  if (/failed to fetch|network/i.test(m)) return 'Sin conexión con la base de datos.';
  if (/relation .* does not exist|schema cache/i.test(m)) return 'Faltan tablas o columnas: ejecuta supabase/schema.sql.';
  return m;
}

// ---------- fondos ASCII y flores ----------
function hashN(i, j, s) { let h = (i * 374761393 + j * 668265263 + s * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16); return ((h >>> 0) % 1000) / 1000; }
function renderAsciiBg() {
  const cols = Math.ceil(innerWidth / 6.6) + 2, rows = Math.ceil(innerHeight / 16) + 2; const lines = [];
  for (let r = 0; r < rows; r++) {
    let l = '';
    for (let c = 0; c < cols; c++) { const h = hashN(c, r, 11); l += h > 0.994 ? '*' : h > 0.986 ? '+' : h > 0.972 ? '.' : h > 0.966 ? ':' : ' '; }
    lines.push(l);
  }
  $('#ascii-bg').textContent = lines.join('\n');
}
let artCache = {};
const PHOTOS = {
  hero: { src: 'img/orchid-black.jpg', width: 1000, seed: 3, stretch: 1.1, cell: 8, asciiFrom: 0.05, asciiTo: 0.95, dir: 'x' },
  single: { src: 'img/orchid-single.jpg', width: 760, key: true, seed: 5, stretch: 0.3, cell: 6, asciiFrom: 0, asciiTo: 0.28, dir: 'y', boost: 1.05 },
  magenta: { src: 'img/orchid-magenta.jpg', width: 900, seed: 7, stretch: 1.2, cell: 7, asciiFrom: 0.9, asciiTo: 0.05, dir: 'y' },
  ascii: { src: 'img/orchid-single.jpg', width: 760, key: true, seed: 11, stretch: 0.45, cell: 6, asciiFrom: 1, asciiTo: 1, dir: 'y', boost: 1.3, under: 0.42, glow: true },
  spotted: { src: 'img/orchid-spotted.jpg', width: 900, seed: 9, stretch: 1, cell: 7, asciiFrom: 0.2, asciiTo: 0.9, dir: 'x' },
};
async function photoInto(sel, key, fallback) {
  const el = $(sel); if (!el) return;
  try {
    artCache[key] = artCache[key] || await photoArt(PHOTOS[key].src, PHOTOS[key]);
    if (!el.isConnected) return;
    const c = artCache[key].cloneNode(); c.getContext('2d').drawImage(artCache[key], 0, 0); el.replaceWith(c);
  } catch (e) { if (fallback) orchidInto(sel, ...fallback); }
}
function orchidInto(sel, size, seed, cell) { const el = $(sel); if (!el) return; const key = `${size}-${seed}-${cell}`; artCache[key] = artCache[key] || orchidArt(size, seed, cell); const c = artCache[key].cloneNode(); c.getContext('2d').drawImage(artCache[key], 0, 0); el.replaceWith(c); }

// ---------- arranque ----------
async function boot() {
  renderAsciiBg(); let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(renderAsciiBg, 200); });
  installTooltips(document.body);
  renderTabs(); bindSheet();
  if (location.hash === '#demo') { state.store = demoStore(); state.session = await state.store.getSession(); await enterApp(); return; }
  try { state.store = await supabaseStore(); } catch (e) { showLogin('No se pudo cargar la conexión con Supabase.'); return; }
  try { state.session = await state.store.getSession(); } catch { }
  if (state.session) await enterApp(); else showLogin();
}
function showLogin(msg = '') {
  $('#app').hidden = true; $('#login').hidden = false; photoInto('#login-orchid', 'ascii', [560, 1, 7]); 
  const remembered = safeLS.get('samsara.email') || ADMIN_EMAIL;
  if (ADMIN_EMAIL) { $('#email-field').hidden = true; $('#email').required = false; }
  if (remembered) $('#email').value = remembered;
  $('#login-error').textContent = msg;
  $('#login-form').onsubmit = async ev => {
    ev.preventDefault(); const btn = $('#login-btn'); btn.disabled = true; $('#login-error').textContent = '';
    const email = (ADMIN_EMAIL || $('#email').value).trim(); const password = $('#password').value;
    try { state.session = await state.store.signIn(email, password); safeLS.set('samsara.email', email); await enterApp(); }
    catch (e) { $('#login-error').textContent = errorText(e); }
    finally { btn.disabled = false; }
  };
}
async function enterApp() {
  try {
    const [entries, catalog] = await Promise.all([state.store.loadEntries(), state.store.loadCatalog()]);
    state.entries = new Map(entries.map(e => [e.day, e]));
    state.catalog = catalog && catalog.length ? catalog : DEFAULT_CATALOG;
  } catch (e) { showLogin(errorText(e)); return; }
  refreshAnalysis();
  $('#login').hidden = true; $('#app').hidden = false;
  $('#top-date').textContent = D.fmtLong(D.todayKey());
  $('#top-note').textContent = state.store.demo ? 'demo · datos de ejemplo' : 'admin';
  renderToday(); switchView('calendar');
}

// ---------- navegación ----------
function renderTabs() {
  $('#tabbar').innerHTML = TABS.map(([k, l], i) => `<button class="tab" role="tab" data-view="${k}" aria-selected="false"><span class="num">/0${i + 1}</span><span>${l}</span></button>`).join('');
  $('#tabbar').addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) switchView(b.dataset.view); });
}
function switchView(name) {
  state.view = name;
  $$('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.view === name)));
  $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === name));
  renderPanel();
}
function renderPanel() { ({ calendar: renderCalendar, charts: renderCharts, journal: renderJournal, settings: renderSettings })[state.view](); }
function render() { renderToday(); renderPanel(); }

// ---------- periodos (mes / luna / ciclo) ----------
function periodBounds(mode, ref) {
  if (mode === 'month') { const b = D.monthBounds(ref); return { ...b, title: D.fmtMonth(ref), prev: D.shiftMonth(ref, -1), next: D.shiftMonth(ref, 1) }; }
  if (mode === 'lunar') { const b = lunarBounds(ref); return { ...b, title: `Luna · ${D.fmtRange(b.start, b.end)}`, prev: D.addDays(b.start, -1), next: D.addDays(b.end, 1) }; }
  const b = menstrualBounds(state.analysis, ref); if (!b) return null;
  return { start: b.start, end: b.end, title: `Ciclo ${b.index + 1} · ${D.fmtRange(b.start, b.end)}`, prev: b.index > 0 ? D.addDays(b.start, -1) : null, next: b.cycle.end ? D.addDays(b.end, 1) : null };
}
function periodControls(prefix, mode, bounds) {
  const seg = [['month', 'Mes'], ['lunar', 'Luna'], ['cycle', 'Ciclo']].map(([k, l]) => `<button data-${prefix}-mode="${k}" aria-pressed="${mode === k}">${l}</button>`).join('');
  const nav = bounds ? `<div class="period-nav">
      <button class="icon-btn prev" data-${prefix}-nav="prev" aria-label="Anterior" ${bounds.prev ? '' : 'disabled'}>${icon('chevron')}</button>
      <div class="title">${esc(bounds.title)}</div>
      <button class="icon-btn" data-${prefix}-nav="next" aria-label="Siguiente" ${bounds.next ? '' : 'disabled'}>${icon('chevron')}</button></div>` : '';
  return `<div class="toolbar"><div class="segmented">${seg}</div></div>${nav}`;
}

// ---------- HOY ----------
function summaryChips(e, cls = 'pill') {
  if (!e) return '';
  const chips = [];
  if (e.flow && e.flow !== 'none') chips.push(`<span class="${cls} hero">${icon(FLOW_MAP[e.flow].icon)}flujo ${FLOW_MAP[e.flow].label.toLowerCase()}</span>`);
  if (e.libido != null) chips.push(`<span class="${cls} hero">${icon('fire')}libido ${e.libido}/5</span>`);
  if (e.sex) chips.push(`<span class="${cls} hero">${iconOf('sex', e.sex)}${esc(labelOf('sex', e.sex))}</span>`);
  if (e.pain != null) chips.push(`<span class="${cls}">${icon('bolt')}dolor ${e.pain}/5</span>`);
  if (e.sleep_hours != null) chips.push(`<span class="${cls}">${icon('zzz')}${e.sleep_hours} h</span>`);
  for (const c of CATEGORIES) {
    if (c.key === 'sex') continue;
    const v = e[c.key]; const arr = Array.isArray(v) ? v : v ? [v] : [];
    arr.forEach(k => chips.push(`<span class="${cls}">${iconOf(c.key, k)}${esc(labelOf(c.key, k))}</span>`));
  }
  if (e.notes) chips.push(`<span class="${cls}">${icon('note')}nota</span>`);
  return chips.join('');
}
function dataRow(k, v, cls = '') { return `<div class="data-row ${cls}"><span class="k">${k}</span><span class="v">${v}</span></div>`; }
function renderToday() {
  const k = D.todayKey(); const p = phaseOfKey(k); const info = phaseInfo(p); const ill = Math.round(illumination(p) * 100);
  const a = state.analysis; const ci = cycleInfo(a, k); const e = state.entries.get(k); const now = new Date();
  const full = nextEvent(now, 0.5), nw = nextEvent(now, 0);
  const until = a.nextStart ? D.diffDays(k, a.nextStart) : null;
  let cycleText;
  if (ci) cycleText = (until != null ? (until > 0 ? `Tu próximo periodo cae aprox el ${D.fmtShort(a.nextStart)}, en ${until} días. ` : until === 0 ? 'Tu periodo cae aprox hoy. ' : `Tu periodo se esperaba hace ${-until} días; si ya llegó, márcalo en el check-in. `) : '') + `Luna llena el ${D.fmtShort(D.toKey(full))}, luna nueva el ${D.fmtShort(D.toKey(nw))}.`;
  else cycleText = 'Todavía no hay periodos registrados. Marca el flujo en tu check-in y SAMSARA empieza a contar tus ciclos y a cruzarlos con la luna.';
  const ring = cycleRing({ length: ci ? ci.length : 28, periodLength: ci ? (ci.cycle.length ? ci.cycle.periodLength : Math.max(ci.cycle.periodLength, a.avgPeriod)) : 5, day: ci ? ci.day : null, ovDay: ci ? ci.length - 14 : null, hasData: !!ci });
  const [l1, ...rest] = info.label.split(' ');
  const chipsOf = cat => { const v = e?.[cat]; const arr = Array.isArray(v) ? v : v ? [v] : []; return arr.map(x => `<i>${iconOf(cat, x)}${esc(labelOf(cat, x))}</i>`).join(''); };
  const rows = [
    dataRow('flujo', e?.flow && e.flow !== 'none' ? FLOW_MAP[e.flow].label : '—', 'hero'),
    dataRow('libido', e?.libido != null ? `${e.libido} · ${LIBIDO[e.libido]}` : '—', 'hero'),
    dataRow('seggs', e?.sex ? labelOf('sex', e.sex) : '—', 'hero'),
    e?.pain != null ? dataRow('dolor', `${e.pain} / 5`) : '',
    ...['mood', 'energy', 'symptoms', 'breast', 'activities', 'care', 'digestion'].map(c => chipsOf(c) ? dataRow(CATEGORY_MAP[c].label, chipsOf(c)) : ''),
    ['discharge_status', 'discharge_touch', 'discharge_smell'].some(c => e?.[c]) ? dataRow('flujo vaginal', ['discharge_status', 'discharge_touch', 'discharge_smell'].filter(c => e?.[c]).map(c => `<i>${iconOf(c, e[c])}${esc(labelOf(c, e[c]))}</i>`).join('')) : '',
    e?.sleep_hours != null ? dataRow('sueño', `${e.sleep_hours} h`) : '',
    e?.notes ? dataRow('nota', esc(e.notes), 'note') : '',
  ].join('');
  $('#today').innerHTML = `
    <div class="hero-head"><div><div class="eyebrow">/ hoy · ${D.fmtLong(k)}</div><h2 class="display">${l1}<br>${rest.join(' ')}</h2></div>
      <div class="caption">${ill}% iluminada<br>día lunar ${Math.floor(ageOf(p)) + 1}</div></div>
    <div class="ring-wrap">${ring}<div class="ring-center"><canvas id="moon-art"></canvas></div></div>
    <div class="today-meta">${ci ? `<span class="pill-tag">fase ${PHASE_LABEL[ci.phase]}</span><span class="big">día ${ci.day}</span><span class="muted">de ${ci.length}</span>` : `<span class="pill-tag">sin ciclo aún</span>`}<span class="muted">· ciclo promedio ${a.avgLength} d</span></div>
    <p class="cycle-line">${cycleText}</p>
    <div class="cta-wrap"><button class="btn primary" id="cta-today">${icon('plus')}${e ? 'Editar check-in' : 'Check-in de hoy'}</button>${e ? '<span class="eyebrow">check-in listo ✦</span>' : '<span class="eyebrow">nada registrado hoy</span>'}</div>
    <div class="today-data">${rows}</div>
    <div class="orchid-deco"><canvas id="today-orchid"></canvas></div>`;
  $('#cta-today').onclick = () => openSheet(k);
  const key = 'moon-' + Math.round(p * 1000); artCache[key] = artCache[key] || moonArt(280, p, 6);
  const mc = artCache[key].cloneNode(); mc.getContext('2d').drawImage(artCache[key], 0, 0); $('#moon-art').replaceWith(mc);
  photoInto('#today-orchid', 'single', [360, 2, 6]);
}

// ---------- CALENDARIO ----------
function renderCalendar() {
  const b = periodBounds(state.calMode, state.calRef); const a = state.analysis; const today = D.todayKey();
  let grid = '';
  if (!b) grid = `<p class="chart-note" style="margin-top:16px">Todavía no hay ciclos detectados. Registra el flujo de tu periodo y aparecen aquí.</p>`;
  else {
    const days = D.range(b.start, b.end); const lead = D.weekdayIndex(b.start);
    const predicted = new Set(); if (a.nextStart) for (let i = 0; i < a.avgPeriod; i++) { const d = D.addDays(a.nextStart, i); if (d > today) predicted.add(d); }
    const cells = Array(lead).fill('<div class="day empty"></div>').concat(days.map(d => {
      const e = state.entries.get(d); const lv = FLOW_LEVEL[e?.flow] || 0; const future = d > today;
      const cls = ['day', d === today ? 'today' : '', e ? 'has' : '', SEX_ON(e) ? 'sex' : '', future ? 'future' : '', predicted.has(d) ? 'predicted' : ''].filter(Boolean).join(' ');
      return `<button class="${cls}" data-day="${d}" data-flow="${lv}" ${future ? 'disabled' : ''} aria-label="${D.fmtLong(d)}"><span class="n">${D.fromKey(d).getDate()}</span>${moonSVG(phaseOfKey(d), 18)}<span class="bar"></span></button>`;
    }));
    grid = `<div class="cal-head">${D.WEEKDAYS_SHORT.map(w => `<span>${w}</span>`).join('')}</div><div class="cal">${cells.join('')}</div>
      <div class="legend"><span><i style="background:var(--flow1)"></i>spotting</span><span><i style="background:var(--flow2)"></i>light</span><span><i style="background:var(--flow3)"></i>medio</span><span><i style="background:var(--flow4)"></i>full</span><span><i style="border-top:1px dashed var(--crimson);height:0"></i>periodo aprox</span><span>♥ seggs</span></div>`;
  }
  $('#view-calendar').innerHTML = `<div class="section"><div class="section-head"><h2>Calendario</h2><span class="eyebrow">${state.entries.size} check-ins</span></div>${periodControls('cal', state.calMode, b)}${grid}</div>`;
  $('#view-calendar').onclick = e => {
    const m = e.target.closest('[data-cal-mode]'); if (m) { state.calMode = m.dataset.calMode; state.calRef = D.todayKey(); return renderCalendar(); }
    const n = e.target.closest('[data-cal-nav]'); if (n && b) { state.calRef = n.dataset.calNav === 'prev' ? b.prev : b.next; return renderCalendar(); }
    const d = e.target.closest('.day[data-day]'); if (d) openSheet(d.dataset.day);
  };
}

// ---------- STATS ----------
function heatData(columnOf, columns, layer) {
  const entries = [...state.entries.values()];
  const totals = columns.map(() => 0); const colIdx = new Map(entries.map(e => [e.day, columnOf(e)]));
  entries.forEach(e => { const c = colIdx.get(e.day); if (c != null) totals[c]++; });
  const special = [
    { label: 'Periodo', test: e => (FLOW_LEVEL[e.flow] || 0) >= 2 },
    { label: 'Libido ≥ 3', test: e => e.libido != null && e.libido >= 3 },
    { label: 'Seggs', test: e => SEX_ON(e) },
    { label: 'Dolor ≥ 3', test: e => e.pain != null && e.pain >= 3 },
  ];
  const opts = optionsOf(layer).map(o => ({ label: o.label, test: e => has(e, layer, o.key) }));
  const count = r => entries.filter(e => colIdx.get(e.day) != null && r.test(e)).length;
  const rows = [...special.filter(r => count(r) > 0), ...opts.map(r => ({ ...r, n: count(r) })).filter(r => r.n > 0).sort((a, b) => b.n - a.n).slice(0, 12)];
  const matrix = rows.map(r => columns.map((_, ci) => entries.filter(e => colIdx.get(e.day) === ci && r.test(e)).length));
  return { rows, matrix, totals };
}
function renderCharts() {
  const b = periodBounds(state.chartMode, state.chartRef); const a = state.analysis; const w = containerWidth();
  const layerSeg = LAYERS.map(([k, l]) => `<button data-layer="${k}" aria-pressed="${state.layer === k}">${l}</button>`).join('');
  const map = b ? cycleMap({ days: D.range(b.start, b.end), entries: state.entries, catalog: state.catalog, layer: state.layer, width: w })
    : `<p class="chart-note">Todavía no hay ciclos detectados: registra el flujo de tu periodo.</p>`;
  const moonCols = PHASES.map((p, i) => ({ label: p.short, glyph: moonSVG(i / 8, 16) }));
  const hmMoon = heatmap({ columns: moonCols, ...heatData(e => phaseIndex(phaseOfKey(e.day)), moonCols, state.layer) });
  const cycCols = PHASE_ORDER.map(k => ({ label: PHASE_LABEL[k] }));
  const hmCycle = a.hasData ? heatmap({ columns: cycCols, ...heatData(e => { const ci = cycleInfo(a, e.day); return ci ? PHASE_ORDER.indexOf(ci.phase) : null; }, cycCols, state.layer) })
    : `<p class="chart-note">Se activa cuando haya al menos un periodo registrado.</p>`;
  const layerLabel = LAYERS.find(l => l[0] === state.layer)[1].toLowerCase();
  $('#view-charts').innerHTML = `<div class="section">
    <div class="section-head"><h2>Stats</h2><span class="eyebrow">${state.entries.size} días</span></div>
    <div class="toolbar"><div class="segmented">${layerSeg}</div></div>
    ${periodControls('ch', state.chartMode, b)}
    <div class="chart-card"><h3>Mapa del periodo</h3>${map}
      <div class="legend"><span><i style="background:var(--ink)"></i>flujo</span><span><i style="background:var(--ink);height:2px"></i>libido 0–5</span><span>♥ seggs</span><span><i style="border-top:2px dashed var(--ink);height:0"></i>dolor 0–5</span><span><i style="background:var(--ink);width:8px;height:8px;border-radius:50%"></i>${esc(layerLabel)}</span></div></div>
    <div class="chart-card"><h3>Por fase lunar <span class="hint">% de días</span></h3>${hmMoon}</div>
    <div class="chart-card"><h3>Por fase del ciclo <span class="hint">% de días</span></h3>${hmCycle}</div>
    <div class="chart-card"><h3>Duración de tus ciclos <span class="hint">días</span></h3>${cycleBars({ cycles: a.cycles, avg: a.avgLength, width: w })}</div>
    <p class="small muted" style="margin-top:14px">Los mapas de calor usan todos tus check-ins. El mapa del periodo muestra solo el intervalo elegido: cada columna es un día, con su luna arriba; luego el flujo, la libido, los días con seggs, el dolor y, abajo, la capa que elijas.</p>
  </div>`;
  $('#view-charts').onclick = e => {
    const l = e.target.closest('[data-layer]'); if (l) { state.layer = l.dataset.layer; return renderCharts(); }
    const m = e.target.closest('[data-ch-mode]'); if (m) { state.chartMode = m.dataset.chMode; state.chartRef = D.todayKey(); return renderCharts(); }
    const n = e.target.closest('[data-ch-nav]'); if (n && b) { state.chartRef = n.dataset.chNav === 'prev' ? b.prev : b.next; return renderCharts(); }
  };
}

// ---------- DIARIO ----------
function renderJournal() {
  const list = [...state.entries.values()].sort((a, b) => a.day < b.day ? 1 : -1);
  const items = list.map(e => {
    const p = phaseOfKey(e.day); const ci = cycleInfo(state.analysis, e.day);
    return `<article class="entry" data-day="${e.day}">
      <div class="when">${moonSVG(p, 32)}<div class="d">${D.fmtShort(e.day)}</div></div>
      <div><div class="title"><span class="t">${D.fmtLong(e.day)}</span>${ci ? `<span class="mono muted">día ${ci.day} · ${PHASE_LABEL[ci.phase].toLowerCase()}</span>` : ''}</div>
        <div class="chips">${summaryChips({ ...e, notes: null }, '')}</div>
        ${e.notes ? `<p class="note">${esc(e.notes)}</p>` : ''}</div></article>`;
  }).join('');
  $('#view-journal').innerHTML = `<div class="section"><div class="section-head"><h2>Diario</h2><span class="eyebrow">${list.length} días</span></div>
    ${items || `<div class="art-frame empty-art"><canvas id="journal-orchid"></canvas><span class="art-num">/03</span><span class="art-cap">Diario<br>vacío</span></div><p class="chart-note">Tu diario está vacío. Empieza con el check-in de hoy.</p>`}</div>`;
  photoInto('#journal-orchid', 'magenta', [260, 3, 6]);
  $('#view-journal').onclick = e => { const it = e.target.closest('.entry'); if (it) openSheet(it.dataset.day); };
}

// ---------- SETUP ----------
function renderSettings() {
  const cat = state.settingsCat; const rows = state.catalog.filter(c => c.category === cat).sort((a, b) => a.sort - b.sort);
  const catSel = CATEGORIES.map(c => `<option value="${c.key}" ${c.key === cat ? 'selected' : ''}>${c.label}</option>`).join('');
  const list = rows.map(r => `<div class="cat-row ${r.active ? '' : 'off'}" data-id="${r.id}">${icon(r.icon)}
      <input value="${esc(r.label)}" data-rename aria-label="Nombre de la opción">
      <button class="mini" data-toggle>${r.active ? 'ocultar' : 'mostrar'}</button>
      <button class="mini icon-only" data-del aria-label="Eliminar">${icon('trash')}</button></div>`).join('');
  const picker = ICON_KEYS.map(k => `<button type="button" data-pick="${k}" aria-pressed="${state.pickIcon === k}" title="${k}">${icon(k)}</button>`).join('');
  const email = state.session?.user?.email || '';
  const testCount = [...state.entries.values()].filter(e => (e.notes || '').startsWith(TEST_MARK)).length;
  $('#view-settings').innerHTML = `<div class="section">
    <div class="section-head"><h2>Setup</h2><span class="eyebrow">admin</span></div>
    <div class="card"><h3>Cuenta</h3><p class="small" style="margin:10px 0 12px">${state.store.demo ? 'Estás en modo demo con datos de ejemplo. Nada se guarda.' : `Sesión iniciada como <span class="mono">${esc(email)}</span>. Solo tu usuario puede leer o escribir estos check-ins.`}</p>
      <div class="settings-actions"><button class="btn ghost" id="btn-logout">${icon('logout')}${state.store.demo ? 'Salir del demo' : 'Cerrar sesión'}</button>
      <button class="btn ghost" id="btn-export">${icon('download')}Exportar CSV</button></div></div>
    ${state.store.demo ? '' : `<div class="card"><h3>Mes de prueba</h3>
      <p class="small" style="margin:10px 0 12px">Carga un mes de check-ins de ejemplo (marcados con <span class="mono">${TEST_MARK}</span>) para ver cómo se ven los gráficos. No pisa días que ya tengan registro y se pueden borrar de golpe.${testCount ? ` Ahora hay ${testCount} días de prueba.` : ''}</p>
      <div class="settings-actions"><button class="btn ghost" id="btn-test-load">${icon('sparkle')}Cargar mes de prueba</button>${testCount ? `<button class="btn danger" id="btn-test-clear">${icon('trash')}Borrar prueba</button>` : ''}</div></div>`}
    <div class="card"><h3>Catálogo de opciones</h3>
      <p class="small muted" style="margin:10px 0 0">Renombra, oculta o agrega opciones. Los cambios aplican de inmediato en el check-in.</p>
      <div class="field" style="margin-top:12px"><label for="cat-select">Categoría</label><select id="cat-select">${catSel}</select></div>
      <div class="cat-list">${list}</div>
      <div class="add-row"><div class="field"><label for="new-label">Nueva opción</label><input id="new-label" placeholder="Nombre"></div>
        <div class="field"><label for="new-emoji">Emoji (opcional)</label><input id="new-emoji" placeholder="✦" maxlength="4"></div>
        <button class="btn" id="btn-add">${icon('plus')}Agregar</button></div>
      <div class="icon-picker" id="icon-picker">${picker}</div></div>
    <div class="card"><h3>Sobre SAMSARA</h3><p class="small" style="margin-top:10px">Las fases lunares se calculan localmente a partir del ciclo sinódico. Los ciclos menstruales se detectan cuando registras flujo light o mayor tras al menos diez días sin sangrado; la ovulación se estima catorce días antes del siguiente ciclo. Nada de esto sustituye una consulta médica.</p><p class="small muted" style="margin:8px 0 0">Fotografías de orquídeas: domdomegg (CC BY 4.0), André Karwath (CC BY-SA 2.5), Jedesto (CC BY-SA 4.0) y Anne Jea. (CC BY-SA 4.0), vía Wikimedia Commons, intervenidas por SAMSARA.</p></div>
  </div>`;
  const v = $('#view-settings');
  $('#cat-select').onchange = e => { state.settingsCat = e.target.value; renderSettings(); };
  $('#btn-logout').onclick = async () => { await state.store.signOut(); state.session = null; state.entries = new Map(); if (state.store.demo) { location.hash = ''; location.reload(); } else showLogin(); };
  $('#btn-export').onclick = exportCSV;
  const tl = $('#btn-test-load'); if (tl) tl.onclick = loadTestMonth;
  const tc = $('#btn-test-clear'); if (tc) tc.onclick = clearTestMonth;
  $('#btn-add').onclick = async () => {
    const label = $('#new-label').value.trim(); if (!label) return toast('Escribe un nombre');
    const emoji = $('#new-emoji').value.trim();
    const key = label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'opcion_' + Date.now();
    if (state.catalog.some(c => c.category === cat && c.key === key)) return toast('Ya existe esa opción');
    try { const row = await state.store.addCatalog({ category: cat, key, label, icon: emoji || state.pickIcon, sort: rows.length ? Math.max(...rows.map(r => r.sort)) + 1 : 0 }); state.catalog.push(row); toast('Opción agregada'); renderSettings(); }
    catch (e) { toast(errorText(e)); }
  };
  v.onclick = async e => {
    const pk = e.target.closest('[data-pick]'); if (pk) { state.pickIcon = pk.dataset.pick; $$('[data-pick]', v).forEach(b => b.setAttribute('aria-pressed', String(b === pk))); return; }
    const row = e.target.closest('.cat-row'); if (!row) return; const id = row.dataset.id; const item = state.catalog.find(c => c.id === id);
    if (e.target.closest('[data-toggle]')) { try { const r = await state.store.updateCatalog(id, { active: !item.active }); Object.assign(item, r); renderSettings(); } catch (err) { toast(errorText(err)); } }
    if (e.target.closest('[data-del]')) { if (!confirm(`¿Eliminar "${item.label}"? Los check-ins anteriores conservan la clave.`)) return; try { await state.store.deleteCatalog(id); state.catalog = state.catalog.filter(c => c.id !== id); renderSettings(); toast('Eliminada'); } catch (err) { toast(errorText(err)); } }
  };
  v.addEventListener('change', async e => {
    const inp = e.target.closest('[data-rename]'); if (!inp) return; const row = inp.closest('.cat-row'); const item = state.catalog.find(c => c.id === row.dataset.id);
    const label = inp.value.trim(); if (!label || label === item.label) { inp.value = item.label; return; }
    try { const r = await state.store.updateCatalog(item.id, { label }); Object.assign(item, r); toast('Renombrada'); } catch (err) { toast(errorText(err)); inp.value = item.label; }
  });
}
async function loadTestMonth() {
  const btn = $('#btn-test-load'); btn.disabled = true; toast('Cargando…');
  const sample = sampleEntries({ days: 32, marker: TEST_MARK }); let n = 0;
  try {
    for (const s of sample) {
      if (state.entries.has(s.day)) continue;
      const p = phaseOfKey(s.day); const { id, ...rest } = s;
      const row = { ...rest, user_id: state.session.user.id, moon_phase: phaseInfo(p).key, moon_illumination: Math.round(illumination(p) * 1000) / 10 };
      const saved = await state.store.saveEntry(row); state.entries.set(saved.day, saved); n++;
    }
    refreshAnalysis(); toast(`${n} días de prueba listos`); renderSettings();
  } catch (e) { toast(errorText(e)); btn.disabled = false; }
}
async function clearTestMonth() {
  const test = [...state.entries.values()].filter(e => (e.notes || '').startsWith(TEST_MARK));
  if (!confirm(`¿Borrar ${test.length} días de prueba?`)) return;
  try { for (const e of test) { await state.store.deleteEntry(e.id); state.entries.delete(e.day); } refreshAnalysis(); toast('Prueba borrada'); renderSettings(); }
  catch (e) { toast(errorText(e)); }
}
function exportCSV() {
  const cols = ['day', 'moon_phase', 'moon_illumination', 'flow', 'libido', 'sex', 'pain', 'sleep_hours', ...CATEGORIES.filter(c => c.key !== 'sex').map(c => c.key), 'notes'];
  const q = v => { if (v == null) return ''; const s = Array.isArray(v) ? v.join('|') : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const lines = [cols.join(','), ...[...state.entries.values()].sort((a, b) => a.day < b.day ? -1 : 1).map(e => cols.map(c => q(e[c])).join(','))];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `samsara-${D.todayKey()}.csv`; document.body.appendChild(a); a.click(); a.remove();
  toast('CSV generado');
}

// ---------- HOJA DE CHECK-IN ----------
function blankDraft(day) {
  const d = { day, flow: null, libido: null, pain: null, sleep_hours: null, notes: '' };
  CATEGORIES.forEach(c => d[c.key] = c.multi ? [] : null); return d;
}
function openSheet(day) {
  const e = state.entries.get(day); const d = blankDraft(day);
  if (e) { Object.assign(d, { id: e.id, flow: e.flow, libido: e.libido ?? null, pain: e.pain, sleep_hours: e.sleep_hours, notes: e.notes || '' }); CATEGORIES.forEach(c => d[c.key] = c.multi ? [...(e[c.key] || [])] : (e[c.key] ?? null)); }
  state.draft = d;
  const p = phaseOfKey(day); const ci = cycleInfo(state.analysis, day);
  const group = (title, body, hint = '', cls = '') => `<div class="group ${cls}"><h3>${title}${hint ? `<span class="hint">${hint}</span>` : ''}</h3>${body}</div>`;
  const chips = c => `<div class="chips">${optionsOf(c.key).map(o => `<button type="button" class="chip" data-cat="${c.key}" data-key="${esc(o.key)}" aria-pressed="false">${icon(o.icon)}<span>${esc(o.label)}</span></button>`).join('')}</div>`;
  const flow = `<div class="flow-row">${FLOW.map(f => `<button type="button" class="flow-btn" data-flow="${f.key}" aria-pressed="false">${icon(f.icon)}<span>${f.label}</span></button>`).join('')}</div>`;
  const scale = (attr, cls, lo, hi) => `<div class="scale ${cls}">${[0, 1, 2, 3, 4, 5].map(n => `<button type="button" data-${attr}="${n}" aria-pressed="false">${n}</button>`).join('')}</div><div class="scale-labels"><span>${lo}</span><span>${hi}</span></div>`;
  const sleep = `<div class="inline-fields"><div class="field"><label for="f-sleep">Horas de sueño</label><input id="f-sleep" type="number" min="0" max="24" step="0.5" inputmode="decimal" placeholder="7.5"></div></div>`;
  const cats = k => CATEGORY_MAP[k];
  const dischargeGroup = ['discharge_status', 'discharge_touch', 'discharge_smell'].map(k => `<div style="margin-bottom:12px"><div class="eyebrow" style="margin-bottom:8px">${cats(k).label.split('·')[1].trim()}</div>${chips(cats(k))}</div>`).join('');
  $('#sheet').innerHTML = `<div class="sheet-backdrop" data-close></div>
    <div class="sheet-panel">
      <div class="sheet-head"><div class="grip"></div>${moonSVG(p, 40, 'moon')}
        <div><div class="t" id="sheet-title">${D.fmtLong(day)}</div><div class="s">${phaseInfo(p).label}${ci ? ` · día ${ci.day} · ${PHASE_LABEL[ci.phase]}` : ''}</div></div>
        <button class="icon-btn close" data-close aria-label="Cerrar">${icon('x')}</button></div>
      <div class="sheet-body">
        ${group('Flujo', flow, '', 'hero')}
        ${group('Libido', scale('libido', 'lib', LIBIDO[0], LIBIDO[5]), 'mood sexual 0–5', 'hero')}
        ${group('Seggs', chips(cats('sex')), 'uno', 'hero')}
        ${group('Dolor', scale('pain', '', 'sin dolor', 'muy fuerte'), '0 a 5')}
        ${group('Mood', chips(cats('mood')), 'varios')}
        ${group('Energy', chips(cats('energy')), 'varios')}
        ${group('Síntomas', chips(cats('symptoms')), 'varios')}
        ${group('Boobs', chips(cats('breast')), 'varios')}
        ${group('Flujo vaginal', dischargeGroup, 'uno por fila')}
        ${group('Digestión', chips(cats('digestion')), 'uno')}
        ${group('Qué hice', chips(cats('activities')), 'varios')}
        ${group('Cuidados', chips(cats('care')), 'varios')}
        ${group('Sueño', sleep)}
        ${group('Notas', `<div class="field"><textarea id="f-notes" placeholder="Algo que quieras recordar de hoy…"></textarea></div>`)}
      </div>
      <div class="sheet-actions">${d.id ? `<button class="btn danger" data-delete aria-label="Eliminar check-in">${icon('trash')}</button>` : ''}<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" data-save>Guardar</button></div>
    </div>`;
  $('#f-notes').value = d.notes || ''; if (d.sleep_hours != null) $('#f-sleep').value = d.sleep_hours;
  syncSheet(); const sh = $('#sheet'); sh.hidden = false; sh.classList.remove('closing'); document.body.style.overflow = 'hidden';
}
function syncSheet() {
  const d = state.draft; const sh = $('#sheet');
  $$('.flow-btn', sh).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.flow === d.flow)));
  $$('[data-pain]', sh).forEach(b => b.setAttribute('aria-pressed', String(d.pain != null && Number(b.dataset.pain) === d.pain)));
  $$('[data-libido]', sh).forEach(b => b.setAttribute('aria-pressed', String(d.libido != null && Number(b.dataset.libido) === d.libido)));
  $$('.chip', sh).forEach(b => b.setAttribute('aria-pressed', String(has(d, b.dataset.cat, b.dataset.key))));
}
function closeSheet() {
  const sh = $('#sheet'); if (sh.hidden) return; sh.classList.add('closing'); document.body.style.overflow = '';
  setTimeout(() => { sh.hidden = true; sh.classList.remove('closing'); sh.innerHTML = ''; }, 420);
}
function bindSheet() {
  $('#sheet').addEventListener('click', async e => {
    if (e.target.closest('[data-close]')) return closeSheet();
    const d = state.draft; if (!d) return;
    const f = e.target.closest('.flow-btn'); if (f) { d.flow = d.flow === f.dataset.flow ? null : f.dataset.flow; return syncSheet(); }
    const p = e.target.closest('[data-pain]'); if (p) { const n = Number(p.dataset.pain); d.pain = d.pain === n ? null : n; return syncSheet(); }
    const l = e.target.closest('[data-libido]'); if (l) { const n = Number(l.dataset.libido); d.libido = d.libido === n ? null : n; return syncSheet(); }
    const c = e.target.closest('.chip'); if (c) {
      const cat = c.dataset.cat, key = c.dataset.key;
      if (CATEGORY_MAP[cat].multi) { const i = d[cat].indexOf(key); i >= 0 ? d[cat].splice(i, 1) : d[cat].push(key); } else d[cat] = d[cat] === key ? null : key;
      return syncSheet();
    }
    if (e.target.closest('[data-save]')) return saveDraft();
    if (e.target.closest('[data-delete]')) return deleteDraft();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
}
async function saveDraft() {
  const d = state.draft; const p = phaseOfKey(d.day);
  const sleep = $('#f-sleep').value; const notes = $('#f-notes').value.trim();
  const row = { day: d.day, moon_phase: phaseInfo(p).key, moon_illumination: Math.round(illumination(p) * 1000) / 10, flow: d.flow, libido: d.libido, pain: d.pain, sleep_hours: sleep === '' ? null : Number(sleep), notes: notes || null };
  CATEGORIES.forEach(c => row[c.key] = d[c.key]);
  if (d.id) row.id = d.id; if (state.session?.user?.id && !state.store.demo) row.user_id = state.session.user.id;
  const btn = $('[data-save]'); btn.disabled = true;
  try { const saved = await state.store.saveEntry(row); state.entries.set(d.day, saved); refreshAnalysis(); closeSheet(); toast('Listo ✦'); render(); }
  catch (e) { toast(errorText(e)); btn.disabled = false; }
}
async function deleteDraft() {
  const d = state.draft; if (!confirm('¿Borrar el check-in de este día?')) return;
  try { await state.store.deleteEntry(d.id); state.entries.delete(d.day); refreshAnalysis(); closeSheet(); toast('Borrado'); render(); }
  catch (e) { toast(errorText(e)); }
}

addEventListener('hashchange', () => location.reload());
boot();
