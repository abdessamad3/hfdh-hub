const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const requireTools = createRequire(path.resolve(process.env.KATATIB_TEST_TOOLS, 'package.json'));
const {initializeTestEnvironment, assertSucceeds, assertFails} = requireTools('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,collection,getDocs,query,where,limit,updateDoc,deleteDoc} = requireTools('firebase/firestore');
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
  await env.withSecurityRulesDisabled(ctx=>updateDoc(doc(ctx.firestore(),'katatib_access/teacher@example.com'),{active:false}));
  await assertFails(getDoc(doc(teacher,'students/a')));
  console.log('PASS: test rules reject strangers, wrong providers, unverified accounts, other kuttabs, forged history scope, privilege escalation and every client write; admin and teacher bounded reads work; revocation works.');
 } finally {await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
