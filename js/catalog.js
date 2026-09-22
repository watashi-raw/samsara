// Categorías del registro y catálogo por defecto (semilla de la tabla `catalog`).
export const CATEGORIES = [
  { key: 'sex', label: 'Seggs', multi: false },
  { key: 'mood', label: 'Mood', multi: true },
  { key: 'energy', label: 'Energy', multi: true },
  { key: 'symptoms', label: 'Síntomas', multi: true },
  { key: 'breast', label: 'Boobs', multi: true },
  { key: 'activities', label: 'Qué hice', multi: true },
  { key: 'care', label: 'Cuidados', multi: true },
  { key: 'discharge_status', label: 'Flujo vaginal · estado', multi: false },
  { key: 'discharge_touch', label: 'Flujo vaginal · tacto', multi: false },
  { key: 'discharge_smell', label: 'Flujo vaginal · olor', multi: false },
  { key: 'digestion', label: 'Digestión', multi: false },
];
export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

export const FLOW = [
  { key: 'none', label: 'Nada', level: 0, icon: 'circle' },
  { key: 'spotting', label: 'Spotting', level: 1, icon: 'dot' },
  { key: 'light', label: 'Light', level: 2, icon: 'drop' },
  { key: 'medium', label: 'Medio', level: 3, icon: 'drop-fill' },
  { key: 'heavy', label: 'Full', level: 4, icon: 'drops' },
];
export const FLOW_LEVEL = Object.fromEntries(FLOW.map(f => [f.key, f.level]));

// [categoría, clave, etiqueta, icono]
export const DEFAULT_CATALOG = [
  ['mood', 'cranky', 'Bad vibes', 'cranky'],
  ['mood', 'horny', 'Horny', 'fire'],
  ['mood', 'chill', 'Chill', 'leaf'],
  ['mood', 'lovely', 'Soft', 'heart'],
  ['mood', 'sensual', 'Sensual', 'wave'],
  ['mood', 'apathetic', 'Meh', 'minus'],
  ['mood', 'depressed', 'Down', 'rain'],
  ['mood', 'ugly', 'Flop era', 'frown'],
  ['mood', 'anxious', 'Overthinking', 'spiral'],
  ['mood', 'sensitive', 'Sensible', 'sensitive'],

  ['energy', 'energetic', 'Full energy', 'bolt'],
  ['energy', 'thoughtful', 'En mi cabeza', 'cloud'],
  ['energy', 'tired', 'Drenada', 'battery'],
  ['energy', 'sleepy', 'Modo sleepy', 'zzz'],

  ['symptoms', 'acne', 'Granitos', 'acne'],
  ['symptoms', 'cramps', 'Cólicos', 'cramps'],
  ['symptoms', 'backache', 'Espalda rota', 'spine'],
  ['symptoms', 'insomnia', 'Insomnio', 'eye'],
  ['symptoms', 'fatigue', 'Sin batería', 'battery-low'],
  ['symptoms', 'dry_skin', 'Piel seca', 'cracks'],
  ['symptoms', 'abdominal_pain', 'Panza mal', 'belly'],
  ['symptoms', 'craving', 'Cravings', 'icecream'],
  ['symptoms', 'headache', 'Cabeza', 'head'],
  ['symptoms', 'bloating', 'Inflada', 'balloon'],
  ['symptoms', 'nausea', 'Náusea', 'nausea'],
  ['symptoms', 'dizziness', 'Mareo', 'dizzy'],
  ['symptoms', 'hot_flashes', 'Calores', 'thermo'],

  ['breast', 'heavy', 'Pesadas', 'weight'],
  ['breast', 'lighter', 'Ligeras', 'feather'],
  ['breast', 'sensible', 'Sensibles', 'alert'],
  ['breast', 'swollen', 'Hinchadas', 'swollen'],

  ['activities', 'exercise', 'Gym', 'dumbbell'],
  ['activities', 'walk', 'Hot girl walk', 'footprints'],
  ['activities', 'yoga', 'Yoga / stretch', 'lotus'],
  ['activities', 'rest', 'Bed rotting', 'bed'],
  ['activities', 'social', 'Social', 'people'],
  ['activities', 'work', 'Grind', 'briefcase'],
  ['activities', 'travel', 'Viaje', 'plane'],
  ['activities', 'alcohol', 'Drinks', 'glass'],
  ['activities', 'coffee', 'Café', 'cup'],
  ['activities', 'meditation', 'Meditación', 'circle-dot'],
  ['activities', 'creative', 'Creativa', 'pen'],
  ['activities', 'selfcare', 'Self care', 'sparkle'],

  ['care', 'painkiller', 'Pastilla pal dolor', 'pill'],
  ['care', 'pill', 'Anticonceptivo', 'pills'],
  ['care', 'supplement', 'Suplemento', 'leaf-plus'],
  ['care', 'doctor', 'Cita médica', 'cross'],

  ['sex', 'once', 'Una vez', 'heart'],
  ['sex', 'more', 'Round 2+', 'hearts'],
  ['sex', 'solo', 'Self love', 'star'],
  ['sex', 'none', 'Nada de nada', 'x'],

  ['discharge_status', 'dry', 'Seco', 'sun'],
  ['discharge_status', 'normal', 'Normal', 'dot'],
  ['discharge_status', 'too_much', 'Mucho', 'drops'],
  ['discharge_status', 'bloody', 'Con sangre', 'drop-fill'],
  ['discharge_status', 'clean', 'Limpio', 'sparkle'],

  ['discharge_touch', 'creamy', 'Cremoso', 'cloud'],
  ['discharge_touch', 'watery', 'Aguado', 'waves'],
  ['discharge_touch', 'egg_white', 'Clara de huevo', 'egg'],
  ['discharge_touch', 'sticky', 'Pegajoso', 'sticky'],

  ['discharge_smell', 'none', 'Sin olor', 'circle'],
  ['discharge_smell', 'strong', 'Fuerte', 'wind'],
  ['discharge_smell', 'fetid', 'Feo', 'alert'],
  ['discharge_smell', 'strange', 'Raro', 'question'],

  ['digestion', 'normal', 'Normal', 'check'],
  ['digestion', 'constipation', 'Estreñida', 'stop'],
  ['digestion', 'diarrhea', 'Diarrea', 'waves-down'],
].map(([category, key, label, icon], i) => ({ id: `default-${category}-${key}`, category, key, label, icon, sort: i, active: true }));
