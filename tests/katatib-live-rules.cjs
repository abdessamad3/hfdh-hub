const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const requireTools = createRequire(path.resolve(process.env.KATATIB_TEST_TOOLS, 'package.json'));
const {initializeTestEnvironment, assertSucceeds, assertFails} = requireTools('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,collection,getDocs,getDocsFromServer,query,where,limit,orderBy,documentId,startAfter,updateDoc,deleteDoc,runTransaction,serverTimestamp,getDocFromServer,writeBatch} = requireTools('firebase/firestore');
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
    'kuttabs/one':{name:'One',teacherId:'legacy-one',schedule:{lessons:{'1':{lessons:['Original session']}}}},
    'kuttabs/two':{name:'Two',teacherId:'legacy-two'},
    'smart_questions/copied-question':{prompt:'Copied general question',options:['Yes','No'],correctAnswer:'Yes'},
    'users/teacher-one':{role:'teacher',displayName:'Teacher One',kuttabName:'One'},
    'users/teacher-two':{role:'teacher',displayName:'Teacher Two',kuttabName:'Two'},
    'teacher_attendance/old-teacher-one':{teacherId:'teacher-one',date:'2026-10-01',sessionIndex:0,status:'present'},
    'teacher_attendance/old-teacher-two':{teacherId:'teacher-two',kuttabName:'One',date:'2026-10-01',status:'absent'},
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
  await assertFails(getDocs(query(collection(admin,'attendance'),where('studentId','==','a'),limit(101))));
  await assertFails(getDocs(query(collection(teacher,'attendance'),limit(20))));
  for(const db of [admin,teacher,...strangers]) {
   await assertFails(setDoc(doc(db,'katatib_access/new@example.com'),{active:true,role:'admin'}));
   await assertFails(updateDoc(doc(db,'students/a'),{name:'changed'}));
   await assertFails(setDoc(doc(db,'attendance/new'),{studentId:'a',status:'present'}));
   await assertFails(deleteDoc(doc(db,'students/a')));
  }
  await assertFails(getDoc(doc(admin,'users/legacy-one')));
  await assertSucceeds(getDoc(doc(teacher,'evaluations/a')));
  // Paginated V1 history reads use actual student scope, never the activity's stale kuttab fields.
  await env.withSecurityRulesDisabled(async ctx=>{
    const db=ctx.firestore();for(let start=0;start<621;start+=200){const batch=writeBatch(db);for(let n=start;n<Math.min(start+200,621);n++)batch.set(doc(db,'revisions','legacy-'+String(n).padStart(4,'0')),{studentId:'a',date:'2020-01-01',qualityScore:80,notes:'old'});await batch.commit();}
    for(const c of ['evaluations','revisions','memorizations','next_revisions','next_evaluations'])await setDoc(doc(db,c,'other-student'),{studentId:'b',kuttabName:'One'});
  });
  for(const c of ['evaluations','revisions','memorizations','next_revisions','next_evaluations']){
    await assertSucceeds(getDocs(query(collection(teacher,c),where('studentId','==','a'),limit(100))));
    await assertFails(getDoc(doc(teacher,c,'other-student')));
    await assertFails(getDocs(query(collection(teacher,c),limit(100))));
    await assertFails(getDocs(query(collection(teacher,c),where('studentId','==','a'),limit(101))));
    await assertFails(setDoc(doc(admin,c,'forbidden-edit'),{studentId:'a'}));
  }
  const {readPages}=await import('../public/katatib/live/workspace-model.mjs');
  const legacyRows=await readPages(async after=>{
    const snapshot=await getDocsFromServer(query(collection(teacher,'revisions'),where('studentId','==','a'),orderBy(documentId()),...(after?[startAfter(after)]:[]),limit(100)));
    return snapshot.docs.map(d=>({...d.data(),id:d.id}));
  });assert.equal(legacyRows.length,621);
  const {commitAttendance,attendanceId}=await import('../public/katatib/live/attendance.mjs');
  const sdk={doc,runTransaction,serverTimestamp,getDocFromServer};
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
  // Management and portal access exercise real atomic writes, not a UI-only role check.
  const {commitWorkspace}=await import('../public/katatib/live/workspace-model.mjs');
  const workspaceSave=(db,uid,col,id,input,revision,event)=>commitWorkspace(db,{doc,runTransaction,serverTimestamp},uid,col,id,input,revision,event);
  const profileInput={name:'Renamed A',kuttabName:'One',teacherId:'legacy-one',group:'Class A',age:12,status:'active',source:'copy'};
  await assertFails(workspaceSave(teacher,'new-teacher@example.com','katatib_students','a',profileInput,0,'profile-teacher-denied'));
  await assertSucceeds(workspaceSave(admin,'new-admin@example.com','katatib_students','a',profileInput,0,'profile-admin-first'));
  assert.equal((await getDocFromServer(doc(admin,'katatib_students/a'))).data().name,'Renamed A');
  assert.equal((await getDocFromServer(doc(admin,'students/a'))).data().name,'A');
  await assertSucceeds(workspaceSave(admin,'new-admin@example.com','katatib_students','a',profileInput,0,'profile-admin-first'));
  await assert.rejects(workspaceSave(admin,'new-admin@example.com','katatib_students','a',{...profileInput,name:'Stale'},0,'profile-stale-edit'),e=>e.code==='conflict');
  await assertFails(workspaceSave(admin,'new-admin@example.com','katatib_students','a',{...profileInput,kuttabName:'Two'},1,'profile-scope-change'));
  await assertSucceeds(workspaceSave(admin,'new-admin@example.com','katatib_students','a',{...profileInput,status:'archived'},1,'profile-archive'));
  await assertSucceeds(workspaceSave(admin,'new-admin@example.com','katatib_students','a',profileInput,2,'profile-restore'));
  await assertFails(deleteDoc(doc(admin,'katatib_students/a')));
  const grant=(role,patch={})=>({active:true,role,kuttabNames:[],teacherIds:[],studentIds:[],...patch});
  await assertSucceeds(workspaceSave(admin,'new-admin@example.com','katatib_access','manager@example.com',grant('manager',{kuttabNames:['One']}),0,'grant-manager-one'));
  const manager=as('manager@example.com');
  const newProfile={...profileInput,name:'New A',source:'new'};
  await assertSucceeds(workspaceSave(manager,'new-manager@example.com','katatib_students','new-student',newProfile,0,'profile-new-student'));
  await assertFails(workspaceSave(manager,'new-manager@example.com','katatib_students','new-other',{...newProfile,kuttabName:'Two'},0,'profile-other-school'));
  await assertSucceeds(getDocs(query(collection(teacher,'katatib_students'),where('kuttabName','==','One'),limit(100))));
  await assertFails(getDocs(query(collection(teacher,'katatib_students'),limit(100))));
  const taskInput={studentId:'a',kind:'revision',due:'2026-10-20',hizb:2,fromEighth:1,toEighth:3,note:'Task',status:'planned'};
  await assertSucceeds(workspaceSave(teacher,'new-teacher@example.com','katatib_tasks','task-one',taskInput,0,'task-first-save'));
  await assertSucceeds(workspaceSave(teacher,'new-teacher@example.com','katatib_tasks','task-one',{...taskInput,status:'done'},1,'task-complete'));
  await assertFails(workspaceSave(teacher,'new-teacher@example.com','katatib_tasks','task-one',{...taskInput,studentId:'b'},2,'task-forged-scope'));
  await assertFails(workspaceSave(teacher,'new-teacher@example.com','katatib_tasks','task-other',{...taskInput,studentId:'b'},0,'task-other-school'));
  await assertSucceeds(workspaceSave(teacher,'new-teacher@example.com','katatib_tasks','task-new-student',{...taskInput,studentId:'new-student'},0,'task-enrolled-student'));
  await assertFails(updateDoc(doc(admin,'katatib_audit/task-first-save'),{'snapshot.note':'erased'}));
  await assertFails(deleteDoc(doc(admin,'katatib_audit/task-first-save')));
  await assertFails(setDoc(doc(admin,'katatib_audit/standalone'),{collection:'katatib_tasks',recordId:'task-one',snapshot:{...taskInput,eventId:'standalone',updatedBy:'new-admin@example.com',updatedAt:serverTimestamp()}}));
  await assertSucceeds(getDocs(query(collection(admin,'katatib_audit'),limit(100))));
  await assertFails(getDocs(query(collection(teacher,'katatib_audit'),limit(100))));
  await assertFails(workspaceSave(admin,'new-admin@example.com','katatib_access','admin@example.com',grant('teacher',{kuttabNames:['One']}),0,'self-demotion'));
  await assertFails(workspaceSave(manager,'new-manager@example.com','katatib_access','escalation@example.com',grant('admin'),0,'manager-escalation'));
  for(const role of ['parent','student']){
    const address=role+'@example.com';
    await assertSucceeds(workspaceSave(admin,'new-admin@example.com','katatib_access',address,grant(role,{studentIds:['a']}),0,'grant-'+role));
    const portal=as(address);
    await assertSucceeds(getDoc(doc(portal,'students/a')));await assertFails(getDoc(doc(portal,'students/b')));
    await assertSucceeds(getDocs(query(collection(portal,'students'),where(documentId(),'==','a'),limit(100))));
    await assertFails(getDocs(query(collection(portal,'students'),limit(100))));
    await assertSucceeds(getDoc(doc(portal,'katatib_students/a')));
    await assertSucceeds(getDocs(query(collection(portal,'revisions'),where('studentId','==','a'),limit(100))));
    await assertFails(getDoc(doc(portal,'revisions/other-student')));
    await assertFails(getDoc(doc(portal,'katatib_students/new-student')));
    await assertSucceeds(getDocs(query(collection(portal,'katatib_tasks'),where('studentId','==','a'),limit(100))));
    await assertSucceeds(getDocs(query(collection(portal,'katatib_attendance'),where('studentId','==','a'),limit(100))));
    await assertFails(workspaceSave(portal,'new-'+address,'katatib_tasks','task-from-portal',taskInput,0,'portal-write-'+role));
    await assertFails(save(portal,'new-'+address,'a',context,{status:'present',note:''},3,'portal-attendance-'+role));
    await assertFails(getDocs(query(collection(portal,'katatib_access'),limit(100))));
  }
  await assertSucceeds(workspaceSave(admin,'new-admin@example.com','katatib_access','parent@example.com',grant('parent',{active:false,studentIds:['a']}),1,'revoke-parent'));
  await assertFails(getDoc(doc(as('parent@example.com'),'students/a')));
  console.log('PASS: profile overlays preserve copied records, reversible archive, manager scope, tasks, immutable atomic audit, portal child isolation, no portal writes, self-lockout prevention and revocation.');
  // Teacher attendance is separate from student attendance and copied source records.
  const {commitTeacherAttendance,TEACHER_CURRENT,TEACHER_HISTORY}=await import('../public/katatib/live/teacher-attendance.mjs');
  const teacherSave=(db,uid,id,ctx,payload,revision,event)=>commitTeacherAttendance(db,sdk,uid,id,ctx,payload,revision,event);
  assert.equal((await assertSucceeds(getDocs(query(collection(admin,'users'),where('role','==','teacher'),limit(100))))).size,2);
  assert.equal((await assertSucceeds(getDocs(query(collection(manager,'users'),where('role','==','teacher'),where('kuttabName','==','One'),limit(100))))).size,1);
  await assertFails(getDocs(query(collection(manager,'users'),where('role','==','teacher'),limit(100))));
  await assertFails(getDocs(query(collection(admin,'users'),where('role','==','teacher'))));
  await assertFails(getDoc(doc(teacher,'users/teacher-one')));
  await assertSucceeds(getDoc(doc(manager,'teacher_attendance/old-teacher-one')));
  await assertFails(getDoc(doc(manager,'teacher_attendance/old-teacher-two')));
  await assertSucceeds(getDocs(query(collection(manager,'teacher_attendance'),where('teacherId','==','teacher-one'),limit(100))));
  await assertFails(getDocs(query(collection(manager,'teacher_attendance'),limit(100))));
  const teacherRecordId=attendanceId('teacher-one',context.date,context.session);
  await assertSucceeds(teacherSave(manager,'new-manager@example.com','teacher-one',context,{status:'present',note:'First'},0,'teacher-first-0001'));
  await assertSucceeds(teacherSave(admin,'new-admin@example.com','teacher-one',context,{status:'excused',note:'Corrected'},1,'teacher-correct-01'));
  assert.equal((await getDocFromServer(doc(manager,TEACHER_CURRENT,teacherRecordId))).data().revision,2);
  assert.equal((await getDocFromServer(doc(manager,TEACHER_HISTORY,'teacher-first-0001'))).data().status,'present');
  await assertSucceeds(teacherSave(admin,'new-admin@example.com','teacher-one',context,{status:'excused',note:'Corrected'},1,'teacher-correct-01'));
  await assert.rejects(teacherSave(manager,'new-manager@example.com','teacher-one',context,{status:'absent',note:'Stale'},1,'teacher-stale-0001'),e=>e.code==='conflict');
  await assertSucceeds(teacherSave(manager,'new-manager@example.com','teacher-one',{...context,session:'afternoon'},{status:'late',note:''},0,'teacher-afternoon-1'));
  await assertSucceeds(teacherSave(manager,'new-manager@example.com','teacher-one',{...context,date:'2026-10-19'},{status:'unmarked',note:''},0,'teacher-nextdate-1'));
  await assertFails(teacherSave(manager,'new-manager@example.com','teacher-two',context,{status:'present',note:''},0,'teacher-outside-01'));
  for(const who of [teacher,as('student@example.com'),as('parent@example.com'),...strangers]){
   await assertFails(getDoc(doc(who,TEACHER_CURRENT,teacherRecordId)));
   await assertFails(teacherSave(who,'new-teacher@example.com','teacher-one',context,{status:'absent',note:''},2,'teacher-denied-001'));
  }
  await assertFails(updateDoc(doc(admin,TEACHER_CURRENT,teacherRecordId),{status:'present'}));
  await assertFails(deleteDoc(doc(admin,TEACHER_CURRENT,teacherRecordId)));
  await assertFails(updateDoc(doc(admin,TEACHER_HISTORY,'teacher-first-0001'),{note:'erased'}));
  await assertFails(deleteDoc(doc(admin,TEACHER_HISTORY,'teacher-first-0001')));
  await assertFails(updateDoc(doc(admin,'teacher_attendance/old-teacher-one'),{status:'absent'}));
  await assertFails(updateDoc(doc(admin,'users/teacher-one'),{role:'admin'}));
  const teacherCurrent=(await getDocFromServer(doc(admin,TEACHER_CURRENT,teacherRecordId))).data();
  async function forgedTeacher(change){
   const batch=writeBatch(admin),data={...teacherCurrent,revision:3,...change,eventId:'teacher-forged-01',updatedBy:'new-admin@example.com',updatedAt:serverTimestamp()};
   batch.set(doc(admin,TEACHER_CURRENT,data.recordId),data);batch.set(doc(admin,TEACHER_HISTORY,data.eventId),data);return batch.commit();
  }
  for(const change of [{revision:9},{status:'invalid'},{note:'x'.repeat(501)},{role:'admin'},{date:'2026-02-30',recordId:'teacher-one~2026-02-30~morning',revision:1},{teacherId:'missing',recordId:'missing~2026-10-18~morning',revision:1},{teacherId:'teacher-two'}])await assertFails(forgedTeacher(change));
  await assertSucceeds(getDocs(query(collection(manager,TEACHER_HISTORY),where('teacherId','==','teacher-one'),limit(100))));
  await assertFails(getDocs(query(collection(manager,TEACHER_HISTORY),where('teacherId','==','teacher-one'),limit(101))));
  await assertSucceeds(workspaceSave(admin,'new-admin@example.com','katatib_access','manager@example.com',grant('manager',{kuttabNames:['One'],active:false}),1,'teacher-revoke-manager'));
  await assertFails(getDocFromServer(doc(manager,TEACHER_CURRENT,teacherRecordId)));
  await assertFails(teacherSave(manager,'new-manager@example.com','teacher-one',context,{status:'absent',note:''},2,'teacher-revoked-01'));
  console.log('PASS: scoped teacher directory and attendance, paired immutable correction history, stale/lost-ack handling, source protection, actual calendar validation and revocation.');
  // Schedule and old-record overlays preserve originals; question reviews and grades are checked on the server.
  await assertSucceeds(workspaceSave(admin,'new-admin@example.com','katatib_access','planner@example.com',grant('manager',{kuttabNames:['One']}),0,'grant-planner-one'));
  const planner=as('planner@example.com');
  await assertSucceeds(getDocs(query(collection(planner,'kuttabs'),where('name','==','One'),limit(100))));
  await assertFails(getDocs(query(collection(planner,'kuttabs'),limit(100))));
  const schedule={kuttabId:'one',key:'1',morning:'08:00',afternoon:'',evening:'18:00',note:'Weekly'};
  await assertSucceeds(workspaceSave(planner,'new-planner@example.com','katatib_schedules','one~1',schedule,0,'schedule-weekly-first'));
  await assertSucceeds(workspaceSave(planner,'new-planner@example.com','katatib_schedules','one~2026-10-19',{...schedule,key:'2026-10-19',morning:'',evening:'',note:'Closed'},0,'schedule-dated-closed'));
  await assertFails(workspaceSave(teacher,'new-teacher@example.com','katatib_schedules','one~1',schedule,1,'schedule-teacher-deny'));
  await assertFails(workspaceSave(planner,'new-planner@example.com','katatib_schedules','two~1',{...schedule,kuttabId:'two'},0,'schedule-outside-deny'));
  await assertSucceeds(getDocs(query(collection(teacher,'katatib_schedules'),where('kuttabId','==','one'),limit(100))));
  await assertFails(getDocs(query(collection(teacher,'katatib_schedules'),where('kuttabId','==','two'),limit(100))));
  const correction={sourceCollection:'evaluations',sourceId:'a',studentId:'a',date:'2026-10-19',hizb:2,quantity:1,identifier:'r1',surah:'',fromAyah:null,toAyah:null,mistakes:1,score:90,note:'Corrected',reason:'Teacher correction'};
  await assertSucceeds(workspaceSave(teacher,'new-teacher@example.com','katatib_legacy_corrections','evaluations~a',correction,0,'legacy-correction-first'));
  await assertSucceeds(workspaceSave(teacher,'new-teacher@example.com','katatib_legacy_corrections','evaluations~a',{...correction,note:'Second correction'},1,'legacy-correction-next'));
  await assert.rejects(workspaceSave(teacher,'new-teacher@example.com','katatib_legacy_corrections','evaluations~a',{...correction,note:'Stale'},1,'legacy-correction-stale'),e=>e.code==='conflict');
  await assertFails(workspaceSave(admin,'new-admin@example.com','katatib_legacy_corrections','evaluations~other-student',{...correction,sourceId:'other-student'},0,'legacy-cross-link-deny'));
  await assertSucceeds(getDocs(query(collection(as('student@example.com'),'katatib_legacy_corrections'),where('studentId','==','a'),limit(100))));
  await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'next_evaluations','old-plan'),{studentId:'a',dueDate:'2020-01-01',notes:'Original plan'}));
  const legacyTask={sourceCollection:'next_evaluations',sourceId:'old-plan',studentId:'a',status:'done',note:'Completed without inventing a grade'};
  await assertSucceeds(workspaceSave(teacher,'new-teacher@example.com','katatib_legacy_task_states','next_evaluations~old-plan',legacyTask,0,'legacy-task-completed'));
  await assertFails(workspaceSave(as('student@example.com'),'new-student@example.com','katatib_legacy_task_states','next_evaluations~old-plan',{...legacyTask,status:'cancelled'},1,'legacy-task-portal-deny'));
  assert.equal((await getDoc(doc(teacher,'next_evaluations/old-plan'))).data().notes,'Original plan');
  const question={prompt:'Reviewed general question',options:['Yes','No'],answerIndex:0,edition:'general',reference:'Teacher-reviewed reference',reviewed:true,active:true,sourceId:'copied-question'};
  await assertSucceeds(workspaceSave(admin,'new-admin@example.com','katatib_questions','reviewed-question',question,0,'question-reviewed-first'));
  await assertFails(workspaceSave(teacher,'new-teacher@example.com','katatib_questions','teacher-question',question,0,'question-teacher-deny'));
  await assertSucceeds(getDocs(query(collection(as('student@example.com'),'katatib_questions'),where('active','==',true),where('reviewed','==',true),limit(100))));
  await assertFails(getDocs(query(collection(teacher,'katatib_questions'),limit(100))));
  await assertFails(getDoc(doc(teacher,'smart_questions/copied-question')));
  const attempt={studentId:'a',questionId:'reviewed-question',questionRevision:1,choice:0,correct:true,date:'2026-10-19'};
  await assertSucceeds(workspaceSave(as('student@example.com'),'new-student@example.com','katatib_challenge_attempts','attempt-one',attempt,0,'practice-answer-first'));
  await assertFails(workspaceSave(as('student@example.com'),'new-student@example.com','katatib_challenge_attempts','attempt-forged',{...attempt,choice:1},0,'practice-forged-score'));
  await assertFails(workspaceSave(as('student@example.com'),'new-student@example.com','katatib_challenge_attempts','attempt-other',{...attempt,studentId:'b'},0,'practice-other-student'));
  await assertFails(updateDoc(doc(admin,'katatib_challenge_attempts/attempt-one'),{correct:false}));
  await assertSucceeds(workspaceSave(admin,'new-admin@example.com','katatib_questions','reviewed-question',{...question,active:false},1,'question-deactivated'));
  await assertFails(workspaceSave(as('student@example.com'),'new-student@example.com','katatib_challenge_attempts','attempt-disabled',attempt,0,'practice-disabled-question'));
  await env.withSecurityRulesDisabled(async c=>{
   assert.equal((await getDoc(doc(c.firestore(),'kuttabs/one'))).data().schedule.lessons['1'].lessons[0],'Original session');
   assert.equal((await getDoc(doc(c.firestore(),'evaluations/a'))).data().notes,undefined);
   assert.equal((await getDoc(doc(c.firestore(),'smart_questions/copied-question'))).data().prompt,'Copied general question');
  });
  console.log('PASS: scoped schedules, protected original corrections, admin question review and server-validated practice grades.');
  const {commitLearning}=await import('../public/katatib/live/learning.mjs');
  const learningInput={studentId:'a',kind:'memorization',date:'2026-10-18',session:'morning',hizb:2,fromEighth:1,toEighth:3,mistakes:null,score:null,note:'original',supersedesId:null};
  const learningSave=(db,uid,input,id)=>commitLearning(db,{doc,runTransaction,serverTimestamp},uid,input,id);
  await assertSucceeds(learningSave(teacher,'new-teacher@example.com',learningInput,'learning-memo-0001'));
  const storedLearning=(await getDocFromServer(doc(secondDevice,'katatib_learning','learning-memo-0001'))).data();
  assert.equal(storedLearning.quantity,3);assert.equal(storedLearning.createdBy,'new-teacher@example.com');
  await assertSucceeds(learningSave(teacher,'new-teacher@example.com',learningInput,'learning-memo-0001'));
  await assert.rejects(learningSave(teacher,'new-teacher@example.com',{...learningInput,note:'different'},'learning-memo-0001'),e=>e.code==='learning-conflict');
  for(const kind of ['revision','evaluation'])await assertSucceeds(learningSave(teacher,'new-teacher@example.com',{...learningInput,kind,mistakes:2,score:85},'learning-'+kind+'-0001'));
  await assertSucceeds(learningSave(teacher,'new-teacher@example.com',{...learningInput,note:'corrected',supersedesId:'learning-memo-0001'},'learning-correct-001'));
  assert.equal((await getDocFromServer(doc(teacher,'katatib_learning','learning-memo-0001'))).data().note,'original');
  assert.equal((await getDocFromServer(doc(teacher,'katatib_learning','learning-correct-001'))).data().supersedesId,'learning-memo-0001');
  assert.equal((await assertSucceeds(getDocs(query(collection(teacher,'katatib_learning'),where('studentId','==','a'),limit(30))))).size,4);
  await assertFails(getDocs(query(collection(teacher,'katatib_learning'),limit(30))));
  await assertFails(getDocs(query(collection(teacher,'katatib_learning'),where('studentId','==','a'),limit(31))));
  await assertFails(updateDoc(doc(admin,'katatib_learning','learning-memo-0001'),{note:'overwrite'}));
  await assertFails(deleteDoc(doc(admin,'katatib_learning','learning-memo-0001')));
  await assertFails(learningSave(teacher,'new-teacher@example.com',{...learningInput,studentId:'b'},'learning-other-0001'));
  await assertSucceeds(learningSave(admin,'new-admin@example.com',{...learningInput,studentId:'b'},'learning-admin-0001'));
  await assertFails(getDocFromServer(doc(teacher,'katatib_learning','learning-admin-0001')));
  for(const db of strangers)await assertFails(learningSave(db,'new-stranger',learningInput,'learning-strange-001'));
  // Direct SDK writes bypassing client validation still face server schema and scope checks.
  for(const change of [{hizb:61},{fromEighth:5,toEighth:2,quantity:-2},{quantity:8},{kind:'other'},{mistakes:0,score:100},{note:'x'.repeat(501)},{createdBy:'forged'},{createdAt:new Date(0)},{role:'admin'},{supersedesId:'learning-admin-0001'},{kind:'revision',mistakes:0,score:101},{kind:'evaluation',mistakes:-1,score:10}]){
   const bad={...storedLearning,createdAt:serverTimestamp(),...change};
   await assertFails(setDoc(doc(teacher,'katatib_learning','learning-invalid-001'),bad));
  }
  await assert.rejects(learningSave(teacher,'new-teacher@example.com',{...learningInput,supersedesId:'learning-evaluation-0001'},'learning-wrong-kind-01'));
  const {readLearningPages,currentLearning}=await import('../public/katatib/live/learning.mjs');
  const more=writeBatch(teacher);
  for(let i=0;i<33;i++)more.set(doc(teacher,'katatib_learning','page-learning-'+String(i).padStart(5,'0')),{...storedLearning,createdAt:serverTimestamp(),supersedesId:null});
  await assertSucceeds(more.commit());
  const paged=await readLearningPages(async after=>{
   const cursor=after?[startAfter(after)]:[];
   const snap=await getDocsFromServer(query(collection(teacher,'katatib_learning'),where('studentId','==','a'),orderBy(documentId()),...cursor,limit(30)));
   return snap.docs.map(d=>({...d.data(),id:d.id}));
  });
  assert.equal(paged.length,37);assert.equal(currentLearning(paged).length,36);
  const {learningProgress}=await import('../public/katatib/live/progress.mjs');
  let progress=learningProgress(paged,3);
  assert.equal(progress.confirmedEighths,3);assert.equal(progress.baselineHizbs,3);assert.equal(progress.combinedHizbs,null);
  await assertSucceeds(learningSave(teacher,'new-teacher@example.com',{...learningInput,kind:'practice',hizb:5,toEighth:2},'progress-practice-01'));
  await assertSucceeds(learningSave(teacher,'new-teacher@example.com',{...learningInput,hizb:5,toEighth:2,supersedesId:'progress-practice-01'},'progress-confirm-001'));
  const readProgress=async()=>learningProgress(await readLearningPages(async after=>{const cursor=after?[startAfter(after)]:[];const snap=await getDocsFromServer(query(collection(teacher,'katatib_learning'),where('studentId','==','a'),orderBy(documentId()),...cursor,limit(30)));return snap.docs.map(d=>({...d.data(),id:d.id}));}),3);
  assert.equal((await readProgress()).confirmedEighths,5);
  await assertSucceeds(learningSave(teacher,'new-teacher@example.com',{...learningInput,kind:'practice',hizb:5,toEighth:2,supersedesId:'progress-confirm-001'},'progress-retract-001'));
  assert.equal((await readProgress()).confirmedEighths,3);
  await assertFails(setDoc(doc(teacher,'katatib_learning','progress-schema-old1'),{...storedLearning,schemaVersion:1,createdAt:serverTimestamp()}));
  await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'katatib_learning','progress-legacy-0001'),{...storedLearning,schemaVersion:1,hizb:6,toEighth:4,quantity:4}));
  const legacyProgress=await readProgress();assert.equal(legacyProgress.unreviewed,1);assert.equal(legacyProgress.confirmedEighths,3);
  await assertSucceeds(learningSave(teacher,'new-teacher@example.com',{...learningInput,hizb:6,toEighth:4,supersedesId:'progress-legacy-0001'},'progress-review-0001'));
  const reviewed=await readProgress();assert.equal(reviewed.unreviewed,0);assert.equal(reviewed.confirmedEighths,7);
  await env.withSecurityRulesDisabled(ctx=>updateDoc(doc(ctx.firestore(),'katatib_access/teacher@example.com'),{active:false}));
  await assertFails(getDoc(doc(teacher,'students/a')));
  await assertFails(save(teacher,'new-teacher@example.com','a',context,{status:'present',note:'revoked'},3,'event-revoked-001'));
  await assertFails(learningSave(teacher,'new-teacher@example.com',learningInput,'learning-revoked-001'));
  console.log('PASS: test rules reject strangers, wrong providers, unverified accounts, other kuttabs, forged history scope, privilege escalation and all legacy-data writes; bounded reads, scoped V2 save/reload, atomic history, revisions, conflicts, retries, session isolation and revocation work; learning saves, retries, immutable corrections, grades, teacher isolation and complete paged correction resolution work; confirmed/practice transitions, overlap-safe progress and legacy review work.');
 } finally {await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
