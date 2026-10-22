const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const req=createRequire(path.resolve(process.env.KATATIB_TEST_TOOLS,'package.json'));
const {initializeTestEnvironment,assertSucceeds,assertFails}=req('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,query,limit,runTransaction,serverTimestamp,writeBatch}=req('firebase/firestore');
(async()=>{const env=await initializeTestEnvironment({projectId:'demo-katatib-test',firestore:{rules:fs.readFileSync('firestore.katatib-test.rules','utf8')}});try{
 const edition='warsh-kfqc-1442';
 await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();const fixtures={
 'students/a':{name:'A',kuttabName:'One/~%',teacherId:'teacher-one'},
 'students/b':{name:'B',kuttabName:'Two',teacherId:'teacher-two'},
 'students/c':{name:'C',kuttabName:'One/~%',teacherId:'teacher-two'},
 'katatib_students/a':{group:'Group/~%',status:'active'},
 'katatib_students/c':{group:'Group/~%',status:'active'},
 'katatib_access/admin@example.com':{active:true,role:'admin'},
 'katatib_access/teacher@example.com':{active:true,role:'teacher',kuttabNames:[],teacherIds:['teacher-one']},
 'katatib_access/other@example.com':{active:true,role:'teacher',kuttabNames:[],teacherIds:['teacher-two']},
 'katatib_access/parent@example.com':{active:true,role:'parent',studentIds:['a']},
 'katatib_access/off@example.com':{active:false,role:'admin'},
 };for(const [key,value] of Object.entries(fixtures))await setDoc(doc(db,key),value);});
 const as=email=>env.authenticatedContext('uid-'+email,{email,email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore();
 const admin=as('admin@example.com'),teacher=as('teacher@example.com'),parent=as('parent@example.com'),other=as('other@example.com');
 const {commitWorkspace}=await import('../public/katatib/live/workspace-model.mjs');
 const {schoolMushafId,groupMushafId}=await import('../public/katatib/live/mushaf-assignment.mjs');
 const sdk={doc,runTransaction,serverTimestamp};
 const policy={kuttabName:'One/~%',defaultEdition:edition,teacherCanAssign:false},policyId=schoolMushafId(policy.kuttabName);
 const group={kuttabName:policy.kuttabName,group:'Group/~%',teacherId:'',studentId:'a',edition},groupId=groupMushafId(group);
 const save=(db,name,id,input,revision,event)=>commitWorkspace(db,sdk,'uid-'+(db===admin?'admin':db===teacher?'teacher':db===other?'other':'parent')+'@example.com',name,id,input,revision,event);
 await assertSucceeds(save(admin,'katatib_mushaf_policies',policyId,policy,0,'school-first'));
 await assertFails(save(teacher,'katatib_mushaf_policies',policyId,{...policy,teacherCanAssign:true},1,'teacher-policy'));
 await assertFails(save(parent,'katatib_mushaf_policies',policyId,policy,1,'parent-policy'));
 await assertFails(save(teacher,'katatib_mushaf_assignments',groupId,group,0,'teacher-disabled'));
 await assertSucceeds(save(admin,'katatib_mushaf_policies',policyId,{...policy,teacherCanAssign:true},1,'school-enable'));
 await assertSucceeds(save(teacher,'katatib_mushaf_assignments',groupId,group,0,'group-first'));
 await assertSucceeds(save(other,'katatib_mushaf_assignments',groupId,{...group,studentId:'c',edition:'inherit'},1,'group-second-teacher'));
 await assertFails(save(teacher,'katatib_mushaf_assignments',groupId,{...group,studentId:'b'},2,'forged-anchor'));
 await assertFails(save(parent,'katatib_mushaf_assignments',groupId,group,2,'parent-group'));
 await assert.rejects(save(teacher,'katatib_mushaf_assignments',groupId,group,0,'stale'),/conflict/);
 await assertSucceeds(save(teacher,'katatib_mushaf_assignments',groupId,{...group,edition:'inherit'},2,'group-third'));
 assert.equal((await assertSucceeds(save(teacher,'katatib_mushaf_assignments',groupId,{...group,edition:'inherit'},2,'group-third'))).revision,3);
 await assertSucceeds(getDoc(doc(parent,'katatib_mushaf_assignments',groupId)));
 await assertSucceeds(getDoc(doc(parent,'katatib_mushaf_policies',policyId)));
 await assertFails(getDocs(query(collection(parent,'katatib_mushaf_assignments'),limit(100))));
 await assertFails(getDoc(doc(as('off@example.com'),'katatib_mushaf_assignments',groupId)));
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'katatib_mushaf_policies',policyId)));
 await assertSucceeds(save(admin,'katatib_mushaf_policies',policyId,policy,2,'school-revoke'));
 await assertFails(save(teacher,'katatib_mushaf_assignments',groupId,group,3,'teacher-revoked'));
 // Malicious clients bypass cleaners: server still rejects unavailable editions and wrong document identity.
 const batch=writeBatch(admin),stamp=serverTimestamp();
 const bad={schemaVersion:1,...group,edition:'warsh-tajweed-publisher',revision:4,updatedBy:'uid-admin@example.com',updatedAt:stamp,eventId:'bad-colour'};
 batch.set(doc(admin,'katatib_mushaf_assignments',groupId),bad);batch.set(doc(admin,'katatib_audit','bad-colour'),{collection:'katatib_mushaf_assignments',recordId:groupId,snapshot:bad});await assertFails(batch.commit());
 const wrong=writeBatch(admin),data={...bad,edition,revision:1,eventId:'bad-path'};
 wrong.set(doc(admin,'katatib_mushaf_assignments','arbitrary'),data);wrong.set(doc(admin,'katatib_audit','bad-path'),{collection:'katatib_mushaf_assignments',recordId:'arbitrary',snapshot:data});await assertFails(wrong.commit());
 console.log('Mushaf assignment rules passed: admin policy, scoped multi-teacher group, family read-only, revoked permission, conflicts, unavailable edition and canonical IDs.');
 }finally{await env.cleanup();}})().catch(e=>{console.error(e);process.exitCode=1;});
