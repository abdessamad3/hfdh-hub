import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, STUDENTS, businessDate, sessionKey, loadNotebook, blankRecords, recordsFor, saveSession, studentHistory, markRemainingPresent, attendanceCounts } from '../public/katatib/domain.mjs';

const context = { group: 'fajr', date: '2026-10-18', session: 'morning' };
const empty = () => ({ version: 1, entries: {} });
function memory() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}

test('session keys reject impossible calendar dates and invalid scope', () => {
  assert.equal(sessionKey(context), 'fajr:2026-10-18:morning');
  for (const date of ['2026-02-31', '2025-02-29', '2026-13-01', '', 'not-a-date']) assert.throws(() => sessionKey({ ...context, date }));
  assert.doesNotThrow(() => sessionKey({ ...context, date: '2028-02-29' }));
  assert.throws(() => sessionKey({ ...context, group: 'unknown' }));
  assert.throws(() => sessionKey({ ...context, session: '__proto__' }));
});

test('business date follows Casablanca instead of the UTC date', () => {
  assert.equal(businessDate(new Date('2025-07-18T23:30:00Z')), '2025-07-19');
  assert.equal(businessDate(new Date('2025-07-18T08:00:00Z')), '2025-07-18');
});

test('save, reload and profile history preserve statuses and Unicode notes', () => {
  const storage = memory(), records = blankRecords('fajr');
  records['demo-01'] = { status: 'late', note: 'حضور متأخر — ملاحظة تجريبية' };
  saveSession(storage, empty(), context, records, new Date('2026-10-18T08:05:00Z'));
  const loaded = loadNotebook(storage);
  assert.deepEqual(recordsFor(loaded, context), records);
  assert.equal(studentHistory(loaded, 'demo-01')[0].records['demo-01'].note, records['demo-01'].note);
  assert.equal(studentHistory(loaded, 'demo-02').length, 0);
});

test('retrying an identical save creates no duplicate and does not change revision', () => {
  const storage = memory(), records = blankRecords('fajr'); records['demo-01'].status = 'present';
  const first = saveSession(storage, empty(), context, records);
  const retry = saveSession(storage, empty(), context, records);
  assert.equal(Object.keys(retry.entries).length, 1);
  assert.equal(retry.entries[sessionKey(context)].revision, 1);
  assert.equal(retry.entries[sessionKey(context)].savedAt, first.entries[sessionKey(context)].savedAt);
});

test('morning/evening, dates and groups have independent records', () => {
  const storage = memory();
  let notebook = empty();
  for (const [scope, status] of [[context, 'present'], [{ ...context, session: 'evening' }, 'absent'], [{ ...context, date: '2026-10-19' }, 'late']]) {
    const records = blankRecords(scope.group); records['demo-01'].status = status;
    notebook = saveSession(storage, notebook, scope, records);
  }
  const nour = { ...context, group: 'nour' }, records = blankRecords('nour'); records['demo-07'].status = 'excused';
  notebook = saveSession(storage, notebook, nour, records);
  assert.equal(recordsFor(notebook, context)['demo-01'].status, 'present');
  assert.equal(recordsFor(notebook, { ...context, session: 'evening' })['demo-01'].status, 'absent');
  assert.equal(Object.keys(notebook.entries).length, 4);
  assert.equal(studentHistory(notebook, 'demo-01').length, 3);
  assert.equal(studentHistory(notebook, 'demo-07').length, 1);
});

test('mark remaining present preserves absences, notes and other intentional statuses', () => {
  const records = blankRecords('fajr');
  records['demo-01'] = { status: 'absent', note: 'Excuse à confirmer' };
  records['demo-02'].status = 'late';
  const next = markRemainingPresent(records), counts = attendanceCounts(next);
  assert.equal(next['demo-01'].status, 'absent'); assert.equal(next['demo-01'].note, records['demo-01'].note);
  assert.equal(next['demo-02'].status, 'late'); assert.equal(counts.unmarked, 0);
  assert.equal(counts.present, 4); assert.equal(counts.attended, 5);
  assert.equal(records['demo-03'].status, null);
});

test('a save rejects a student from a different group and invalid statuses', () => {
  const storage = memory(), records = blankRecords('fajr');
  assert.throws(() => saveSession(storage, empty(), context, { ...records, 'demo-07': { status: 'present', note: '' } }), /outside/);
  records['demo-01'].status = 'admin';
  assert.throws(() => saveSession(storage, empty(), context, records), /Invalid attendance/);
  assert.equal(storage.getItem(STORAGE_KEY), null);
});

test('edits in another tab cannot silently overwrite the same session', () => {
  const storage = memory(), one = blankRecords('fajr'), two = blankRecords('fajr');
  one['demo-01'].status = 'present'; two['demo-01'].status = 'absent';
  saveSession(storage, empty(), context, one);
  assert.throws(() => saveSession(storage, empty(), context, two), error => error.code === 'conflict');
  assert.equal(recordsFor(loadNotebook(storage), context)['demo-01'].status, 'present');
});

test('saves from another tab to a different session are retained', () => {
  const storage = memory(), a = blankRecords('fajr'), b = blankRecords('fajr');
  a['demo-01'].status = 'present'; b['demo-01'].status = 'absent';
  saveSession(storage, empty(), context, a);
  const latest = saveSession(storage, empty(), { ...context, session: 'evening' }, b);
  assert.equal(Object.keys(latest.entries).length, 2);
  assert.equal(recordsFor(latest, context)['demo-01'].status, 'present');
});

test('corrupted/unsupported stored data is rejected and is not overwritten', () => {
  const storage = memory(); storage.setItem(STORAGE_KEY, '{broken');
  assert.throws(() => loadNotebook(storage));
  assert.throws(() => saveSession(storage, empty(), context, blankRecords('fajr')));
  assert.equal(storage.getItem(STORAGE_KEY), '{broken');
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, entries: {} }));
  assert.throws(() => loadNotebook(storage), /Unsupported/);
});

test('storage failure does not claim a successful save or mutate the baseline', () => {
  const storage = memory(), baseline = empty(), records = blankRecords('fajr');
  records['demo-01'].status = 'present';
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => saveSession(storage, baseline, context, records), /Quota/);
  assert.deepEqual(baseline, empty());
});

test('all fixtures are fictional and identifiers/groups are unique and known', () => {
  assert.equal(new Set(STUDENTS.map(s => s.id)).size, STUDENTS.length);
  assert.ok(STUDENTS.every(s => s.id.startsWith('demo-')));
  assert.ok(STUDENTS.every(s => Object.hasOwn(blankRecords(s.group), s.id)));
});
