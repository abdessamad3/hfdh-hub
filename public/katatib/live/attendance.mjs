import { businessDate } from './dates.mjs';
export { businessDate };
export const CLOUD_STATUSES = Object.freeze(['present', 'absent', 'excused', 'late', 'leftEarly', 'unmarked']);
export const CLOUD_SESSIONS = Object.freeze(['morning', 'afternoon', 'evening']);
export function attendanceId(studentId, date, session) {
  if (typeof studentId !== 'string' || !studentId || studentId.length > 500 || /[\/~]/.test(studentId)) throw new Error('invalid-student');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !CLOUD_SESSIONS.includes(session)) throw new Error('invalid-session');
  const parsed = new Date(date+'T12:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date) throw new Error('invalid-session');
  return `${studentId}~${date}~${session}`;
}
export function cleanAttendance(value) {
  if (!value || !CLOUD_STATUSES.includes(value.status) || typeof value.note !== 'string' || value.note.length > 500) throw new Error('invalid-attendance');
  return {status:value.status, note:value.note};
}
export const emptyAttendance = () => ({status:'unmarked',note:'',revision:0});
export function sameAttendance(a,b) { return a.status===b.status && a.note===b.note; }
export function decideSave(current, desired, expectedRevision) {
  cleanAttendance(desired);
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new Error('invalid-revision');
  if (current && sameAttendance(current, desired)) return {unchanged:true, revision:current.revision};
  if ((current?.revision ?? 0) !== expectedRevision) throw Object.assign(new Error('conflict'),{code:'conflict'});
  return {unchanged:false, revision:expectedRevision+1};
}
// Injected Firestore primitives also let the emulator exercise the real transaction path.
export async function commitAttendance(db, sdk, userId, studentId, context, desired, expectedRevision, eventId) {
  const recordId=attendanceId(studentId, context.date, context.session);
  const clean=cleanAttendance(desired);
  if (!userId || !/^[A-Za-z0-9-]{16,80}$/.test(eventId)) throw new Error('invalid-identity');
  const ref=sdk.doc(db,'katatib_attendance',recordId);
  try { return await sdk.runTransaction(db,async tx=>{
    const snap=await tx.get(ref);
    const current=snap.exists()?snap.data():null;
    const decision=decideSave(current,clean,expectedRevision);
    if (decision.unchanged) return {...clean,revision:decision.revision};
    const data={schemaVersion:1,recordId,studentId,date:context.date,session:context.session,...clean,revision:decision.revision,updatedBy:userId,updatedAt:sdk.serverTimestamp(),eventId};
    tx.set(ref,data);
    tx.set(sdk.doc(db,'katatib_attendance_history',eventId),data);
    return {...clean,revision:decision.revision};
  }); } catch (error) {
    // Rules can reject a racing stale revision before the SDK receives ABORTED.
    // Recheck with server authorization; revoked access must remain permission-denied.
    if (error.code === 'permission-denied') {
      let latest;
      try { latest = await sdk.getDocFromServer(ref); } catch { throw error; }
      const current = latest.exists() ? latest.data() : null;
      const decision = decideSave(current, clean, expectedRevision);
      if (decision.unchanged) return {...clean,revision:decision.revision};
    }
    throw error;
  }
}
