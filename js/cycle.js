// Detección de ciclos menstruales a partir del flujo registrado.
import { addDays, diffDays, todayKey } from './dates.js';
import { FLOW_LEVEL } from './catalog.js';

export const PHASE_LABEL = { menstrual: 'Menstrual', follicular: 'Folicular', ovulation: 'Ovulación', luteal: 'Lútea' };
export const PHASE_ORDER = ['menstrual', 'follicular', 'ovulation', 'luteal'];

const avg = a => a.reduce((s, v) => s + v, 0) / a.length;

// entries: array ordenado por día ascendente
export function analyze(entries) {
  const bleed = new Set(entries.filter(e => (FLOW_LEVEL[e.flow] || 0) >= 1).map(e => e.day));
  const flowDays = entries.filter(e => (FLOW_LEVEL[e.flow] || 0) >= 2).map(e => e.day);
  const starts = []; let prev = null;
  for (const d of flowDays) { if (!prev || diffDays(prev, d) >= 10) starts.push(d); prev = d; }
  const cycles = starts.map((s, i) => {
    const next = starts[i + 1];
    let periodLength = 1;
    for (let k = 1; k < 10; k++) {
      if (bleed.has(addDays(s, k))) periodLength = k + 1;
      else if (!bleed.has(addDays(s, k + 1))) break;
    }
    return { start: s, end: next ? addDays(next, -1) : null, length: next ? diffDays(s, next) : null, periodLength };
  });
  const complete = cycles.filter(c => c.length && c.length >= 15 && c.length <= 60).slice(-6);
  const avgLength = complete.length ? Math.round(avg(complete.map(c => c.length))) : 28;
  const withPeriod = cycles.filter(c => c.length).slice(-6);
  const avgPeriod = withPeriod.length ? Math.round(avg(withPeriod.map(c => c.periodLength))) : 5;
  const last = cycles[cycles.length - 1] || null;
  const nextStart = last ? addDays(last.start, avgLength) : null;
  return { cycles, complete, avgLength, avgPeriod, last, nextStart, hasData: cycles.length > 0 };
}

export function cycleInfo(analysis, key) {
  const c = analysis.cycles.filter(c => c.start <= key).pop();
  if (!c) return null;
  const day = diffDays(c.start, key) + 1;
  const length = c.length || analysis.avgLength;
  const pl = c.length ? c.periodLength : Math.max(c.periodLength, analysis.avgPeriod);
  const ov = length - 14;
  let phase;
  if (day <= pl) phase = 'menstrual';
  else if (day < ov - 1) phase = 'follicular';
  else if (day <= ov + 1) phase = 'ovulation';
  else phase = 'luteal';
  return { cycle: c, day, phase, length };
}

// Límites del ciclo menstrual que contiene el día k (o el más cercano)
export function menstrualBounds(analysis, key) {
  const cs = analysis.cycles; if (!cs.length) return null;
  let c = cs.filter(c => c.start <= key).pop() || cs[0];
  const end = c.end || (() => { const est = addDays(c.start, analysis.avgLength - 1); const t = todayKey(); return est > t ? est : t; })();
  return { start: c.start, end, cycle: c, index: cs.indexOf(c) };
}
