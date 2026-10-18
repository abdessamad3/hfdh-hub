import { LEGACY_COLLECTIONS, HISTORY_COLLECTIONS, historyProjection, mergeHistory } from './legacy.mjs';
import { readPages, commitWorkspace, STAFF_ROLES } from './workspace-model.mjs';
import { createSessionAuth } from './auth-session.mjs';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { initializeAuth, browserSessionPersistence, browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import { initializeFirestore, memoryLocalCache, collection, doc, getDocFromServer, getDocsFromServer, query, where, limit, orderBy, documentId, startAfter, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';
import { commitLearning, readLearningPages } from './learning.mjs';
import { attendanceId, emptyAttendance, commitAttendance } from './attendance.mjs';
import { validateConfig, accessScopes, studentView, mergeStudents } from './model.mjs';
export async function connect() {
  const response = await fetch('/__/firebase/init.json', { cache: 'no-store', credentials: 'omit' });
  if (!response.ok) throw new Error('config-unavailable');
  const app = initializeApp(validateConfig(await response.json()), 'katatib-test-reader');
  const auth = createSessionAuth(app, { initializeAuth, browserSessionPersistence, browserPopupRedirectResolver });
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
        const filters = scope.field ? [where(scope.field==='__name__'?documentId():scope.field, '==', scope.value)] : [];
        const original=await readPages(async after=>{
          const snapshot=await getDocsFromServer(query(collection(db,'students'),...filters,orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
          return snapshot.docs.map(d=>({...d.data(),id:d.id}));
        });
        const added=await readPages(async after=>{
          const snapshot=await getDocsFromServer(query(collection(db,'katatib_students'),...filters,orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
          return snapshot.docs.map(d=>({...d.data(),id:d.id}));
        });
        const overlays=new Map(added.map(r=>[r.id,r]));
        // Source permissions and identity fields stay unchanged. Only explicit V2 profile fields overlay the copy.
        const out=original.map(raw=>{
          const profile=overlays.get(raw.id);overlays.delete(raw.id);
          return {...studentView(raw.id,{...raw,...profile}),teacherId:raw.teacherId||'',group:profile?.group||'',status:profile?.status||'active',profileRevision:profile?.revision||0,source:'copy'};
        });
        for(const raw of overlays.values())if(raw.source==='new')out.push({...studentView(raw.id,raw),teacherId:raw.teacherId||'',group:raw.group,status:raw.status,profileRevision:raw.revision,source:'new'});
        return out;
      }));
      return { students: mergeStudents(batches), role: access.data().role, capped: false };
    },
    async studentHistory(studentId) {
      const batches=await Promise.all(HISTORY_COLLECTIONS.map(async name=>{
        const rows=await readPages(async after=>{
          const snapshot=await getDocsFromServer(query(collection(db,name),where('studentId','==',studentId),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
          return snapshot.docs.map(d=>({...d.data(),id:d.id}));
        });
        return rows.map(r=>historyProjection(name,r.id,r));
      }));
      return mergeHistory(batches,studentId);
    },
    async workspaceList(name,studentId) {
      if(!['katatib_tasks','katatib_access','katatib_audit','katatib_attendance'].includes(name))throw new Error('invalid-collection');
      return readPages(async after=>{
        const filters=studentId?[where('studentId','==',studentId)]:[];
        const snapshot=await getDocsFromServer(query(collection(db,name),...filters,orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
        return snapshot.docs.map(d=>({...d.data(),id:d.id}));
      });
    },
    async workspaceSave(name,id,input,revision,eventId) {
      if(!auth.currentUser)throw new Error('no-access');
      return commitWorkspace(db,{doc,runTransaction,serverTimestamp},auth.currentUser.uid,name,id,input,revision,eventId);
    },
    async importStudents(rows) {
      // All records are checked before writing. Fixed IDs make a partial retry resume without duplication.
      for(const r of rows){const snap=await getDocFromServer(doc(db,'students',r.id));if(snap.exists())throw new Error('import-id-exists');}
      const pending=[],results=[];
      for(const row of rows){
        const {id,...input}=row,snap=await getDocFromServer(doc(db,'katatib_students',id));
        if(snap.exists()){
          const stored=snap.data();if(Object.entries(input).some(([k,v])=>stored[k]!==v))throw new Error('import-id-exists');
          results.push(id);
        }else pending.push({id,input});
      }
      for(const {id,input} of pending){
        await commitWorkspace(db,{doc,runTransaction,serverTimestamp},auth.currentUser.uid,'katatib_students',id,input,0,crypto.randomUUID());results.push(id);
      }
      return results;

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
      const rows=await readPages(async after=>{
        const snapshot=await getDocsFromServer(query(collection(db,'katatib_attendance_history'),where('studentId','==',studentId),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
        return snapshot.docs.map(d=>({...d.data(),id:d.id}));
      });
      return rows.map(x=>({date:x.date,session:x.session,status:x.status,note:x.note,revision:x.revision})).sort((a,b)=>b.date.localeCompare(a.date)||b.revision-a.revision);
    },
    async history(studentId) {
      const rows=await readPages(async after=>{
        const snapshot=await getDocsFromServer(query(collection(db,'attendance'),where('studentId','==',studentId),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
        return snapshot.docs.map(d=>({...d.data(),id:d.id}));
      });
      return rows.map(x=>({date:typeof x.date==='string'?x.date:'',status:typeof x.status==='string'?x.status:'',session:Number.isInteger(x.sessionIndex)?x.sessionIndex:null})).sort((a,b)=>b.date.localeCompare(a.date));
    },
  };
}
