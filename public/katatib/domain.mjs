// Fictional fixtures only. This preview has no Firebase connection.
export const STORAGE_KEY = 'katatib.preview.attendance.v1';
export const GROUPS = Object.freeze([
  { id: 'fajr', ar: 'حلقة الفجر', fr: 'Cercle Al-Fajr', time: '08:00 – 09:30', room: '01' },
  { id: 'nour', ar: 'حلقة النور', fr: 'Cercle An-Nour', time: '14:00 – 15:30', room: '02' },
]);
export const SESSIONS = Object.freeze(['morning', 'afternoon', 'evening']);
export const STATUSES = Object.freeze(['present', 'absent', 'excused', 'late', 'leftEarly']);
export const STUDENTS = Object.freeze([
  { id: 'demo-01', group: 'fajr', ar: 'يوسف بن علي', fr: 'Youssef Benali', initials: 'يب', latin: 'YB', hizbs: 12.5, age: 11, portion: 12, task: 'revision', color: 'sage' },
  { id: 'demo-02', group: 'fajr', ar: 'مريم الإدريسي', fr: 'Maryam Idrissi', initials: 'ما', latin: 'MI', hizbs: 18.25, age: 12, portion: 18, task: 'memorization', color: 'rose' },
  { id: 'demo-03', group: 'fajr', ar: 'أنس العلوي', fr: 'Anas Alaoui', initials: 'أع', latin: 'AA', hizbs: 6, age: 9, portion: 6, task: 'revision', color: 'sand' },
  { id: 'demo-04', group: 'fajr', ar: 'سلمى الفاسي', fr: 'Salma Fassi', initials: 'سف', latin: 'SF', hizbs: 21, age: 13, portion: 21, task: 'memorization', color: 'lavender' },
  { id: 'demo-05', group: 'fajr', ar: 'حمزة أمين', fr: 'Hamza Amine', initials: 'حأ', latin: 'HA', hizbs: 3.75, age: 8, portion: 3, task: 'revision', color: 'blue' },
  { id: 'demo-06', group: 'fajr', ar: 'خديجة ناصر', fr: 'Khadija Nasser', initials: 'خن', latin: 'KN', hizbs: 14.5, age: 12, portion: 14, task: 'memorization', color: 'clay' },
  { id: 'demo-07', group: 'nour', ar: 'آدم السالمي', fr: 'Adam Salmi', initials: 'آس', latin: 'AS', hizbs: 8.25, age: 10, portion: 8, task: 'revision', color: 'sage' },
  { id: 'demo-08', group: 'nour', ar: 'هبة المرابط', fr: 'Hiba Mrabet', initials: 'هم', latin: 'HM', hizbs: 16, age: 12, portion: 16, task: 'memorization', color: 'rose' },
  { id: 'demo-09', group: 'nour', ar: 'إلياس منصور', fr: 'Ilyas Mansour', initials: 'إم', latin: 'IM', hizbs: 9.5, age: 10, portion: 9, task: 'revision', color: 'sand' },
  { id: 'demo-10', group: 'nour', ar: 'نور الهدى', fr: 'Nour El Houda', initials: 'نه', latin: 'NH', hizbs: 27, age: 14, portion: 27, task: 'memorization', color: 'lavender' },
]);

export { businessDate } from './live/dates.mjs';

export function sessionKey({ group, date, session }) {
  if (!GROUPS.some(item => item.id === group) || !SESSIONS.includes(session)) throw new Error('Invalid session scope');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date');
  const d = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) throw new Error('Invalid date');
  return `${group}:${date}:${session}`;
}

export function blankRecords(group) {
  if (!GROUPS.some(item => item.id === group)) throw new Error('Invalid group');
  return Object.fromEntries(STUDENTS.filter(s => s.group === group).map(s => [s.id, { status: null, note: '' }]));
}

function cleanRecords(context, records) {
  const clean = blankRecords(context.group);
  if (!records || typeof records !== 'object' || Array.isArray(records)) throw new Error('Invalid records');
  for (const [id, record] of Object.entries(records)) {
    if (!Object.hasOwn(clean, id)) throw new Error('Student outside this group');
    if (!record || (record.status !== null && !STATUSES.includes(record.status))) throw new Error('Invalid attendance status');
    if (typeof record.note !== 'string' || record.note.length > 500) throw new Error('Invalid note');
    clean[id] = { status: record.status, note: record.note };
  }
  return clean;
}

export function loadNotebook(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return { version: 1, entries: {} };
  const saved = JSON.parse(raw);
  if (saved.version !== 1 || !saved.entries || typeof saved.entries !== 'object' || Array.isArray(saved.entries)) throw new Error('Unsupported notebook');
  const entries = {};
  for (const [key, entry] of Object.entries(saved.entries)) {
    if (!entry || sessionKey(entry.context) !== key || !Number.isInteger(entry.revision) || entry.revision < 1 || typeof entry.savedAt !== 'string') throw new Error('Invalid saved session');
    entries[key] = { context: entry.context, records: cleanRecords(entry.context, entry.records), revision: entry.revision, savedAt: entry.savedAt };
  }
  return { version: 1, entries };
}

export function recordsFor(notebook, context) {
  return structuredClone(notebook.entries[sessionKey(context)]?.records ?? blankRecords(context.group));
}

export function markRemainingPresent(records) {
  return Object.fromEntries(Object.entries(records).map(([id, record]) => [id, { ...record, status: record.status ?? 'present' }]));
}

export function attendanceCounts(records) {
  const counts = Object.fromEntries([...STATUSES, 'unmarked'].map(key => [key, 0]));
  for (const record of Object.values(records)) counts[record.status ?? 'unmarked']++;
  counts.attended = counts.present + counts.late + counts.leftEarly;
  return counts;
}

export function saveSession(storage, baseline, context, records, now = new Date()) {
  const key = sessionKey(context);
  const clean = cleanRecords(context, records);
  const latest = loadNotebook(storage);
  const old = latest.entries[key];
  if (JSON.stringify(old?.records) === JSON.stringify(clean)) return latest;
  if ((old?.revision ?? 0) !== (baseline.entries[key]?.revision ?? 0)) {
    const error = new Error('This session was changed in another tab');
    error.code = 'conflict';
    throw error;
  }
  const next = { version: 1, entries: { ...latest.entries, [key]: {
    context: { ...context }, records: clean, revision: (old?.revision ?? 0) + 1, savedAt: now.toISOString(),
  } } };
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function studentHistory(notebook, id) {
  return Object.values(notebook.entries).filter(entry => entry.records[id]?.status)
    .sort((a, b) => b.context.date.localeCompare(a.context.date) || SESSIONS.indexOf(b.context.session) - SESSIONS.indexOf(a.context.session));
}
