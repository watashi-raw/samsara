// Gráficos SVG/HTML de SAMSARA: una sola tinta sobre papel, alto contraste.
import { moonGroup, phaseOfKey, phaseIndex, PHASES } from './moon.js';
import { fromKey, fmtShort, todayKey } from './dates.js';
import { FLOW_LEVEL, FLOW } from './catalog.js';

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FLOW_LABEL = Object.fromEntries(FLOW.map(f => [f.key, f.label]));
export const has = (e, cat, key) => { const v = e?.[cat]; return Array.isArray(v) ? v.includes(key) : v === key; };
const SEX_ON = e => e?.sex && e.sex !== 'none';

// ---------- Mapa del periodo: luna · flujo · libido · seggs · dolor · capa ----------
export function cycleMap({ days, entries, catalog, layer, width }) {
  const today = todayKey();
  const labelW = 64, top = 6;
  const cellW = Math.max(15, Math.min(30, Math.floor((width - labelW - 8) / days.length)));
  const W = labelW + cellW * days.length + 4;
  const options = catalog.filter(c => c.category === layer && c.active);
  const counts = options.map(o => ({ o, n: days.filter(d => has(entries.get(d), layer, o.key)).length })).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 10);
  const rowMoon = top, rowDay = top + 26, rowFlowBase = top + 84, rowLibBase = top + 128, rowSex = top + 148, rowPainBase = top + 196, rowLayer = top + 214, rowH = 18;
  const H = rowLayer + counts.length * rowH + 12;
  const x = i => labelW + i * cellW; const cx = i => x(i) + cellW / 2;
  const parts = [];
  days.forEach((d, i) => {
    const e = entries.get(d); const lv = FLOW_LEVEL[e?.flow] || 0;
    if (lv >= 1) parts.push(`<rect x="${x(i)}" y="0" width="${cellW}" height="${H}" class="cm-period"/>`);
    if (d === today) parts.push(`<rect x="${x(i)}" y="0" width="${cellW}" height="${H}" class="cm-todayband"/><text x="${cx(i)}" y="${H - 2}" class="cm-today">hoy</text>`);
  });
  const lab = (y, t) => `<text x="${labelW - 8}" y="${y}" class="cm-label">${esc(t)}</text>`;
  parts.push(lab(rowMoon + 14, 'luna'), lab(rowFlowBase - 14, 'flujo'), lab(rowLibBase - 12, 'libido'), lab(rowSex + 4, 'seggs'), lab(rowPainBase - 12, 'dolor'));
  const step = cellW >= 22 ? 1 : cellW >= 17 ? 2 : 3;
  days.forEach((d, i) => {
    parts.push(`<g transform="translate(${cx(i)},${rowMoon + 10})">${moonGroup(phaseOfKey(d), Math.min(6.5, cellW / 2 - 2))}</g>`);
    const dd = fromKey(d).getDate();
    if (dd === 1 || i === 0 || (i % step === 0)) parts.push(`<text x="${cx(i)}" y="${rowDay + 8}" class="cm-day">${dd}</text>`);
  });
  // flujo
  parts.push(`<line x1="${labelW}" x2="${W}" y1="${rowFlowBase}" y2="${rowFlowBase}" class="cm-axis"/>`);
  days.forEach((d, i) => {
    const lv = FLOW_LEVEL[entries.get(d)?.flow] || 0; if (!lv) return;
    const h = 8 + (lv - 1) * 11; const bw = Math.max(4, cellW - 4);
    parts.push(`<rect x="${cx(i) - bw / 2}" y="${rowFlowBase - h}" width="${bw}" height="${h}" rx="2" class="cm-flow f${lv}"/>`);
  });
  // líneas: libido y dolor
  const line = (base, field, cls) => {
    parts.push(`<line x1="${labelW}" x2="${W}" y1="${base}" y2="${base}" class="cm-axis"/>`);
    const pts = []; let segs = [];
    days.forEach((d, i) => {
      const e = entries.get(d);
      if (e && e[field] != null) { const y = base - (e[field] / 5) * 30; segs.push(`${cx(i)},${y}`); pts.push({ x: cx(i), y, v: e[field] }); }
      else { if (segs.length > 1) parts.push(`<polyline points="${segs.join(' ')}" class="cm-line ${cls}"/>`); segs = []; }
    });
    if (segs.length > 1) parts.push(`<polyline points="${segs.join(' ')}" class="cm-line ${cls}"/>`);
    pts.forEach(p => parts.push(`<circle cx="${p.x}" cy="${p.y}" r="${p.v ? 3 : 1.6}" class="cm-pt ${cls}"/>`));
  };
  line(rowLibBase, 'libido', 'lib');
  // seggs
  parts.push(`<line x1="${labelW}" x2="${W}" y1="${rowSex}" y2="${rowSex}" class="cm-grid"/>`);
  days.forEach((d, i) => { const e = entries.get(d); if (SEX_ON(e)) parts.push(`<path transform="translate(${cx(i) - 5},${rowSex - 5}) scale(.42)" d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z" class="cm-heart ${e.sex === 'more' ? 'big' : ''}"/>`); });
  line(rowPainBase, 'pain', 'pain');
  // capa
  counts.forEach(({ o }, r) => {
    const y = rowLayer + r * rowH + rowH / 2;
    parts.push(lab(y + 4, o.label.length > 10 ? o.label.slice(0, 9) + '…' : o.label));
    parts.push(`<line x1="${labelW}" x2="${W}" y1="${y}" y2="${y}" class="cm-grid"/>`);
    days.forEach((d, i) => { if (has(entries.get(d), layer, o.key)) parts.push(`<circle cx="${cx(i)}" cy="${y}" r="4" class="cm-dot"/>`); });
  });
  days.forEach((d, i) => {
    const e = entries.get(d); const ph = PHASES[phaseIndex(phaseOfKey(d))].label;
    const tip = [fmtShort(d), ph, e?.flow && e.flow !== 'none' ? `flujo ${FLOW_LABEL[e.flow].toLowerCase()}` : null, e?.libido != null ? `libido ${e.libido}/5` : null, SEX_ON(e) ? `seggs: ${e.sex}` : null, e?.pain != null ? `dolor ${e.pain}/5` : null,
      ...options.filter(o => has(e, layer, o.key)).map(o => o.label)].filter(Boolean).join(' · ');
    parts.push(`<rect x="${x(i)}" y="0" width="${cellW}" height="${H}" fill="transparent" class="cm-hit" data-tip="${esc(tip)}"/>`);
  });
  const empty = counts.length ? '' : `<p class="chart-note">Nada registrado en esta capa para este periodo.</p>`;
  return `<div class="chart-scroll"><svg class="cm" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg></div>${empty}`;
}

// ---------- Mapa de calor: filas × columnas, una sola tinta ----------
export function heatmap({ columns, rows, matrix, totals, unit = '%' }) {
  if (!rows.length) return `<p class="chart-note">Aún no hay suficientes check-ins para cruzar datos.</p>`;
  const pcts = matrix.map((r, ri) => r.map((v, ci) => totals[ci] ? v / totals[ci] : 0));
  const max = Math.max(0.01, ...pcts.flat());
  const head = columns.map(c => `<div class="hm-col">${c.glyph || ''}<span>${esc(c.label)}</span></div>`).join('');
  const body = rows.map((r, ri) => `<div class="hm-row-label">${esc(r.label)}</div>` + columns.map((c, ci) => {
    const v = matrix[ri][ci]; const t = totals[ci] || 0; const pct = Math.round(pcts[ri][ci] * 100); const rel = pcts[ri][ci] / max;
    return `<div class="hm-cell" style="--v:${rel.toFixed(2)}" data-tip="${esc(r.label)} · ${esc(c.label)}: ${v} de ${t} días (${pct}${unit})">${t && v ? pct : ''}</div>`;
  }).join('')).join('');
  return `<div class="hm" style="--cols:${columns.length}"><div></div>${head}${body}</div>
  <div class="hm-legend"><span>menos días</span><i></i><span>más días</span></div>`;
}

// ---------- Barras: duración de cada ciclo ----------
export function cycleBars({ cycles, avg, width }) {
  const done = cycles.filter(c => c.length);
  if (!done.length) return `<p class="chart-note">Se necesitan al menos dos periodos registrados para medir un ciclo.</p>`;
  const H = 150, padL = 30, padB = 26, padT = 18; const W = Math.max(width, 60 + done.length * 34);
  const maxV = Math.max(35, ...done.map(c => c.length)); const innerW = W - padL - 10;
  const bw = Math.min(36, innerW / done.length - 8);
  const y = v => padT + (H - padT - padB) * (1 - v / maxV);
  const parts = [];
  [0, 14, 28].forEach(v => parts.push(`<line x1="${padL}" x2="${W - 10}" y1="${y(v)}" y2="${y(v)}" class="cm-grid"/><text x="${padL - 6}" y="${y(v) + 3}" class="cm-label">${v}</text>`));
  parts.push(`<line x1="${padL}" x2="${W - 10}" y1="${y(avg)}" y2="${y(avg)}" class="cm-ref"/><text x="${W - 10}" y="${y(avg) - 4}" class="cm-ref-label">promedio ${avg}</text>`);
  done.forEach((c, i) => {
    const cx = padL + (i + 0.5) * (innerW / done.length);
    parts.push(`<rect x="${cx - bw / 2}" y="${y(c.length)}" width="${bw}" height="${y(0) - y(c.length)}" rx="3" class="cm-bar" data-tip="Ciclo del ${fmtShort(c.start)}: ${c.length} días · periodo ${c.periodLength} días"/>`);
    parts.push(`<text x="${cx}" y="${y(c.length) - 5}" class="cm-val">${c.length}</text>`);
    parts.push(`<text x="${cx}" y="${H - 8}" class="cm-day">${fmtShort(c.start)}</text>`);
  });
  return `<div class="chart-scroll"><svg class="cm" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg></div>`;
}

// ---------- Tooltip flotante compartido ----------
export function installTooltips(root) {
  let tip = document.getElementById('tip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip); }
  const show = (el, ev) => {
    tip.textContent = el.dataset.tip; tip.hidden = false;
    const r = el.getBoundingClientRect(); const px = ev?.clientX ?? r.left + r.width / 2;
    const tw = tip.offsetWidth; let left = px - tw / 2; left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
    tip.style.left = left + 'px'; tip.style.top = (r.top - tip.offsetHeight - 8 + window.scrollY) + 'px';
  };
  root.addEventListener('pointerover', e => { const el = e.target.closest('[data-tip]'); if (el) show(el, e); });
  root.addEventListener('pointerout', e => { if (e.target.closest('[data-tip]')) tip.hidden = true; });
  root.addEventListener('click', e => { const el = e.target.closest('[data-tip]'); if (el) { show(el, e); setTimeout(() => tip.hidden = true, 2200); } });
}
