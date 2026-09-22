// Acceso a datos: Supabase (real) o memoria (modo demo).
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { DEFAULT_CATALOG, FLOW } from './catalog.js';
import { addDays, todayKey } from './dates.js';

const safeStorage = {
  getItem(k) { try { return localStorage.getItem(k); } catch { return null; } },
  setItem(k, v) { try { localStorage.setItem(k, v); } catch { } },
  removeItem(k) { try { localStorage.removeItem(k); } catch { } },
};

export async function supabaseStore() {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storage: safeStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  const check = ({ data, error }) => { if (error) throw error; return data; };
  return {
    demo: false,
    async getSession() { return check(await sb.auth.getSession()).session; },
    async signIn(email, password) { return check(await sb.auth.signInWithPassword({ email, password })).session; },
    async signOut() { await sb.auth.signOut(); },
    async loadEntries() { return check(await sb.from('entries').select('*').order('day')); },
    async saveEntry(entry) { return check(await sb.from('entries').upsert(entry, { onConflict: 'user_id,day' }).select().single()); },
    async deleteEntry(id) { check(await sb.from('entries').delete().eq('id', id)); },
    async loadCatalog() { return check(await sb.from('catalog').select('*').order('sort')); },
    async addCatalog(row) { return check(await sb.from('catalog').insert(row).select().single()); },
    async updateCatalog(id, patch) { return check(await sb.from('catalog').update(patch).eq('id', id).select().single()); },
    async deleteCatalog(id) { check(await sb.from('catalog').delete().eq('id', id)); },
  };
}

// ---------- Demo: datos de ejemplo en memoria ----------
function seeded(n) { let s = n; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }
export function sampleEntries({ days = 78, marker = '' } = {}) {
  const rnd = seeded(7); const out = []; const today = todayKey();
  const pick = (arr, k) => { const c = [...arr]; const r = []; for (let i = 0; i < k && c.length; i++) r.push(c.splice(Math.floor(rnd() * c.length), 1)[0]); return r; };
  const cycleLen = [29, 27, 30, 28];
  let start = addDays(today, -days); let c = 0;
  while (start <= today) {
    const len = cycleLen[c % cycleLen.length];
    for (let d = 0; d < len; d++) {
      const day = addDays(start, d); if (day > today) break;
      if (rnd() < 0.1) continue; // días sin check-in
      const e = { id: 'demo-' + day, day, mood: [], energy: [], symptoms: [], breast: [], activities: [], care: [], notes: null, sex: null };
      const ov = len - 14; const nearOv = Math.abs(d - ov) <= 2; const pms = d > len - 7;
      if (d < 5) { e.flow = ['medium', 'heavy', 'medium', 'light', 'spotting'][d]; e.pain = [3, 4, 2, 1, 0][d]; e.libido = Math.floor(rnd() * 2); e.symptoms = pick(['cramps', 'backache', 'fatigue', 'headache'], 2); e.mood = pick(['cranky', 'sensitive', 'chill'], 1); e.energy = ['tired']; e.care = d < 2 ? ['painkiller'] : []; }
      else if (pms) { e.flow = 'none'; e.pain = Math.floor(rnd() * 2); e.libido = 1 + Math.floor(rnd() * 2); e.symptoms = pick(['acne', 'bloating', 'craving', 'insomnia'], 2); e.mood = pick(['cranky', 'depressed', 'anxious', 'ugly'], 1); e.energy = pick(['tired', 'sleepy'], 1); e.breast = pick(['heavy', 'sensible'], 1); }
      else if (nearOv) { e.flow = 'none'; e.pain = 0; e.libido = 4 + Math.round(rnd()); e.mood = pick(['horny', 'sensual', 'lovely'], 2); e.energy = ['energetic']; e.discharge_touch = 'egg_white'; e.discharge_status = 'too_much'; e.sex = pick(['once', 'more', 'more', 'solo'], 1)[0]; }
      else { e.flow = 'none'; e.pain = 0; e.libido = 2 + Math.floor(rnd() * 2); e.mood = pick(['chill', 'lovely', 'sensual'], 1); e.energy = pick(['energetic', 'thoughtful'], 1); e.symptoms = rnd() < 0.3 ? pick(['craving', 'acne'], 1) : []; if (rnd() < 0.3) e.sex = pick(['once', 'solo', 'none'], 1)[0]; }
      e.activities = pick(['exercise', 'walk', 'yoga', 'social', 'coffee', 'work', 'rest', 'creative'], 1 + Math.floor(rnd() * 2));
      e.sleep_hours = Math.round((5.5 + rnd() * 3.5) * 2) / 2;
      if (rnd() < 0.25) e.digestion = pick(['normal', 'constipation', 'diarrhea'], 1)[0];
      if (rnd() < 0.18) e.notes = pick(['Día lento, mucha agua y bed rotting.', 'Hot girl walk al atardecer y dormí mejor.', 'Cravings de chocolate toda la tarde.', 'Vibra tranquila viendo la luna.', 'Cólicos fuertes en la mañana, mejor después de la siesta.', 'Me sentí muy yo hoy.'], 1)[0];
      if (marker) e.notes = marker + (e.notes ? ' ' + e.notes : '');
      out.push(e);
    }
    start = addDays(start, len); c++;
  }
  return out;
}

export function demoStore() {
  const entries = new Map(sampleEntries().map(e => [e.day, e]));
  const catalog = DEFAULT_CATALOG.map(r => ({ ...r }));
  const wait = () => new Promise(r => setTimeout(r, 120));
  return {
    demo: true,
    async getSession() { return { user: { id: 'demo', email: 'demo@samsara' } }; },
    async signIn() { return this.getSession(); },
    async signOut() { },
    async loadEntries() { await wait(); return [...entries.values()].sort((a, b) => a.day < b.day ? -1 : 1); },
    async saveEntry(entry) { await wait(); const e = { ...entries.get(entry.day), ...entry, id: entry.id || 'demo-' + entry.day }; entries.set(entry.day, e); return e; },
    async deleteEntry(id) { for (const [k, v] of entries) if (v.id === id) entries.delete(k); },
    async loadCatalog() { await wait(); return catalog; },
    async addCatalog(row) { const r = { ...row, id: 'c-' + Date.now(), active: true }; catalog.push(r); return r; },
    async updateCatalog(id, patch) { const r = catalog.find(c => c.id === id); Object.assign(r, patch); return r; },
    async deleteCatalog(id) { const i = catalog.findIndex(c => c.id === id); if (i >= 0) catalog.splice(i, 1); },
  };
}
export { FLOW };
