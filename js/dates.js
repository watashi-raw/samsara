// Fechas como claves 'YYYY-MM-DD' en hora local (mediodía para evitar saltos de DST).
export const pad = n => String(n).padStart(2, '0');
export function toKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function fromKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); }
export function addDays(k, n) { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); }
export function diffDays(a, b) { return Math.round((fromKey(b) - fromKey(a)) / 86400000); }
export function todayKey() { return toKey(new Date()); }
export function range(a, b) { const out = []; let k = a; while (k <= b) { out.push(k); k = addDays(k, 1); } return out; }
export function monthBounds(k) {
  const d = fromKey(k); const y = d.getFullYear(), m = d.getMonth();
  return { start: toKey(new Date(y, m, 1, 12)), end: toKey(new Date(y, m + 1, 0, 12)) };
}
export function shiftMonth(k, n) { const d = fromKey(k); return toKey(new Date(d.getFullYear(), d.getMonth() + n, 1, 12)); }
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
export const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
export function weekdayIndex(k) { return (fromKey(k).getDay() + 6) % 7; }
export function fmtLong(k) { const d = fromKey(k); return `${WEEKDAYS[weekdayIndex(k)]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`; }
export function fmtShort(k) { const d = fromKey(k); return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`; }
export function fmtMonth(k) { const d = fromKey(k); return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
export function fmtRange(a, b) { return `${fmtShort(a)} — ${fmtShort(b)}`; }
