// Arte generativo de SAMSARA: luna y orquídeas dibujadas en canvas y convertidas a ASCII con glitch.
import { lit } from './moon.js';

function hash(i, j, s = 0) { let h = (i * 374761393 + j * 668265263 + s * 1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177; h = h ^ (h >>> 16); return ((h >>> 0) % 1000) / 1000; }
function smooth(t) { return t * t * (3 - 2 * t); }
function noise(x, y, s = 0) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = smooth(x - x0), fy = smooth(y - y0);
  const a = hash(x0, y0, s), b = hash(x0 + 1, y0, s), c = hash(x0, y0 + 1, s), d = hash(x0 + 1, y0 + 1, s);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}
function fbm(x, y, s = 0) { return 0.55 * noise(x, y, s) + 0.3 * noise(x * 2.1, y * 2.1, s + 1) + 0.15 * noise(x * 4.3, y * 4.3, s + 2); }
export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const mix = (a, b, t) => a + (b - a) * t;

// ---------- Luna: esfera sombreada, cráteres y terminador según la fase ----------
export function drawMoon(size, p, colors = { light: [243, 201, 211], warm: [241, 233, 223], dark: [58, 44, 52] }) {
  const c = makeCanvas(size, size), g = c.getContext('2d'); const r = size / 2;
  const img = g.createImageData(size, size); const d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const nx = (x - r) / (r - 1), ny = (y - r) / (r - 1); const rr = nx * nx + ny * ny; const i = (y * size + x) * 4;
    if (rr > 1) { d[i + 3] = 0; continue; }
    const l = Math.max(0, lit(nx, ny, p));
    const cr = fbm(nx * 3 + 5, ny * 3 + 5, 9); const crater = Math.pow(Math.max(0, cr - 0.45) * 2.2, 1.3);
    const grain = (hash(x, y, 4) - 0.5) * 0.08;
    const b = Math.min(1, 0.06 + l * (1 - crater * 0.5) + grain * l);
    const t = Math.min(1, b);
    const edge = 1 - Math.pow(rr, 6); // suaviza el borde
    const col = [mix(colors.dark[0], mix(colors.light[0], colors.warm[0], cr), t), mix(colors.dark[1], mix(colors.light[1], colors.warm[1], cr), t), mix(colors.dark[2], mix(colors.light[2], colors.warm[2], cr), t)];
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255 * edge * (0.35 + 0.65 * t);
  }
  g.putImageData(img, 0, 0); return c;
}

// ---------- Orquídea (phalaenopsis) dibujada con pétalos de bezier y gradientes ----------
function petal(g, angle, len, wid, c0, c1, curve = 0.5) {
  g.save(); g.rotate(angle);
  const grad = g.createLinearGradient(0, 0, len, 0); grad.addColorStop(0, c0); grad.addColorStop(0.55, c1); grad.addColorStop(1, 'rgba(255,255,255,.55)');
  g.fillStyle = grad; g.beginPath(); g.moveTo(0, 0);
  g.bezierCurveTo(len * 0.25, -wid * curve, len * 0.85, -wid, len, 0);
  g.bezierCurveTo(len * 0.85, wid, len * 0.25, wid * curve, 0, 0); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(143,29,67,.35)'; g.lineWidth = 1; g.stroke();
  // nervaduras
  g.strokeStyle = 'rgba(143,29,67,.18)'; g.lineWidth = 0.8;
  for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(len * 0.1, 0); g.quadraticCurveTo(len * 0.5, k * wid * 0.28, len * 0.92, k * wid * 0.18); g.stroke(); }
  g.restore();
}
export function drawOrchid(size, seed = 1) {
  const c = makeCanvas(size, size), g = c.getContext('2d'); g.translate(size / 2, size / 2 + size * 0.04);
  const s = size / 2 * 0.9; const rot = (hash(seed, 1) - 0.5) * 0.5; g.rotate(rot);
  const pink = '#e6a6b6', light = '#f6d3dc', rose = '#c9506f', mag = '#8f1d43';
  const A = Math.PI / 180;
  // sépalos laterales (abajo)
  petal(g, (90 + 38) * A, s * 0.78, s * 0.24, rose, pink); petal(g, (90 - 38) * A, s * 0.78, s * 0.24, rose, pink);
  // sépalo dorsal (arriba)
  petal(g, -90 * A, s * 0.8, s * 0.22, rose, pink);
  // pétalos laterales (grandes)
  petal(g, (-90 + 62) * A, s * 0.92, s * 0.42, pink, light, 0.35); petal(g, (-90 - 62) * A, s * 0.92, s * 0.42, pink, light, 0.35);
  // labelo
  petal(g, 90 * A, s * 0.42, s * 0.16, mag, rose, 0.6);
  petal(g, (90 + 22) * A, s * 0.32, s * 0.12, mag, rose, 0.7); petal(g, (90 - 22) * A, s * 0.32, s * 0.12, mag, rose, 0.7);
  // columna y manchas
  g.fillStyle = '#f1e9df'; g.beginPath(); g.ellipse(0, -s * 0.02, s * 0.09, s * 0.12, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = mag;
  for (let k = 0; k < 26; k++) { const a = hash(k, seed, 2) * Math.PI * 2, rr = s * (0.06 + hash(k, seed, 3) * 0.22); const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.8 + s * 0.06; g.globalAlpha = 0.5 + hash(k, seed, 5) * 0.5; g.beginPath(); g.arc(x, y, 1.2 + hash(k, seed, 6) * 2.4, 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
  return c;
}

// ---------- ASCII: cada celda toma el color de la imagen y un carácter según su brillo ----------
const RAMP = ' .·:;-~=+*#%@';
export function asciiFy(src, cell = 7, opts = {}) {
  const { boost = 1.15, font = 'IBM Plex Mono', minAlpha = 0.12, glow = false } = opts;
  const w = src.width, h = src.height; const out = makeCanvas(w, h); const g = out.getContext('2d');
  const sg = src.getContext('2d'); const data = sg.getImageData(0, 0, w, h).data;
  g.font = `600 ${cell + 3}px "${font}", monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) {
    let r = 0, gg = 0, b = 0, a = 0, n = 0;
    for (let yy = y; yy < Math.min(h, y + cell); yy += 2) for (let xx = x; xx < Math.min(w, x + cell); xx += 2) { const i = (yy * w + xx) * 4; r += data[i]; gg += data[i + 1]; b += data[i + 2]; a += data[i + 3]; n++; }
    r /= n; gg /= n; b /= n; a /= n * 255; if (a < minAlpha) continue;
    const lum = (0.3 * r + 0.59 * gg + 0.11 * b) / 255 * a;
    const idx = Math.min(RAMP.length - 1, Math.round(lum * (RAMP.length - 1))); if (idx === 0) continue;
    g.fillStyle = `rgba(${Math.min(255, r * boost)},${Math.min(255, gg * boost)},${Math.min(255, b * boost)},${Math.min(1, a + 0.15)})`;
    if (glow) { g.shadowColor = g.fillStyle; g.shadowBlur = 6; }
    g.fillText(RAMP[idx], x + cell / 2, y + cell / 2);
  }
  g.shadowBlur = 0; return out;
}

// ---------- Glitch: bandas horizontales desplazadas y estiradas ----------
export function glitch(src, seed = 1, amount = 1) {
  const w = src.width, h = src.height; const out = makeCanvas(w, h); const g = out.getContext('2d');
  g.drawImage(src, 0, 0);
  const bands = 5 + Math.floor(hash(seed, 7) * 4);
  for (let k = 0; k < bands; k++) {
    const y = Math.floor(hash(k, seed, 11) * h * 0.9), bh = 4 + Math.floor(hash(k, seed, 12) * h * 0.06);
    const dx = (hash(k, seed, 13) - 0.5) * w * 0.12 * amount, sx = 1 + (hash(k, seed, 14) - 0.5) * 0.25 * amount;
    g.clearRect(0, y, w, bh);
    g.drawImage(src, 0, y, w, bh, dx + (w - w * sx) / 2, y, w * sx, bh);
  }
  return out;
}

// Compone: imagen difuminada debajo + ASCII encima + glitch → canvas listo para insertar
function compose(src, cell, opts, seed, amount, underAlpha) {
  const out = makeCanvas(src.width, src.height); const g = out.getContext('2d');
  g.save(); g.globalAlpha = underAlpha; g.filter = `blur(${Math.max(2, cell * 0.6)}px)`; g.drawImage(src, 0, 0); g.restore();
  g.drawImage(asciiFy(src, cell, opts), 0, 0);
  return glitch(out, seed, amount);
}
export function moonArt(size, p, cell = 7) { return compose(drawMoon(size, p), cell, { glow: true, boost: 1.35 }, Math.round(p * 100), 0.6, 0.55); }
export function orchidArt(size, seed = 1, cell = 7) { return compose(drawOrchid(size, seed), cell, { boost: 1.25 }, seed, 1, 0.45); }

// ---------- Anillo del ciclo (estilo Clue) ----------
export function cycleRing({ length = 28, periodLength = 5, day = null, ovDay = null, size = 360, stroke = 12, hasData = true }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - stroke - 22; const seg = 360 / length, gap = Math.min(2.2, seg * 0.28);
  const arc = (a0, a1, rad) => {
    const s = (a0 - 90) * Math.PI / 180, e = (a1 - 90) * Math.PI / 180;
    return `M ${cx + rad * Math.cos(s)} ${cy + rad * Math.sin(s)} A ${rad} ${rad} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${cx + rad * Math.cos(e)} ${cy + rad * Math.sin(e)}`;
  };
  const parts = [];
  for (let i = 1; i <= length; i++) {
    const a0 = (i - 1) * seg + gap / 2, a1 = i * seg - gap / 2;
    let cls = 'rg-day';
    if (hasData && i <= periodLength) cls = 'rg-period';
    else if (ovDay && Math.abs(i - ovDay) <= 1) cls = 'rg-ov';
    else if (ovDay && i >= ovDay - 5 && i < ovDay - 1) cls = 'rg-fertile';
    if (day && i > day) cls += ' rg-future';
    parts.push(`<path d="${arc(a0, a1, r)}" class="${cls}"/>`);
  }
  // marcas cada 7 días
  for (let i = 1; i <= length; i += 7) {
    const a = ((i - 1) * seg + seg / 2 - 90) * Math.PI / 180; const rr = r + stroke / 2 + 12;
    parts.push(`<text x="${cx + rr * Math.cos(a)}" y="${cy + rr * Math.sin(a)}" class="rg-tick">${i}</text>`);
  }
  if (day) {
    const dd = Math.min(day, length); const a = ((dd - 1) * seg + seg / 2 - 90) * Math.PI / 180;
    parts.push(`<circle cx="${cx + r * Math.cos(a)}" cy="${cy + r * Math.sin(a)}" r="${stroke * 0.75}" class="rg-today"/>`);
  }
  return `<svg class="ring-svg" viewBox="0 0 ${size} ${size}" style="--stroke:${stroke}px" aria-hidden="true">${parts.join('')}</svg>`;
}

// ---------- Fotografías: recorte por blanco, estirado en bandas y ASCII parcial ----------
export function loadImage(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }

// Convierte el fondo blanco en transparencia (para fotos de catálogo sobre blanco)
export function keyWhite(img, w) {
  const h = Math.round(img.height * w / img.width); const c = makeCanvas(w, h); const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
  const im = g.getImageData(0, 0, w, h); const d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const m = Math.min(d[i], d[i + 1], d[i + 2]); const t = Math.max(0, Math.min(1, (m - 190) / 60));
    d[i + 3] = Math.round(255 * (1 - t * t));
  }
  g.putImageData(im, 0, 0); return c;
}

// Bandas estiradas horizontalmente y "barridos" de una línea, como las orquídeas estiradas de la referencia
export function sliceStretch(src, seed = 1, strength = 1) {
  const w = src.width, h = src.height; const out = makeCanvas(w, h); const g = out.getContext('2d'); g.drawImage(src, 0, 0);
  const bands = 4 + Math.floor(hash(seed, 21) * 4);
  for (let k = 0; k < bands; k++) {
    const y = Math.floor(hash(k, seed, 22) * h * 0.85), bh = 6 + Math.floor(hash(k, seed, 23) * h * 0.07);
    const sx = 1 + hash(k, seed, 24) * 0.5 * strength, dx = (hash(k, seed, 25) - 0.5) * w * 0.15 * strength;
    g.drawImage(src, 0, y, w, bh, dx - (w * sx - w) / 2, y, w * sx, bh);
  }
  const smears = 2 + Math.floor(hash(seed, 26) * 3);
  for (let k = 0; k < smears; k++) {
    const y = Math.floor(hash(k, seed, 27) * h * 0.9), len = 10 + Math.floor(hash(k, seed, 28) * h * 0.06);
    for (let j = 0; j < len; j++) { g.globalAlpha = 1 - j / len; g.drawImage(src, 0, y, w, 1, 0, y + j, w, 1); }
    g.globalAlpha = 1;
  }
  return out;
}

// Foto → (recorte) → estirado → ASCII parcial con máscara de degradado
export async function photoArt(src, { width = 900, key = false, seed = 1, stretch = 1, cell = 7, asciiFrom = 0.35, asciiTo = 1, dir = 'x', boost = 1.2, under = 1, glow = false } = {}) {
  const img = await loadImage(src);
  const w = width, h = Math.round(img.height * w / img.width);
  let base;
  if (key) base = keyWhite(img, w); else { base = makeCanvas(w, h); base.getContext('2d').drawImage(img, 0, 0, w, h); }
  const stretched = stretch ? sliceStretch(base, seed, stretch) : base;
  const chars = asciiFy(stretched, cell, { boost, minAlpha: 0.2, glow });
  const out = makeCanvas(w, h); const g = out.getContext('2d');
  g.save(); g.globalAlpha = under; if (under < 1) g.filter = `blur(${Math.round(cell * 0.7)}px)`; g.drawImage(stretched, 0, 0); g.restore();
  // máscara: degradado que deja ver la foto en un extremo y el ASCII en el otro
  const m = makeCanvas(w, h); const mg = m.getContext('2d');
  const grad = dir === 'x' ? mg.createLinearGradient(0, 0, w, 0) : mg.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `rgba(0,0,0,${asciiFrom})`); grad.addColorStop(1, `rgba(0,0,0,${asciiTo})`);
  mg.fillStyle = grad; mg.fillRect(0, 0, w, h);
  mg.globalCompositeOperation = 'source-in'; mg.drawImage(chars, 0, 0);
  // oscurece un poco la foto bajo el ASCII para que las letras lean
  g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = grad; g.globalAlpha = 0.55; g.fillRect(0, 0, w, h); g.restore();
  g.drawImage(m, 0, 0);
  return out;
}
