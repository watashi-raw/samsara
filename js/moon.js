// Cálculo de fase lunar y dibujos de la luna (SVG simple, halftone y ASCII).
import { fromKey, addDays } from './dates.js';

export const SYNODIC = 29.530588853;
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

export function phaseOf(date) {
  const days = (date.getTime() - REF_NEW_MOON) / 86400000;
  let p = (days / SYNODIC) % 1; if (p < 0) p += 1; return p; // 0 nueva · 0.5 llena
}
export function phaseOfKey(k) { return phaseOf(fromKey(k)); }
export function ageOf(p) { return p * SYNODIC; }
export function illumination(p) { return (1 - Math.cos(2 * Math.PI * p)) / 2; }

export const PHASES = [
  { key: 'new', label: 'Luna nueva', short: 'Nueva', glyph: '○' },
  { key: 'waxing_crescent', label: 'Luna creciente', short: 'Creciente', glyph: '◗' },
  { key: 'first_quarter', label: 'Cuarto creciente', short: 'C. creciente', glyph: '◑' },
  { key: 'waxing_gibbous', label: 'Gibosa creciente', short: 'G. creciente', glyph: '◕' },
  { key: 'full', label: 'Luna llena', short: 'Llena', glyph: '●' },
  { key: 'waning_gibbous', label: 'Gibosa menguante', short: 'G. menguante', glyph: '◕' },
  { key: 'third_quarter', label: 'Cuarto menguante', short: 'C. menguante', glyph: '◐' },
  { key: 'waning_crescent', label: 'Luna menguante', short: 'Menguante', glyph: '◖' },
];
export function phaseIndex(p) { return Math.round(p * 8) % 8; }
export function phaseInfo(p) { return PHASES[phaseIndex(p)]; }

// Próximos eventos (llena / nueva) a partir de una fecha
export function nextEvent(date, target) {
  const p = phaseOf(date);
  let delta = (target - p + 1) % 1; if (delta < 0.02) delta += 1;
  return new Date(date.getTime() + delta * SYNODIC * 86400000);
}

// Ciclo lunar (de luna nueva a luna nueva) que contiene el día k
export function lunarBounds(k) {
  let start = k;
  for (let i = 0; i < 32; i++) {
    const prev = addDays(start, -1);
    if (phaseOfKey(prev) > phaseOfKey(start)) break; // salto 0.99 → 0.01
    start = prev;
  }
  let end = start;
  for (let i = 0; i < 32; i++) {
    const nxt = addDays(end, 1);
    if (phaseOfKey(nxt) < phaseOfKey(end)) break;
    end = nxt;
  }
  return { start, end };
}

// Brillo de un punto del disco (x,y en -1..1) según la fase
export function lit(x, y, p) {
  const z2 = 1 - x * x - y * y; if (z2 < 0) return -1;
  const z = Math.sqrt(z2); const a = 2 * Math.PI * p;
  return Math.max(0, x * Math.sin(a) - z * Math.cos(a));
}

// Luna simple: disco oscuro + parte iluminada. Devuelve contenido para insertar en un <g>.
export function moonGroup(p, r, opts = {}) {
  const dark = opts.dark || 'var(--moon-dark)', light = opts.light || 'var(--moon)';
  const k = Math.cos(2 * Math.PI * p); const waxing = p < 0.5;
  const rx = Math.abs(k) * r;
  const s1 = waxing ? 1 : 0;
  const s2 = k > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
  const path = `M 0 ${-r} A ${r} ${r} 0 0 ${s1} 0 ${r} A ${rx.toFixed(3)} ${r} 0 0 ${s2} 0 ${-r}`;
  return `<circle r="${r}" fill="${dark}"/><path d="${path}" fill="${light}"/>`;
}
export function moonSVG(p, size, cls = '') {
  const r = size / 2 - 1;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="${-size / 2} ${-size / 2} ${size} ${size}" aria-hidden="true">${moonGroup(p, r)}</svg>`;
}

// Ruido determinista
function hash(i, j, s = 0) { let h = (i * 374761393 + j * 668265263 + s * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16); return ((h >>> 0) % 1000) / 1000; }
const MARIA = [[-0.25, -0.35, 0.28], [0.15, -0.1, 0.22], [-0.05, 0.3, 0.18], [0.35, 0.25, 0.14], [-0.45, 0.05, 0.12], [0.1, -0.5, 0.1]];
function crater(x, y) {
  let c = 0;
  for (const [mx, my, mr] of MARIA) { const d = Math.hypot(x - mx, y - my); if (d < mr) c = Math.max(c, 1 - d / mr); }
  return c;
}

// Luna de trama (halftone): la parte iluminada se imprime con tinta, la sombra queda en papel
export function moonHalftone(p, size = 300, spacing = 9) {
  const n = Math.floor(size / spacing); const half = size / 2; const parts = [];
  const maxR = spacing * 0.52;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const cx = (i + 0.5) * spacing, cy = (j + 0.5) * spacing;
    const x = (cx - half) / (half - spacing), y = (cy - half) / (half - spacing);
    if (x * x + y * y > 1) continue;
    const l = lit(x, y, p); if (l < 0) continue;
    const c = crater(x, y) * 0.5; const noise = hash(i, j) * 0.16;
    const b = Math.max(0, Math.min(1, l * (1 - c) + noise * l));
    const r = b < 0.03 ? maxR * 0.1 : maxR * (0.18 + 0.82 * Math.pow(b, 0.7));
    const dist = Math.hypot(x, y);
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" style="--d:${(dist * 700).toFixed(0)}ms"/>`);
  }
  return `<svg class="halftone" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle class="halo" cx="${half}" cy="${half}" r="${half * 0.98}"/>
    <g class="dots">${parts.join('')}</g></svg>`;
}

// Flor en trama (halftone), estilo grabado
export function flowerSVG({ size = 220, petals = 5, seed = 1, rot = 0, spacing = 0 } = {}) {
  const sp = spacing || size / 30; const half = size / 2; const parts = [];
  const R0 = size * 0.46;
  const n = Math.ceil(size / sp);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const cx = (i + 0.5) * sp, cy = (j + 0.5) * sp; const x = cx - half, y = cy - half;
    const r = Math.hypot(x, y); const th = Math.atan2(y, x);
    const Rt = R0 * (0.58 + 0.42 * Math.cos(petals * (th + rot)));
    if (r > Rt) continue;
    const edge = 1 - r / Rt; // 1 centro · 0 borde
    let d = 0.22 + 0.62 * Math.pow(1 - edge, 2.2) + 0.18 * ((x + y) / size + 0.5);
    if (r < size * 0.11) d = 0.55 + hash(i, j, seed) * 0.45;
    d += (hash(i, j, seed + 3) - 0.5) * 0.22;
    d = Math.max(0.04, Math.min(1, d));
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(sp * 0.5 * d).toFixed(2)}"/>`);
  }
  for (let k = 0; k < 14; k++) {
    const a = hash(k, seed, 9) * Math.PI * 2, rr = size * (0.09 + hash(k, seed, 4) * 0.08);
    parts.push(`<circle cx="${(half + Math.cos(a) * rr).toFixed(1)}" cy="${(half + Math.sin(a) * rr).toFixed(1)}" r="${(sp * 0.42).toFixed(2)}"/>`);
  }
  return `<g class="flower">${parts.join('')}</g>`;
}
export function flowerCluster(size = 320) {
  const s = size * 0.58;
  return `<svg class="flora" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <g transform="translate(${size * 0.02},${size * 0.08})">${flowerSVG({ size: s, seed: 1, rot: 0.3 })}</g>
    <g transform="translate(${size * 0.38},${size * 0.02})">${flowerSVG({ size: s * 0.82, seed: 2, rot: 1.1, petals: 5 })}</g>
    <g transform="translate(${size * 0.3},${size * 0.42})">${flowerSVG({ size: s * 0.9, seed: 3, rot: 2.0 })}</g></svg>`;
}

// Luna ASCII para la portada de entrada
const RAMP = ' .,:;-~=+*#%@';
export function moonAscii(p, cols = 44, rows = 22, t = 0) {
  const lines = [];
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      const x = (c - cols / 2 + 0.5) / (cols / 2 - 0.5), y = (r - rows / 2 + 0.5) / (rows / 2 - 0.5);
      if (x * x + y * y > 1) {
        const h = hash(c, r, 7); line += h > 0.985 ? (hash(c, r, t) > 0.5 ? '·' : '.') : ' '; continue;
      }
      const l = lit(x, y, p); const cr = crater(x, y) * 0.6;
      const noise = (hash(c, r, 3) - 0.5) * 0.14 + (hash(c, r, t) - 0.5) * 0.06;
      let b = l * (1 - cr) + noise; if (l < 0.02) b = 0.04 + hash(c, r, 5) * 0.06;
      const idx = Math.max(0, Math.min(RAMP.length - 1, Math.round(b * (RAMP.length - 1))));
      line += RAMP[idx];
    }
    lines.push(line);
  }
  return lines.join('\n');
}
