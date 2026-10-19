import { commitVerseMark } from './mushaf-model.mjs';
import { applyLegacyCorrections, applyLegacyTaskStates } from './advanced-model.mjs';
import { teacherView, commitTeacherAttendance, TEACHER_CURRENT, TEACHER_HISTORY } from './teacher-attendance.mjs';
import { LEGACY_COLLECTIONS, HISTORY_COLLECTIONS, historyProjection, mergeHistory } from './legacy.mjs';
import { readPages, commitWorkspace, STAFF_ROLES } from './workspace-model.mjs';
import { permittedIdentity, checkStudentGrant, studentAddress, studentSecret, provisionStudentAuth, commitStudentCredential } from './student-login.mjs';
import { createSessionAuth } from './auth-session.mjs';
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js';
import { initializeAuth, inMemoryPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, browserSessionPersistence, browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js';
import { initializeFirestore, memoryLocalCache, collection, doc, getDocFromServer, getDocsFromServer, query, where, limit, orderBy, documentId, startAfter, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js';
import { commitLearning, readLearningPages } from './learning.mjs';
import { attendanceId, emptyAttendance, commitAttendance } from './attendance.mjs';
import { validateConfig, accessScopes, studentView, mergeStudents } from './model.mjs';
export async function connect() {
  const response = await fetch('/__/firebase/init.json', { cache: 'no-store', credentials: 'omit' });
  if (!response.ok) throw new Error('config-unavailable');
  const config=validateConfig(await response.json());
  const app = initializeApp(config, 'katatib-test-reader');
  const auth = createSessionAuth(app, { initializeAuth, browserSessionPersistence, browserPopupRedirectResolver });
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return {
    observe: callback => onAuthStateChanged(auth, callback),
    login: () => signInWithPopup(auth, provider),
    studentLogin: (code,pin) => signInWithEmailAndPassword(auth,studentAddress(code),studentSecret(pin)),
    async studentCredential(studentId) {
      const snapshot=await getDocFromServer(doc(db,'katatib_student_credentials',studentId));
      return snapshot.exists()?snapshot.data():null;
    },
    async provisionStudent(studentId,login,revision,eventId) {
      if(!auth.currentUser)throw new Error('no-access');
      const adminUid=auth.currentUser.uid;
      const grant=await getDocFromServer(doc(db,'katatib_access',auth.currentUser.email.toLowerCase()));
      if(!grant.exists()||grant.data().role!=='admin'||!grant.data().active)throw new Error('no-access');
      const authUid=await provisionStudentAuth(config,login,{initializeApp,deleteApp,initializeAuth,inMemoryPersistence,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut});
      if(auth.currentUser?.uid!==adminUid)throw new Error('no-access');
      return commitStudentCredential(db,{doc,runTransaction,serverTimestamp},adminUid,studentId,login,authUid,revision,eventId);
    },
    logout: () => signOut(auth),
    async students(user) {
      const identity=await permittedIdentity(user);
      const access = await getDocFromServer(doc(db, 'katatib_access', identity.address));
      if (!access.exists()) throw new Error('no-access');
      checkStudentGrant(identity,user,access.data());
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
    async legacyVersions(name,id,studentId) {
      if(!['katatib_legacy_corrections','katatib_legacy_task_states'].includes(name))throw new Error('invalid-collection');
      const rows=await readPages(async after=>{
        const snapshot=await getDocsFromServer(query(collection(db,'katatib_audit'),where('collection','==',name),where('recordId','==',id),where('snapshot.studentId','==',studentId),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
        return snapshot.docs.map(d=>({...d.data(),id:d.id}));
      });return rows.sort((a,b)=>b.snapshot.revision-a.snapshot.revision);
    },
    async kuttabs() {
      if(!auth.currentUser?.email)throw new Error('no-access');
      const grant=await getDocFromServer(doc(db,'katatib_access',auth.currentUser.email.toLowerCase()));
      if(!grant.exists())throw new Error('no-access');
      const batches=await Promise.all(accessScopes(grant.data()).map(scope=>readPages(async after=>{
        const filters=scope.field?[where(scope.field==='kuttabName'?'name':scope.field,'==',scope.value)]:[];
        const rows=await getDocsFromServer(query(collection(db,'kuttabs'),...filters,orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
        return rows.docs.map(d=>({...d.data(),id:d.id}));
      })));
      return [...new Map(batches.flat().map(k=>[k.id,k])).values()];
    },
    async scheduleRows(id) {
      return readPages(async after=>{const rows=await getDocsFromServer(query(collection(db,'katatib_schedules'),where('kuttabId','==',id),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));return rows.docs.map(d=>({...d.data(),id:d.id}));});
    },
    async questions(review=false) {
      const name=review?'smart_questions':'katatib_questions';
      return readPages(async after=>{const filters=review?[]:[where('active','==',true),where('reviewed','==',true)];const rows=await getDocsFromServer(query(collection(db,name),...filters,orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));return rows.docs.map(d=>({...d.data(),id:d.id}));});
    },
    async questionBank() {
      return readPages(async after=>{const rows=await getDocsFromServer(query(collection(db,'katatib_questions'),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));return rows.docs.map(d=>({...d.data(),id:d.id}));});
    },
    async teachers() {
      if(!auth.currentUser?.email)throw new Error('no-access');
      const snapshot=await getDocFromServer(doc(db,'katatib_access',auth.currentUser.email.toLowerCase()));
      if(!snapshot.exists()||!['admin','manager'].includes(snapshot.data().role))throw new Error('no-access');
      const batches=await Promise.all(accessScopes(snapshot.data()).map(async scope=>{
        const field=scope.field==='teacherId'?documentId():scope.field;
        return readPages(async after=>{
          const rows=await getDocsFromServer(query(collection(db,'users'),where('role','==','teacher'),...(field?[where(field,'==',scope.value)]:[]),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
          return rows.docs.map(d=>teacherView(d.id,d.data()));
        });
      }));
      return [...new Map(batches.flat().map(t=>[t.id,t])).values()].sort((a,b)=>a.name.localeCompare(b.name));
    },
    async teacherAttendance(id,context) {
      const record=await getDocFromServer(doc(db,TEACHER_CURRENT,attendanceId(id,context.date,context.session)));
      return record.exists()?record.data():emptyAttendance();
    },
    async teacherHistory(id) {
      const batches=await Promise.all(['teacher_attendance',TEACHER_HISTORY].map(async name=>{
        const rows=await readPages(async after=>{
          const snapshot=await getDocsFromServer(query(collection(db,name),where('teacherId','==',id),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
          return snapshot.docs.map(d=>({...d.data(),id:d.id,source:name==='teacher_attendance'?'V1':'V2'}));
        });return rows;
      }));
      return batches.flat().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||(b.revision||0)-(a.revision||0)||a.id.localeCompare(b.id));
    },
    async saveTeacherAttendance(id,context,payload,revision,eventId) {
      if(!auth.currentUser)throw new Error('no-access');
      return commitTeacherAttendance(db,{doc,runTransaction,serverTimestamp,getDocFromServer},auth.currentUser.uid,id,context,payload,revision,eventId);
    },
    async studentHistory(studentId) {
      const batches=await Promise.all(HISTORY_COLLECTIONS.map(async name=>{
        const rows=await readPages(async after=>{
          const snapshot=await getDocsFromServer(query(collection(db,name),where('studentId','==',studentId),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
          return snapshot.docs.map(d=>({...d.data(),id:d.id}));
        });
        return rows.map(r=>historyProjection(name,r.id,r));
      }));
      const corrections=await this.workspaceList('katatib_legacy_corrections',studentId);
      const states=await this.workspaceList('katatib_legacy_task_states',studentId);
      return mergeHistory([applyLegacyTaskStates(applyLegacyCorrections(batches.flat(),corrections),states)],studentId);
    },
    async workspaceList(name,studentId) {
      if(!['katatib_tasks','katatib_access','katatib_audit','katatib_attendance','katatib_legacy_corrections','katatib_challenge_attempts','katatib_legacy_task_states','katatib_notices','katatib_consents'].includes(name))throw new Error('invalid-collection');
      return readPages(async after=>{
        const filters=studentId?[where('studentId','==',studentId)]:[];
        const snapshot=await getDocsFromServer(query(collection(db,name),...filters,orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
        return snapshot.docs.map(d=>({...d.data(),id:d.id}));
      });
    },
    async noticeAcks(studentId) {
      if(!auth.currentUser)throw new Error('no-access');
      return readPages(async after=>{const snapshot=await getDocsFromServer(query(collection(db,'katatib_notice_acks'),where('studentId','==',studentId),where('readerUid','==',auth.currentUser.uid),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));return snapshot.docs.map(d=>({...d.data(),id:d.id}));});
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
    async verseMarks(studentId,page) {
      return readPages(async after=>{const snapshot=await getDocsFromServer(query(collection(db,'katatib_verse_marks'),where('studentId','==',studentId),where('page','==',page),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));return snapshot.docs.map(d=>({...d.data(),id:d.id}));});
    },
    async saveVerseMark(input,eventId,manifest) {
      if(!auth.currentUser)throw new Error('no-access');
      await commitVerseMark(db,{doc,runTransaction,serverTimestamp},auth.currentUser.uid,input,eventId,manifest);
      const saved=await getDocFromServer(doc(db,'katatib_verse_marks',eventId));
      if(!saved.exists())throw new Error('verse-mark-not-confirmed');
      return {...saved.data(),id:eventId};
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
