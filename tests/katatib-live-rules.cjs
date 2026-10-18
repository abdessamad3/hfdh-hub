const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const requireTools = createRequire(path.resolve(process.env.KATATIB_TEST_TOOLS, 'package.json'));
const {initializeTestEnvironment, assertSucceeds, assertFails} = requireTools('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,collection,getDocs,query,where,limit,updateDoc,deleteDoc,runTransaction,serverTimestamp,getDocFromServer,writeBatch} = requireTools('firebase/firestore');
(async()=>{
 const env = await initializeTestEnvironment({projectId:'demo-katatib-test',firestore:{rules:fs.readFileSync('firestore.katatib-test.rules','utf8')}});
 try {
  await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore();
   const fixtures={
    'students/a':{name:'A',kuttabName:'One',teacherId:'legacy-one'},
    'students/b':{name:'B',kuttabName:'Two',teacherId:'legacy-two'},
    'students/c':{name:'C',teacherId:'legacy-one'},
    'attendance/a':{studentId:'a',kuttabName:'WRONG',status:'present'},
    'attendance/b':{studentId:'b',kuttabName:'One',status:'absent'},
    'attendance/orphan':{studentId:'missing',status:'present'},
    'users/legacy-one':{role:'admin',email:'legacy@example.com'},
    'evaluations/a':{studentId:'a'},
    'katatib_access/admin@example.com':{active:true,role:'admin'},
    'katatib_access/teacher@example.com':{active:true,role:'teacher',kuttabNames:['One'],teacherIds:[]},
    'katatib_access/legacy@example.com':{active:true,role:'teacher',kuttabNames:[],teacherIds:['legacy-one']},
    'katatib_access/off@example.com':{active:false,role:'admin'},
   };
   for(const [key,data] of Object.entries(fixtures)) await setDoc(doc(db,key),data);
  });
  const as=(email,extra={})=>env.authenticatedContext('new-'+email,{email,email_verified:true,firebase:{sign_in_provider:'google.com'},...extra}).firestore();
  const admin=as('admin@example.com'),teacher=as('teacher@example.com'),legacy=as('legacy@example.com');
  const strangers=[env.unauthenticatedContext().firestore(),as('stranger@example.com'),as('off@example.com'),as('teacher@example.com',{email_verified:false}),as('teacher@example.com',{firebase:{sign_in_provider:'password'}})];
  for(const db of strangers) {await assertFails(getDoc(doc(db,'students/a')));await assertFails(getDocs(query(collection(db,'students'),limit(100))));await assertFails(getDoc(doc(db,'attendance/a')));}
  await assertSucceeds(getDoc(doc(teacher,'katatib_access/teacher@example.com')));
  await assertFails(getDoc(doc(teacher,'katatib_access/admin@example.com')));
  await assertFails(getDocs(collection(admin,'katatib_access')));
  await assertSucceeds(getDoc(doc(teacher,'students/a')));
  await assertFails(getDoc(doc(teacher,'students/b')));
  await assertSucceeds(getDocs(query(collection(teacher,'students'),where('kuttabName','==','One'),limit(100))));
  await assertFails(getDocs(query(collection(teacher,'students'),where('kuttabName','==','Two'),limit(100))));
  await assertFails(getDocs(query(collection(teacher,'students'),limit(100))));
  await assertFails(getDocs(query(collection(teacher,'students'),where('kuttabName','==','One'))));
  assert.equal((await assertSucceeds(getDocs(query(collection(legacy,'students'),where('teacherId','==','legacy-one'),limit(100))))).size,2);
  assert.equal((await assertSucceeds(getDocs(query(collection(admin,'students'),limit(100))))).size,3);
  await assertFails(getDocs(query(collection(admin,'students'),limit(101))));
  await assertSucceeds(getDoc(doc(teacher,'attendance/a')));
  await assertFails(getDoc(doc(teacher,'attendance/b')));
  await assertFails(getDoc(doc(teacher,'attendance/orphan')));
  await assertSucceeds(getDocs(query(collection(teacher,'attendance'),where('studentId','==','a'),limit(20))));
  await assertFails(getDocs(query(collection(teacher,'attendance'),where('studentId','==','b'),limit(20))));
  await assertFails(getDocs(query(collection(admin,'attendance'),where('studentId','==','a'),limit(21))));
  await assertFails(getDocs(query(collection(teacher,'attendance'),limit(20))));
  for(const db of [admin,teacher,...strangers]) {
   await assertFails(setDoc(doc(db,'katatib_access/new@example.com'),{active:true,role:'admin'}));
   await assertFails(updateDoc(doc(db,'students/a'),{name:'changed'}));
   await assertFails(setDoc(doc(db,'attendance/new'),{studentId:'a',status:'present'}));
   await assertFails(deleteDoc(doc(db,'students/a')));
  }
  await assertFails(getDoc(doc(admin,'users/legacy-one')));
  await assertFails(getDoc(doc(teacher,'evaluations/a')));
  const {commitAttendance,attendanceId}=await import('../public/katatib/live/attendance.mjs');
  const sdk={doc,runTransaction,serverTimestamp};
  const context={date:'2026-10-18',session:'morning'};
  const recordId=attendanceId('a',context.date,context.session);
  const save=(db,uid,student,ctx,payload,rev,event)=>commitAttendance(db,sdk,uid,student,ctx,payload,rev,event);
  const first=await assertSucceeds(save(teacher,'new-teacher@example.com','a',context,{status:'present',note:'أول سجل'},0,'event-first-000001'));
  assert.equal(first.revision,1);
  assert.equal((await getDocFromServer(doc(teacher,'katatib_attendance',recordId))).data().note,'أول سجل');
  assert.equal((await getDocFromServer(doc(teacher,'katatib_attendance_history','event-first-000001'))).data().revision,1);
  // A different page/device can reload the same server record.
  const secondDevice=as('teacher@example.com');
  assert.equal((await getDocFromServer(doc(secondDevice,'katatib_attendance',recordId))).data().status,'present');
  await assertSucceeds(save(teacher,'new-teacher@example.com','a',context,{status:'late',note:'changed'},1,'event-change-00001'));
  await assert.rejects(save(secondDevice,'new-teacher@example.com','a',context,{status:'absent',note:''},1,'event-stale-000001'),e=>e.code==='conflict');
  const retry=await save(teacher,'new-teacher@example.com','a',context,{status:'late',note:'changed'},1,'event-retry-000001');
  assert.equal(retry.revision,2);
  await env.withSecurityRulesDisabled(async ctx=>assert.equal((await getDocFromServer(doc(ctx.firestore(),'katatib_attendance_history','event-retry-000001'))).exists(),false));
  await assertSucceeds(save(teacher,'new-teacher@example.com','a',{...context,session:'evening'},{status:'absent',note:''},0,'event-evening-001'));
  await assertSucceeds(save(teacher,'new-teacher@example.com','a',{...context,date:'2026-10-19'},{status:'excused',note:''},0,'event-other-day-01'));
  assert.equal((await getDocFromServer(doc(teacher,'katatib_attendance',recordId))).data().status,'late');
  const concurrent=await Promise.allSettled([
   save(teacher,'new-teacher@example.com','a',context,{status:'absent',note:'tab one'},2,'event-tab-one-001'),
   save(secondDevice,'new-teacher@example.com','a',context,{status:'excused',note:'tab two'},2,'event-tab-two-001')
  ]);
  assert.equal(concurrent.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(concurrent.find(x=>x.status==='rejected').reason.code,'conflict');
  const current=(await getDocFromServer(doc(admin,'katatib_attendance',recordId))).data();
  assert.equal(current.revision,3);
  // Neither current data nor its audit can be changed independently or deleted.
  await assertFails(updateDoc(doc(teacher,'katatib_attendance',recordId),{status:'present'}));
  await assertFails(deleteDoc(doc(admin,'katatib_attendance',recordId)));
  await assertFails(updateDoc(doc(admin,'katatib_attendance_history','event-first-000001'),{note:'erased'}));
  await assertFails(deleteDoc(doc(admin,'katatib_attendance_history','event-first-000001')));
  await assertSucceeds(getDocs(query(collection(teacher,'katatib_attendance_history'),where('studentId','==','a'),limit(20))));
  // Malformed/forged paired writes must still fail actual server rules.
  async function forged(change,who=teacher,event='event-forged-0001'){
   const batch=writeBatch(who),data={...current,...change,eventId:event,updatedAt:serverTimestamp()};
   batch.set(doc(who,'katatib_attendance',data.recordId),data);
   batch.set(doc(who,'katatib_attendance_history',event),data);
   return batch.commit();
  }
  for(const change of [{status:'invalid',revision:4},{note:'x'.repeat(501),revision:4},{revision:99},{updatedBy:'another-user',revision:4},{role:'admin',revision:4}])await assertFails(forged(change));
  await assertFails(save(teacher,'new-teacher@example.com','b',context,{status:'present',note:''},0,'event-wrong-00001'));
  await assertSucceeds(save(admin,'new-admin@example.com','b',context,{status:'present',note:''},0,'event-admin-00001'));
  await assertFails(getDocFromServer(doc(teacher,'katatib_attendance',attendanceId('b',context.date,context.session))));
  for(const db of strangers)await assertFails(save(db,'new-stranger','a',context,{status:'present',note:''},3,'event-strange-001'));
  // Original copied data is unchanged after all successful V2 writes.
  await env.withSecurityRulesDisabled(async ctx=>{assert.equal((await getDoc(doc(ctx.firestore(),'attendance/a'))).data().status,'present');assert.equal((await getDoc(doc(ctx.firestore(),'students/a'))).data().name,'A');});
  await env.withSecurityRulesDisabled(ctx=>updateDoc(doc(ctx.firestore(),'katatib_access/teacher@example.com'),{active:false}));
  await assertFails(getDoc(doc(teacher,'students/a')));
  await assertFails(save(teacher,'new-teacher@example.com','a',context,{status:'present',note:'revoked'},3,'event-revoked-001'));
  console.log('PASS: test rules reject strangers, wrong providers, unverified accounts, other kuttabs, forged history scope, privilege escalation and all legacy-data writes; bounded reads, scoped V2 save/reload, atomic history, revisions, conflicts, retries, session isolation and revocation work.');
 } finally {await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
