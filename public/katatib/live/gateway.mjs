import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { getAuth, setPersistence, inMemoryPersistence, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import { initializeFirestore, memoryLocalCache, collection, doc, getDocFromServer, getDocsFromServer, query, where, limit, orderBy, documentId, startAfter, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';
import { commitLearning, readLearningPages } from './learning.mjs';
import { attendanceId, emptyAttendance, commitAttendance } from './attendance.mjs';
import { validateConfig, accessScopes, studentView, mergeStudents } from './model.mjs';
export async function connect() {
  const response = await fetch('/__/firebase/init.json', { cache: 'no-store', credentials: 'omit' });
  if (!response.ok) throw new Error('config-unavailable');
  const app = initializeApp(validateConfig(await response.json()), 'katatib-test-reader');
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return {
    observe: callback => onAuthStateChanged(auth, callback),
    login: () => signInWithPopup(auth, provider),
    logout: () => signOut(auth),
    async students(user) {
      if (!user.emailVerified || !user.email) throw new Error('no-access');
      const access = await getDocFromServer(doc(db, 'katatib_access', user.email.toLowerCase()));
      if (!access.exists()) throw new Error('no-access');
      const scopes = accessScopes(access.data());
      const batches = await Promise.all(scopes.map(async scope => {
        const filters = scope.field ? [where(scope.field, '==', scope.value)] : [];
        const snapshot = await getDocsFromServer(query(collection(db, 'students'), ...filters, limit(100)));
        return snapshot.docs.map(d => studentView(d.id, d.data()));
      }));
      return { students: mergeStudents(batches), role: access.data().role, capped: batches.some(b => b.length === 100) };
    },
    async saveLearning(input, id) {
      if(!auth.currentUser)throw new Error('no-access');
      return commitLearning(db,{doc,runTransaction,serverTimestamp},auth.currentUser.uid,input,id);
    },
    async learningHistory(studentId) {
      return readLearningPages(async after => {
        const cursor=after?[startAfter(after)]:[];
        const snapshot=await getDocsFromServer(query(collection(db,'katatib_learning'),where('studentId','==',studentId),orderBy(documentId()),...cursor,limit(30)));
        return snapshot.docs.map(d=>({...d.data(),id:d.id}));
      });
    },
    async attendance(studentIds, context) {
      return Object.fromEntries(await Promise.all(studentIds.map(async id => {
        const snap = await getDocFromServer(doc(db, 'katatib_attendance', attendanceId(id, context.date, context.session)));
        const data = snap.exists() ? snap.data() : emptyAttendance();
        return [id, { status: data.status, note: data.note, revision: data.revision }];
      })));
    },
    async saveAttendance(studentId, context, desired, expectedRevision) {
      if (!auth.currentUser) throw new Error('no-access');
      return commitAttendance(db, { doc, runTransaction, serverTimestamp, getDocFromServer }, auth.currentUser.uid, studentId, context, desired, expectedRevision, crypto.randomUUID());
    },
    async attendanceHistory(studentId) {
      const snapshot = await getDocsFromServer(query(collection(db, 'katatib_attendance_history'), where('studentId', '==', studentId), limit(20)));
      return snapshot.docs.map(d => { const x=d.data(); return {date:x.date,session:x.session,status:x.status,note:x.note,revision:x.revision}; }).sort((a,b)=>b.date.localeCompare(a.date)||b.revision-a.revision);
    },
    async history(id) {
      // Recheck the student with server rules before reading a bounded history query.
      const student = await getDocFromServer(doc(db, 'students', id));
      if (!student.exists()) throw new Error('no-access');
      const snapshot = await getDocsFromServer(query(collection(db, 'attendance'), where('studentId', '==', id), limit(20)));
      return snapshot.docs.map(d => { const x = d.data(); return { date: typeof x.date === 'string' ? x.date : '', status: typeof x.status === 'string' ? x.status : '', session: Number.isInteger(x.sessionIndex) ? x.sessionIndex : null }; }).sort((a,b) => b.date.localeCompare(a.date));
    },
  };
}
