import test from 'node:test';
import assert from 'node:assert/strict';
import {schoolMushafId,groupMushafId,groupMushafScope,cleanMushafPolicy,cleanMushafAssignment,resolveMushafAssignment,mayAssignMushaf,MUSHAF_CHOICES} from '../public/katatib/live/mushaf-assignment.mjs';
import {commitWorkspace} from '../public/katatib/live/workspace-model.mjs';
const edition='warsh-kfqc-1442',student={id:'a',kuttab:'One',group:'Group A',teacherId:'teacher-a'};
test('group identity is shared by teachers, separates schools and isolates unnamed groups by teacher',()=>{
 const scope=groupMushafScope(student);
 assert.equal(groupMushafId(scope),groupMushafId(groupMushafScope({...student,teacherId:'teacher-b'})));
 assert.notEqual(groupMushafId(scope),groupMushafId({...scope,kuttabName:'Two'}));
 assert.notEqual(groupMushafId(groupMushafScope({...student,group:''})),groupMushafId(groupMushafScope({...student,group:'',teacherId:'teacher-b'})));
 const strange={kuttabName:'School/~%2F',group:'قسم/~',teacherId:''};
 assert.ok(!groupMushafId(strange).includes('/'));assert.notEqual(schoolMushafId('/'),schoolMushafId('%2F'));
});
test('students inherit school default, explicit verified assignment or return to inheritance without modifying learning',()=>{
 const policy={kuttabName:'One',defaultEdition:edition,teacherCanAssign:true,revision:2};
 const assignment={...groupMushafScope(student),studentId:'a',edition,revision:1};
 assert.equal(resolveMushafAssignment(student).effectiveEdition,edition);
 assert.equal(resolveMushafAssignment(student,policy).source,'school');
 assert.equal(resolveMushafAssignment(student,policy,assignment).source,'group');
 assert.equal(resolveMushafAssignment(student,policy,{...assignment,edition:'inherit'}).source,'school');
 assert.throws(()=>resolveMushafAssignment(student,{...policy,kuttabName:'Other'}));
 assert.throws(()=>resolveMushafAssignment(student,policy,{...assignment,group:'Other'}));
});
test('only released editions are accepted and students and parents cannot assign',()=>{
 const bundle=resolveMushafAssignment(student,{kuttabName:'One',defaultEdition:edition,teacherCanAssign:true});
 for(const role of ['parent','student','unknown'])assert.equal(mayAssignMushaf(role,bundle),false);
 assert.equal(mayAssignMushaf('admin',resolveMushafAssignment(student)),true);
 assert.equal(mayAssignMushaf('teacher',resolveMushafAssignment(student)),false);
 assert.equal(mayAssignMushaf('teacher',bundle),true);
 assert.throws(()=>cleanMushafPolicy({kuttabName:'One',defaultEdition:'warsh-tajweed-publisher',teacherCanAssign:true}));
 assert.throws(()=>cleanMushafAssignment({...groupMushafScope(student),studentId:'a',edition:'warsh-tajweed-publisher'}));
 assert.equal(MUSHAF_CHOICES.find(x=>x.id==='warsh-tajweed-publisher').ready,false);
});
test('assignment commits are audited, reject stale revisions and retry an acknowledged intent without duplication',async()=>{
 const docs=new Map();let writes=0;
 const sdk={doc:(_db,...p)=>p.join('/'),serverTimestamp:()=>({seconds:1,nanoseconds:0}),async runTransaction(_db,fn){return fn({async get(ref){return {exists:()=>docs.has(ref),data:()=>docs.get(ref)};},set(ref,value){docs.set(ref,value);writes++;}});}};
 const input={...groupMushafScope(student),studentId:'a',edition};const id=groupMushafId(input);
 const first=await commitWorkspace({},sdk,'uid','katatib_mushaf_assignments',id,input,0,'event-one');
 assert.equal(first.revision,1);assert.equal(writes,2);
 await commitWorkspace({},sdk,'uid','katatib_mushaf_assignments',id,input,0,'event-one');assert.equal(writes,2);
 await assert.rejects(commitWorkspace({},sdk,'uid','katatib_mushaf_assignments',id,input,0,'event-two'),/conflict/);
 await assert.rejects(commitWorkspace({},sdk,'uid','katatib_mushaf_assignments','wrong',input,0,'event-two'),/invalid/);
 assert.equal(docs.get('katatib_audit/event-one').snapshot.edition,edition);
});
